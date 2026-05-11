import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { ListingEntity } from './listing.entity';

/**
 * Per-day price override on a listing — lets hosts charge weekend / Eid /
 * peak-season rates without touching the base `daily_rate`. Each row pins a
 * specific calendar date to a custom price.
 */
@Entity({ name: 'listing_price_overrides' })
@Index('uq_listing_override_date', ['listingId', 'date'], { unique: true })
@Index('idx_listing_override_listing', ['listingId'])
export class ListingPriceOverrideEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @ManyToOne(() => ListingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: ListingEntity;

  /** ISO date (YYYY-MM-DD). The price applies for that single calendar day. */
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  price: string;

  /** Free-text justification ("Weekend", "Eid Holiday", "Off-peak"). */
  @Column({ type: 'varchar', length: 120, nullable: true })
  reason: string | null;
}
