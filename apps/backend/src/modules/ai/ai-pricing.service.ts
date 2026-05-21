import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListingStatus } from '@eawlma/shared-types';

import { ListingEntity } from '../listings/entities/listing.entity';
import { BedrockService } from './bedrock.service';

export type Confidence = 'high' | 'medium' | 'low';

export interface SuggestPriceInput {
  city: string;
  propertyType: string;
  areaSqm: number;
  bedrooms: number;
  bathrooms: number;
  district?: string;
  transactionType: string;
  amenities?: string[];
}

export interface PriceSuggestionResult {
  suggestedMin: number;
  suggestedMax: number;
  recommended: number;
  pricePerSqm: number;
  marketAvg: number;
  confidence: Confidence;
  reasoning: string;
  comparables: number;
}

/** Fallback SAR-per-m² grid keyed by city, then property type. Used when the
 *  DB has < 3 comparable rows or Bedrock isn't configured. Values
 *  are coarse mid-2026 reference points sourced from public REGA-style averages. */
const FALLBACK_PER_SQM: Record<string, Record<string, number>> = {
  Riyadh: { villa: 8000, apartment: 5500, townhouse: 6500, land: 3000 },
  Jeddah: { villa: 7500, apartment: 5000, townhouse: 6000, land: 2800 },
  Dammam: { villa: 6000, apartment: 4000, townhouse: 5000, land: 2200 },
};

@Injectable()
export class AIPricingService {
  private readonly logger = new Logger(AIPricingService.name);

  constructor(
    private readonly bedrockService: BedrockService,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
  ) {}

  private isConfigured(): boolean {
    return this.bedrockService.isConfigured();
  }

  async suggestPrice(params: SuggestPriceInput): Promise<PriceSuggestionResult> {
    // Comparables — actual schema is `area` (not area_sqm) and `type` enum
    // 'sale' | 'rent' (not transaction_type). Status enum is lowercase 'active'.
    const raw = await this.listings
      .createQueryBuilder('l')
      .select([
        'AVG(l.price)::numeric AS avg_price',
        'MIN(l.price)::numeric AS min_price',
        'MAX(l.price)::numeric AS max_price',
        'AVG(l.price / NULLIF(l.area, 0))::numeric AS avg_per_sqm',
        'COUNT(*)::int AS count',
      ])
      .where('l.city ILIKE :city', { city: `%${params.city}%` })
      .andWhere('l.property_type = :propertyType', { propertyType: params.propertyType })
      .andWhere('l.type = :type', { type: params.transactionType })
      .andWhere('l.status = :status', { status: ListingStatus.ACTIVE })
      .andWhere('l.area BETWEEN :minArea AND :maxArea', {
        minArea: params.areaSqm * 0.7,
        maxArea: params.areaSqm * 1.3,
      })
      .andWhere('(l.bedrooms IS NULL OR l.bedrooms BETWEEN :minBeds AND :maxBeds)', {
        minBeds: Math.max(1, params.bedrooms - 1),
        maxBeds: params.bedrooms + 1,
      })
      .getRawOne<{
        avg_price: string | null;
        min_price: string | null;
        max_price: string | null;
        avg_per_sqm: string | null;
        count: number | string;
      }>();

    const count = Number(raw?.count ?? 0);
    const avgPerSqm = Number(raw?.avg_per_sqm ?? 0);
    const marketAvg = Number(raw?.avg_price ?? 0);

    const cityFallback = FALLBACK_PER_SQM[params.city] ?? FALLBACK_PER_SQM.Riyadh;
    const fallbackSqm = cityFallback[params.propertyType] ?? 5000;
    const basePerSqm = avgPerSqm > 0 ? avgPerSqm : fallbackSqm;
    const basePrice = basePerSqm * params.areaSqm;

    // Pure-math fallback — no AI key OR not enough comparables to trust the model.
    if (!this.isConfigured() || count < 3) {
      return {
        suggestedMin: Math.round(basePrice * 0.9),
        suggestedMax: Math.round(basePrice * 1.1),
        recommended: Math.round(basePrice),
        pricePerSqm: Math.round(basePerSqm),
        marketAvg: Math.round(marketAvg || basePrice),
        confidence: count >= 10 ? 'high' : count >= 3 ? 'medium' : 'low',
        reasoning:
          count > 0
            ? `Based on ${count} similar ${params.propertyType}s in ${params.city} with comparable size and bedrooms.`
            : `Estimated from typical ${params.propertyType} prices in ${params.city}. Add more listings for better accuracy.`,
        comparables: count,
      };
    }

    // AI-enhanced suggestion via Bedrock (Anthropic Claude).
    try {
      const userPrompt =
        `Property to price:\n` +
        `- City: ${params.city}\n` +
        `- Type: ${params.propertyType}\n` +
        `- Transaction: ${params.transactionType}\n` +
        `- Area: ${params.areaSqm} m²\n` +
        `- Bedrooms: ${params.bedrooms}, Bathrooms: ${params.bathrooms}\n` +
        `- District: ${params.district ?? 'not specified'}\n` +
        `- Amenities: ${params.amenities?.join(', ') || 'standard'}\n\n` +
        `Live market data (${count} comparable properties):\n` +
        `- Average price: ${Math.round(marketAvg).toLocaleString('en')} SAR\n` +
        `- Average price/m²: ${Math.round(avgPerSqm).toLocaleString('en')} SAR/m²\n` +
        `- Price range: ${Math.round(Number(raw?.min_price ?? 0)).toLocaleString('en')} - ${Math.round(Number(raw?.max_price ?? 0)).toLocaleString('en')} SAR\n\n` +
        `Respond ONLY with valid JSON, no markdown fences:\n` +
        `{\n` +
        `  "suggestedMin": <number>,\n` +
        `  "suggestedMax": <number>,\n` +
        `  "recommended": <number>,\n` +
        `  "pricePerSqm": <number>,\n` +
        `  "reasoning": "<2-3 sentences in English explaining the price>"\n` +
        `}`;

      const result = await this.bedrockService.chat({
        purpose: 'suggest-price',
        systemPrompt: 'You are a Saudi real estate pricing expert.',
        userPrompt,
        jsonMode: true,
        maxTokens: 400,
      });

      // chat() returns a non-JSON stub (live: false) when Bedrock is
      // unreachable — drop to the market-math fallback in that case.
      if (!result.live) throw new Error('Bedrock unavailable — stub response');

      const ai = JSON.parse(result.text) as Partial<PriceSuggestionResult>;
      return {
        suggestedMin: Number(ai.suggestedMin ?? Math.round(basePrice * 0.9)),
        suggestedMax: Number(ai.suggestedMax ?? Math.round(basePrice * 1.1)),
        recommended: Number(ai.recommended ?? Math.round(basePrice)),
        pricePerSqm: Number(ai.pricePerSqm ?? Math.round(basePerSqm)),
        marketAvg: Math.round(marketAvg),
        confidence: count >= 10 ? 'high' : 'medium',
        reasoning: ai.reasoning ?? `Based on ${count} comparable properties in ${params.city}.`,
        comparables: count,
      };
    } catch (err) {
      this.logger.warn(
        `AI pricing failed, falling back to market math: ${(err as Error).message}`,
      );
      return {
        suggestedMin: Math.round(basePrice * 0.9),
        suggestedMax: Math.round(basePrice * 1.1),
        recommended: Math.round(basePrice),
        pricePerSqm: Math.round(basePerSqm),
        marketAvg: Math.round(marketAvg || basePrice),
        confidence: 'medium',
        reasoning: `Based on ${count} comparable properties in ${params.city}.`,
        comparables: count,
      };
    }
  }
}
