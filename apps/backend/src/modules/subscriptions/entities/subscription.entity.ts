import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SubscriptionPlan, SubscriptionStatus } from '@eawlma/shared-types';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { PlanEntity } from './plan.entity';

@Entity({ name: 'subscriptions' })
@Index('idx_subscriptions_user', ['userId'])
@Index('idx_subscriptions_status', ['status'])
@Index('idx_subscriptions_plan', ['planKey'])
export class SubscriptionEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'uuid', name: 'agency_id', nullable: true })
  agencyId: string | null;

  @Column({ type: 'uuid', name: 'plan_id' })
  planId: string;

  @ManyToOne(() => PlanEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanEntity;

  @Column({ type: 'enum', enum: SubscriptionPlan, name: 'plan_key' })
  planKey: SubscriptionPlan;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Column({ type: 'timestamptz', name: 'current_period_start' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamptz', name: 'current_period_end' })
  currentPeriodEnd: Date;

  @Column({ type: 'boolean', name: 'cancel_at_period_end', default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ type: 'timestamptz', name: 'trial_end', nullable: true })
  trialEnd: Date | null;

  // Quotas snapshotted from the plan at activation time, so plan changes don't
  // retroactively shrink an active customer's quota.
  @Column({ type: 'integer', name: 'listing_quota' })
  listingQuota: number;

  @Column({ type: 'integer', name: 'featured_quota' })
  featuredQuota: number;
}
