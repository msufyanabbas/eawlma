import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ListingStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@aqarat/shared-types';

import { ListingEntity } from '../listings/entities/listing.entity';
import { PlanEntity } from './entities/plan.entity';
import { SubscriptionEntity } from './entities/subscription.entity';

const VALID_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  [SubscriptionStatus.TRIALING]: [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.CANCELED,
    SubscriptionStatus.EXPIRED,
  ],
  [SubscriptionStatus.ACTIVE]: [
    SubscriptionStatus.PAST_DUE,
    SubscriptionStatus.CANCELED,
    SubscriptionStatus.EXPIRED,
  ],
  [SubscriptionStatus.PAST_DUE]: [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.CANCELED,
    SubscriptionStatus.EXPIRED,
  ],
  [SubscriptionStatus.CANCELED]: [], // terminal
  [SubscriptionStatus.EXPIRED]: [SubscriptionStatus.ACTIVE], // re-activation creates a new period
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(PlanEntity)
    private readonly plans: Repository<PlanEntity>,
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptions: Repository<SubscriptionEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
  ) {}

  // ---------- Plans -------------------------------------------------------

  listPlans(): Promise<PlanEntity[]> {
    return this.plans.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } });
  }

  async getPlan(key: SubscriptionPlan): Promise<PlanEntity> {
    const plan = await this.plans.findOne({ where: { key } });
    if (!plan) throw new NotFoundException(`Plan "${key}" not found`);
    return plan;
  }

  async upsertPlan(input: Partial<PlanEntity> & { key: SubscriptionPlan }): Promise<PlanEntity> {
    const existing = await this.plans.findOne({ where: { key: input.key } });
    const merged = this.plans.create({ ...(existing ?? {}), ...input });
    return this.plans.save(merged);
  }

  // ---------- Subscriptions ----------------------------------------------

  async getActiveForUser(userId: string): Promise<SubscriptionEntity | null> {
    return this.subscriptions.findOne({
      where: [
        { userId, status: SubscriptionStatus.ACTIVE },
        { userId, status: SubscriptionStatus.TRIALING },
      ],
      order: { currentPeriodEnd: 'DESC' },
    });
  }

  async getOrCreateFreeSubscription(userId: string): Promise<SubscriptionEntity> {
    const active = await this.getActiveForUser(userId);
    if (active) return active;
    const freePlan = await this.getPlan(SubscriptionPlan.FREE);
    return this.activate(userId, freePlan, /* periodDays */ 365 * 5, null);
  }

  /**
   * Activate or extend a subscription for a user. Creates a new ACTIVE row,
   * cancelling any prior ACTIVE/TRIALING subscription on the same user.
   */
  async activate(
    userId: string,
    plan: PlanEntity,
    periodDays: number,
    agencyId: string | null,
  ): Promise<SubscriptionEntity> {
    const previous = await this.getActiveForUser(userId);
    if (previous) {
      previous.status = SubscriptionStatus.CANCELED;
      previous.cancelAtPeriodEnd = false;
      await this.subscriptions.save(previous);
    }
    const start = new Date();
    const end = new Date(start.getTime() + periodDays * 24 * 60 * 60 * 1000);
    const sub = this.subscriptions.create({
      userId,
      agencyId,
      planId: plan.id,
      planKey: plan.key,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
      trialEnd: null,
      listingQuota: plan.listingQuota,
      featuredQuota: plan.featuredQuota,
    });
    return this.subscriptions.save(sub);
  }

  async transition(
    subscriptionId: string,
    next: SubscriptionStatus,
  ): Promise<SubscriptionEntity> {
    const sub = await this.subscriptions.findOne({ where: { id: subscriptionId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    const allowed = VALID_TRANSITIONS[sub.status] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Cannot transition from ${sub.status} to ${next}`);
    }
    sub.status = next;
    return this.subscriptions.save(sub);
  }

  async cancelAtPeriodEnd(userId: string): Promise<SubscriptionEntity> {
    const sub = await this.getActiveForUser(userId);
    if (!sub) throw new NotFoundException('No active subscription to cancel');
    sub.cancelAtPeriodEnd = true;
    return this.subscriptions.save(sub);
  }

  // ---------- Quota enforcement -----------------------------------------

  /** Throws if the user is at or above their active-listing quota. */
  async assertCanPublishListing(userId: string): Promise<void> {
    const sub = (await this.getActiveForUser(userId)) ??
      (await this.getOrCreateFreeSubscription(userId));
    const activeListingCount = await this.listings.count({
      where: [
        { ownerId: userId, status: ListingStatus.ACTIVE },
        { ownerId: userId, status: ListingStatus.PENDING_REVIEW },
      ],
    });
    if (activeListingCount >= sub.listingQuota) {
      throw new ForbiddenException(
        `Plan "${sub.planKey}" allows ${sub.listingQuota} active listings — you have ${activeListingCount}. Upgrade to publish more.`,
      );
    }
  }
}
