import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListingEntity } from '../listings/entities/listing.entity';
import { ListingTranslationEntity } from '../listings/entities/listing-translation.entity';
import { BedrockService } from './bedrock.service';

/**
 * The 30 BCP-47 locales we translate listings into. Edit this list to
 * grow / shrink coverage. The set is split between Arab-world languages,
 * GCC-relevant European languages, and major South/East Asian markets so
 * agents can reach buyers across all Eawlma target markets.
 */
export const TRANSLATION_TARGET_LOCALES = [
  'en', 'ar', 'fr', 'es', 'de', 'it', 'pt',
  'ru', 'tr', 'fa', 'ur',
  'ja', 'zh-Hans', 'zh-Hant', 'ko', 'hi', 'bn', 'id', 'ms', 'vi', 'th', 'tl',
  'nl', 'pl', 'sv', 'no', 'da', 'fi', 'el', 'he',
] as const;

export interface TranslationItem {
  locale: string;
  title: string;
  description: string;
}

interface BrowseHistoryEntry {
  listingId?: string;
  type?: string;
  propertyType?: string;
  city?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  visitedAt?: string;
}

export interface RecommendationScore {
  listingId: string;
  score: number;
  reason: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly bedrockService: BedrockService,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(ListingTranslationEntity)
    private readonly translations: Repository<ListingTranslationEntity>,
  ) {}

  // ---------- Translation -----------------------------------------------

  async translateListing(
    listingId: string,
    targetLocales: readonly string[] = TRANSLATION_TARGET_LOCALES,
  ): Promise<TranslationItem[]> {
    const listing = await this.listings.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');

    // Don't re-translate the source locale.
    const targets = targetLocales.filter((l) => l !== listing.sourceLocale);
    if (targets.length === 0) return [];

    const systemPrompt =
      'You are a professional real-estate copywriter. Translate listing text faithfully for buyers in the target locale. Preserve every fact: bedroom/bathroom counts, areas, prices, addresses, district names, amenity lists, and proper nouns. Keep tone friendly and informative. Never invent details that are not in the source.';
    const userPrompt = JSON.stringify({
      sourceLocale: listing.sourceLocale,
      title: listing.title,
      description: listing.description,
      targetLocales: targets,
      outputSchema: '{ "translations": [ { "locale": "<bcp47>", "title": "<string>", "description": "<string>" } ] }',
    });

    const response = await this.bedrockService.chat({
      purpose: 'translate-listing',
      systemPrompt,
      userPrompt,
      jsonMode: true,
      maxTokens: 4000,
    });

    let parsed: { translations?: TranslationItem[] } = {};
    try {
      parsed = JSON.parse(response.text);
    } catch (err) {
      this.logger.warn(
        `Could not parse translate-listing response for ${listingId}: ${(err as Error).message}`,
      );
    }

    const items = (parsed.translations ?? []).filter(
      (t): t is TranslationItem =>
        !!t && typeof t.locale === 'string' && typeof t.title === 'string' && typeof t.description === 'string',
    );

    // Stub mode: fabricate one entry per target so the persistence path can be
    // exercised even without an API key.
    const finalItems: TranslationItem[] =
      items.length > 0
        ? items
        : targets.map((locale) => ({
            locale,
            title: `[${locale}] ${listing.title}`,
            description: `[${locale}] ${listing.description}`,
          }));

    await this.persistTranslations(listingId, finalItems);
    return finalItems;
  }

  private async persistTranslations(
    listingId: string,
    items: TranslationItem[],
  ): Promise<void> {
    if (items.length === 0) return;
    // Bound title length to the column width so a verbose model doesn't blow up.
    const truncated = items.map((t) => ({
      listingId,
      locale: t.locale,
      title: t.title.slice(0, 200),
      description: t.description,
      isMachineTranslated: true,
      translatedAt: new Date(),
    }));

    // UPSERT — replace existing translations for the same (listing, locale).
    await this.translations
      .createQueryBuilder()
      .insert()
      .values(truncated)
      .orUpdate(
        ['title', 'description', 'is_machine_translated', 'translated_at'],
        ['listing_id', 'locale'],
      )
      .execute();
  }

  // ---------- Description enhancement ----------------------------------

  async enhanceDescription(
    text: string,
    locale = 'en',
  ): Promise<{ enhanced: string; live: boolean }> {
    const systemPrompt =
      'You rewrite real-estate listing descriptions to be SEO-optimised, engaging, and informative. Strict rules: (1) preserve every concrete fact in the source — square meters, prices, room counts, locations, amenities, distances; (2) do not invent any features that are not stated; (3) keep the same language as the source; (4) prefer scannable structure (short paragraphs, bullet points where natural).';
    const userPrompt = JSON.stringify({
      locale,
      original: text,
      instruction:
        'Return ONLY the rewritten description text — no preamble, no quotes, no commentary.',
    });
    const result = await this.bedrockService.chat({
      purpose: 'enhance-description',
      systemPrompt,
      userPrompt,
      maxTokens: 1500,
    });
    return { enhanced: result.text, live: result.live };
  }

  // ---------- Price prediction -----------------------------------------

  async predictPrice(params: {
    currentPrice: number;
    city: string;
    district?: string;
    propertyType: string;
    area: number;
    bedrooms?: number;
  }): Promise<{
    year1: { price: number; growthPercent: number };
    year2: { price: number; growthPercent: number };
    year5: { price: number; growthPercent: number };
    confidence: 'low' | 'medium' | 'high';
    reasoning: string;
    reasoningAr: string;
    vision2030Factor: string;
  }> {
    const systemPrompt =
      'You are a Saudi Arabian real-estate investment analyst with deep knowledge of Vision 2030 mega-projects and city-level market trends. You always return strict JSON.';

    // Concise summary of the Vision 2030 hooks that meaningfully move
    // prices in each city. Used to anchor the model on real projects
    // rather than letting it confabulate.
    const vision2030Projects: Record<string, string> = {
      Riyadh:
        'Diriyah Gate, Qiddiya Entertainment City, KAFD expansion, Riyadh Metro',
      Jeddah:
        'Red Sea Project access, Jeddah Tower, downtown waterfront tourism',
      Tabuk:
        'NEOM, The Line, Sindalah Island - extremely high growth expected',
      Mecca: 'Grand Mosque expansion, religious tourism growth',
      Medina: 'Prophet Mosque expansion, religious tourism',
      Dammam: 'King Salman Energy Park, Eastern Province industrial expansion',
    };

    const userPrompt = `Predict real-estate price growth for:
- Current price: ${params.currentPrice.toLocaleString()} SAR
- City: ${params.city}
- District: ${params.district ?? 'Central'}
- Property type: ${params.propertyType}
- Area: ${params.area} sqm
- Bedrooms: ${params.bedrooms ?? 'N/A'}
- Vision 2030 projects nearby: ${vision2030Projects[params.city] ?? 'General development'}

Based on:
1. Current Saudi real-estate market trends (2024-2026)
2. Vision 2030 impact on this specific city
3. Historical price appreciation in this area
4. Government infrastructure investments

Return ONLY valid JSON:
{
  "year1": { "price": 0, "growthPercent": 0 },
  "year2": { "price": 0, "growthPercent": 0 },
  "year5": { "price": 0, "growthPercent": 0 },
  "confidence": "low|medium|high",
  "reasoning": "Brief explanation in English",
  "reasoningAr": "شرح موجز بالعربية",
  "vision2030Factor": "How Vision 2030 affects this property"
}`;

    const result = await this.bedrockService.chat({
      purpose: 'predict-price',
      systemPrompt,
      userPrompt,
      jsonMode: true,
      maxTokens: 500,
    });

    // Bedrock disabled (dev / no credentials) — return a deterministic
    // mock so the UI still renders an answer and devs can iterate.
    if (!result.live) {
      const growth = params.city === 'Tabuk' ? 0.25 : 0.08;
      return {
        year1: {
          price: Math.round(params.currentPrice * (1 + growth * 0.3)),
          growthPercent: Math.round(growth * 30 * 10) / 10,
        },
        year2: {
          price: Math.round(params.currentPrice * (1 + growth * 0.6)),
          growthPercent: Math.round(growth * 60 * 10) / 10,
        },
        year5: {
          price: Math.round(params.currentPrice * (1 + growth * 1.5)),
          growthPercent: Math.round(growth * 150 * 10) / 10,
        },
        confidence: 'low',
        reasoning: 'Based on historical Saudi market averages',
        reasoningAr: 'بناءً على متوسطات السوق السعودي التاريخية',
        vision2030Factor: 'General positive impact from Vision 2030',
      };
    }

    try {
      return JSON.parse(result.text);
    } catch (err) {
      this.logger.warn(
        `predictPrice: could not parse Bedrock JSON: ${(err as Error).message}`,
      );
      // Fall back to the mock — failing the request would force the UI
      // into an error state for a feature that's already a guess.
      const growth = 0.08;
      return {
        year1: {
          price: Math.round(params.currentPrice * 1.024),
          growthPercent: 2.4,
        },
        year2: {
          price: Math.round(params.currentPrice * 1.05),
          growthPercent: 5,
        },
        year5: {
          price: Math.round(params.currentPrice * (1 + growth * 1.5)),
          growthPercent: Math.round(growth * 150 * 10) / 10,
        },
        confidence: 'low',
        reasoning: 'Fallback estimate',
        reasoningAr: 'تقدير احتياطي',
        vision2030Factor: 'General positive impact from Vision 2030',
      };
    }
  }

  // ---------- Recommendation scoring -----------------------------------

  async scoreCandidates(input: {
    history: BrowseHistoryEntry[];
    candidateIds: string[];
  }): Promise<RecommendationScore[]> {
    if (input.candidateIds.length === 0) return [];

    const candidates = await this.listings.find({
      where: input.candidateIds.map((id) => ({ id })),
      select: [
        'id',
        'type',
        'propertyType',
        'city',
        'district',
        'price',
        'bedrooms',
        'area',
      ],
    });

    if (candidates.length === 0) return [];

    const systemPrompt =
      'You score Saudi/GCC real-estate listings against a buyer\'s browse history. Assign each candidate a score from 0 (no match) to 100 (strong match) based on similarity in property type, listing type (sale/rent), city, district, price range, and bedroom count. Return strict JSON with shape { "scored": [{ "listingId": "<uuid>", "score": <0-100>, "reason": "<short>" }, …] }, sorted by score descending.';

    const userPrompt = JSON.stringify({
      history: input.history.slice(0, 50),
      candidates: candidates.map((c) => ({
        listingId: c.id,
        type: c.type,
        propertyType: c.propertyType,
        city: c.city,
        district: c.district,
        price: Number(c.price),
        bedrooms: c.bedrooms,
        area: c.area !== null ? Number(c.area) : null,
      })),
    });

    const response = await this.bedrockService.chat({
      purpose: 'recommend-listings',
      systemPrompt,
      userPrompt,
      jsonMode: true,
      maxTokens: 1200,
    });

    let parsed: { scored?: RecommendationScore[] } = {};
    try {
      parsed = JSON.parse(response.text);
    } catch (err) {
      this.logger.warn(
        `Could not parse recommend-listings response: ${(err as Error).message}`,
      );
    }

    if (parsed.scored && parsed.scored.length > 0) {
      // Validate listing IDs to defend against hallucinated UUIDs.
      const idSet = new Set(candidates.map((c) => c.id));
      return parsed.scored
        .filter((s) => s && idSet.has(s.listingId))
        .map((s) => ({
          listingId: s.listingId,
          score: clamp(Number(s.score) || 0, 0, 100),
          reason: typeof s.reason === 'string' ? s.reason : '',
        }))
        .sort((a, b) => b.score - a.score);
    }

    // Stub mode: rank by simple heuristic over history overlap.
    return this.heuristicRank(candidates, input.history);
  }

  private heuristicRank(
    candidates: Array<Pick<ListingEntity, 'id' | 'type' | 'propertyType' | 'city' | 'price' | 'bedrooms'>>,
    history: BrowseHistoryEntry[],
  ): RecommendationScore[] {
    if (history.length === 0) {
      return candidates.map((c) => ({
        listingId: c.id,
        score: 50,
        reason: 'No browse history yet — neutral baseline',
      }));
    }
    const cityCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    const propTypeCounts = new Map<string, number>();
    for (const h of history) {
      if (h.city) cityCounts.set(h.city, (cityCounts.get(h.city) ?? 0) + 1);
      if (h.type) typeCounts.set(h.type, (typeCounts.get(h.type) ?? 0) + 1);
      if (h.propertyType)
        propTypeCounts.set(h.propertyType, (propTypeCounts.get(h.propertyType) ?? 0) + 1);
    }
    const max = (m: Map<string, number>) =>
      Array.from(m.values()).reduce((acc, v) => Math.max(acc, v), 1);
    const cityScale = max(cityCounts);
    const typeScale = max(typeCounts);
    const propScale = max(propTypeCounts);

    return candidates
      .map((c) => {
        const cityScore = ((cityCounts.get(c.city) ?? 0) / cityScale) * 40;
        const typeScore = ((typeCounts.get(c.type) ?? 0) / typeScale) * 30;
        const propScore = ((propTypeCounts.get(c.propertyType) ?? 0) / propScale) * 30;
        const score = Math.round(cityScore + typeScore + propScore);
        return {
          listingId: c.id,
          score,
          reason: `heuristic: city=${cityScore.toFixed(0)} type=${typeScore.toFixed(0)} prop=${propScore.toFixed(0)}`,
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
