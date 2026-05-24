import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Append-only ledger of price changes for a listing. ListingsService writes
 * a row whenever an update mutates `listings.price`, so the public detail
 * page can show "Price reduced 5% on Mar 12".
 */
@Entity({ name: 'listing_price_history' })
@Index('idx_price_history_listing', ['listingId', 'recordedAt'])
export class ListingPriceHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  price: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'previous_price', nullable: true })
  previousPrice: string | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, name: 'change_percent', nullable: true })
  changePercent: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'recorded_at' })
  recordedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;
}
