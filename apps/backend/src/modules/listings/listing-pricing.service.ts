import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { UserRole } from '@eawlma/shared-types';

import { RequestUser } from '../../common/decorators/current-user.decorator';
import { ListingEntity } from './entities/listing.entity';
import { ListingPriceOverrideEntity } from './entities/listing-price-override.entity';

interface DayPrice {
  date: string;          // YYYY-MM-DD
  price: number;
  isDefault: boolean;    // true when no override exists for that date
  reason: string | null;
}

@Injectable()
export class ListingPricingService {
  constructor(
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(ListingPriceOverrideEntity)
    private readonly overrides: Repository<ListingPriceOverrideEntity>,
  ) {}

  /** Month calendar: returns one row per day with the override price when one
   *  exists, otherwise the listing's default daily rate. */
  async calendar(listingId: string, month: string): Promise<{
    defaultRate: number;
    days: DayPrice[];
  }> {
    const listing = await this.listings.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');

    // Accept `2026-05` or `2026-05-XX` — strip to year + month.
    const match = /^(\d{4})-(\d{2})/.exec(month);
    if (!match) throw new BadRequestException('Invalid month — expected YYYY-MM');
    const year = Number(match[1]);
    const m = Number(match[2]);
    const first = new Date(Date.UTC(year, m - 1, 1));
    const last = new Date(Date.UTC(year, m, 0));
    const firstStr = first.toISOString().slice(0, 10);
    const lastStr = last.toISOString().slice(0, 10);

    const rows = await this.overrides.find({
      where: { listingId, date: Between(firstStr, lastStr) },
    });
    const map = new Map<string, ListingPriceOverrideEntity>();
    for (const r of rows) map.set(r.date, r);

    const defaultRate = Number(listing.dailyRate ?? listing.price ?? 0);
    const days: DayPrice[] = [];
    for (let d = 1; d <= last.getUTCDate(); d++) {
      const ds = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const ov = map.get(ds);
      days.push({
        date: ds,
        price: ov ? Number(ov.price) : defaultRate,
        isDefault: !ov,
        reason: ov?.reason ?? null,
      });
    }
    return { defaultRate, days };
  }

  async upsertOverrides(
    listingId: string,
    actor: RequestUser,
    dates: string[],
    price: number,
    reason?: string,
  ): Promise<{ upserted: number }> {
    const listing = await this.findOwned(listingId, actor);
    if (!Array.isArray(dates) || dates.length === 0) {
      throw new BadRequestException('At least one date is required');
    }
    if (price <= 0) throw new BadRequestException('Price must be positive');

    let upserted = 0;
    for (const date of dates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException(`Invalid date: ${date}`);
      }
      const existing = await this.overrides.findOne({
        where: { listingId: listing.id, date },
      });
      if (existing) {
        existing.price = price.toFixed(2);
        existing.reason = reason ?? existing.reason;
        await this.overrides.save(existing);
      } else {
        await this.overrides.save(
          this.overrides.create({
            listingId: listing.id,
            date,
            price: price.toFixed(2),
            reason: reason ?? null,
          }),
        );
      }
      upserted += 1;
    }
    return { upserted };
  }

  async removeOverride(listingId: string, actor: RequestUser, date: string): Promise<void> {
    await this.findOwned(listingId, actor);
    await this.overrides.delete({ listingId, date });
  }

  /** Sum prices across the check-in/check-out range, applying overrides per
   *  day. Used by the booking flow to compute the dynamic stay total. */
  async stayTotal(
    listingId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<{ total: number; nights: number; defaultRate: number }> {
    const listing = await this.listings.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out must be after check-in');
    }
    const defaultRate = Number(listing.dailyRate ?? listing.price ?? 0);
    if (!defaultRate) return { total: 0, nights: 0, defaultRate: 0 };

    const dates: string[] = [];
    const cursor = new Date(checkIn);
    while (cursor < checkOut) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const overrides = await this.overrides.find({
      where: { listingId, date: In(dates) },
    });
    const overrideMap = new Map<string, number>();
    for (const o of overrides) overrideMap.set(o.date, Number(o.price));

    let total = 0;
    for (const d of dates) total += overrideMap.get(d) ?? defaultRate;
    return { total, nights: dates.length, defaultRate };
  }

  private async findOwned(id: string, actor: RequestUser): Promise<ListingEntity> {
    const listing = await this.listings.findOne({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    const isPrivileged = actor.role === UserRole.ADMIN || actor.role === UserRole.MODERATOR;
    if (listing.ownerId !== actor.id && !isPrivileged) {
      throw new ForbiddenException('Only the listing owner can manage pricing');
    }
    return listing;
  }
}
