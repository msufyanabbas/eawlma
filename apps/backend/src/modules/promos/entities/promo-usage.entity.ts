import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { PromoCodeEntity } from './promo-code.entity';

@Entity({ name: 'promo_usage' })
@Index('idx_promo_usage_code', ['promoCodeId'])
@Index('idx_promo_usage_user', ['userId'])
export class PromoUsageEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'promo_code_id' })
  promoCodeId: string;

  @ManyToOne(() => PromoCodeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promo_code_id' })
  promoCode: PromoCodeEntity;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'booking_id', nullable: true })
  bookingId: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'discount_applied' })
  discountApplied: string;

  @Column({ type: 'timestamptz', name: 'used_at' })
  usedAt: Date;
}
