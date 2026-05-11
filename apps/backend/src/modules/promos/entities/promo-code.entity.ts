import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { ListingEntity } from '../../listings/entities/listing.entity';
import { UserEntity } from '../../users/entities/user.entity';

export type PromoType = 'percentage' | 'fixed_amount' | 'free_nights';
export type PromoApplicableTo = 'all' | 'stays' | 'long_term' | 'specific_listing';

@Entity({ name: 'promo_codes' })
@Index('uq_promo_codes_code', ['code'], { unique: true })
@Index('idx_promo_active', ['isActive'])
export class PromoCodeEntity extends BaseEntity {
  /** Public code typed at checkout — stored upper-case so lookups are
   *  case-insensitive without LOWER() everywhere. */
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 16 })
  type: PromoType;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'discount_value' })
  discountValue: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'min_booking_amount', default: 0 })
  minBookingAmount: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'max_discount_amount', nullable: true })
  maxDiscountAmount: string | null;

  @Column({ type: 'timestamptz', name: 'valid_from' })
  validFrom: Date;

  @Column({ type: 'timestamptz', name: 'valid_until' })
  validUntil: Date;

  @Column({ type: 'integer', name: 'max_uses', nullable: true })
  maxUses: number | null;

  @Column({ type: 'integer', name: 'used_count', default: 0 })
  usedCount: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 24, name: 'applicable_to', default: 'all' })
  applicableTo: PromoApplicableTo;

  @Column({ type: 'uuid', name: 'listing_id', nullable: true })
  listingId: string | null;

  @ManyToOne(() => ListingEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'listing_id' })
  listing: ListingEntity | null;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: UserEntity | null;
}
