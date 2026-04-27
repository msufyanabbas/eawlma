import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SavedListingEntity } from './entities/saved-listing.entity';
import { ListingEntity } from '../listings/entities/listing.entity';

@Injectable()
export class SavedListingsService {
  private readonly logger = new Logger(SavedListingsService.name);

  constructor(
    @InjectRepository(SavedListingEntity)
    private readonly saved: Repository<SavedListingEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
  ) {}

  /**
   * Idempotent save — returns the existing row if the user has already
   * saved this listing. Bumps the listing's saveCount on first save only.
   */
  async save(userId: string, listingId: string, notes?: string): Promise<SavedListingEntity> {
    const listing = await this.listings.findOne({ where: { id: listingId }, select: ['id'] });
    if (!listing) throw new NotFoundException('Listing not found');

    const existing = await this.saved.findOne({ where: { userId, listingId } });
    if (existing) {
      if (notes !== undefined) {
        existing.notes = notes ?? null;
        return this.saved.save(existing);
      }
      return existing;
    }
    const created = this.saved.create({ userId, listingId, notes: notes ?? null });
    const persisted = await this.saved.save(created);
    void this.listings.increment({ id: listingId }, 'saveCount', 1).catch(() => undefined);
    return persisted;
  }

  /** Idempotent unsave — silently no-ops when the row doesn't exist. */
  async unsave(userId: string, listingId: string): Promise<void> {
    const result = await this.saved.delete({ userId, listingId });
    if ((result.affected ?? 0) > 0) {
      void this.listings.decrement({ id: listingId }, 'saveCount', 1).catch(() => undefined);
    }
  }

  async listForUser(userId: string): Promise<ListingEntity[]> {
    const rows = await this.saved.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['listing', 'listing.media'],
    });
    return rows.map((r) => r.listing);
  }

  async listIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.saved.find({ where: { userId }, select: ['listingId'] });
    return rows.map((r) => r.listingId);
  }
}
