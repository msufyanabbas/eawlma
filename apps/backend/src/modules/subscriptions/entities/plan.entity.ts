import { Column, Entity, Index } from 'typeorm';
import { SubscriptionPlan } from '@eawlma/shared-types';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity({ name: 'plans' })
@Index('uq_plans_key', ['key'], { unique: true })
export class PlanEntity extends BaseEntity {
  @Column({ type: 'enum', enum: SubscriptionPlan })
  key: SubscriptionPlan;

  @Column({ type: 'varchar', length: 100, name: 'name_ar' })
  nameAr: string;

  @Column({ type: 'varchar', length: 100, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'varchar', length: 3, default: 'SAR' })
  currency: string;

  @Column({ type: 'varchar', length: 16, name: 'billing_period', default: 'monthly' })
  billingPeriod: 'monthly' | 'yearly';

  @Column({ type: 'integer', name: 'listing_quota', default: 1 })
  listingQuota: number;

  @Column({ type: 'integer', name: 'featured_quota', default: 0 })
  featuredQuota: number;

  @Column({ type: 'integer', name: 'agent_seats', default: 1 })
  agentSeats: number;

  @Column({ type: 'jsonb', name: 'features', default: () => "'[]'::jsonb" })
  features: string[];

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'integer', name: 'sort_order', default: 0 })
  sortOrder: number;
}
