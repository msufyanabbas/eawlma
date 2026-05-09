import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingEntity } from '../listings/entities/listing.entity';

export interface PriceTrendPoint {
  month: string;
  avgPricePerSqm: number;
  avgPrice: number;
  listingCount: number;
}

export interface DistrictInsight {
  district: string;
  avgPricePerSqm: number;
  count: number;
}

@Injectable()
export class PriceTrendsService {
  constructor(
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
  ) {}

  async getPriceTrends(
    city: string,
    propertyType: string,
  ): Promise<PriceTrendPoint[]> {
    const sinceDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const rows = await this.listings
      .createQueryBuilder('l')
      .select([
        "DATE_TRUNC('month', l.created_at) as month",
        'AVG(l.price / NULLIF(l.area, 0)) as avg_price_per_sqm',
        'COUNT(*) as listing_count',
        'AVG(l.price) as avg_price',
      ])
      .where('l.city ILIKE :city', { city: `%${city}%` })
      .andWhere('l.property_type = :type', { type: propertyType })
      .andWhere('l.created_at > :date', { date: sinceDate })
      .groupBy("DATE_TRUNC('month', l.created_at)")
      .orderBy('month', 'ASC')
      .getRawMany<{
        month: Date;
        avg_price_per_sqm: string | null;
        listing_count: string;
        avg_price: string | null;
      }>();

    return rows.map((r) => ({
      month: new Date(r.month).toISOString().slice(0, 10),
      avgPricePerSqm: r.avg_price_per_sqm ? Number(r.avg_price_per_sqm) : 0,
      avgPrice: r.avg_price ? Number(r.avg_price) : 0,
      listingCount: Number(r.listing_count),
    }));
  }

  async getAreaInsights(city: string): Promise<DistrictInsight[]> {
    const rows = await this.listings
      .createQueryBuilder('l')
      .select([
        'l.district as district',
        'AVG(l.price / NULLIF(l.area, 0)) as avg_price_per_sqm',
        'COUNT(*) as count',
      ])
      .where('l.city ILIKE :city', { city: `%${city}%` })
      .andWhere('l.district IS NOT NULL')
      .groupBy('l.district')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany<{
        district: string;
        avg_price_per_sqm: string | null;
        count: string;
      }>();

    return rows.map((r) => ({
      district: r.district,
      avgPricePerSqm: r.avg_price_per_sqm ? Number(r.avg_price_per_sqm) : 0,
      count: Number(r.count),
    }));
  }
}
