import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ListingStatus,
  NotificationType,
  PaymentPurpose,
  PaymentStatus,
  SubscriptionPlan,
} from '@eawlma/shared-types';

import { PaymentEntity } from './entities/payment.entity';
import { ListingEntity } from '../listings/entities/listing.entity';
import { UserEntity } from '../users/entities/user.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MoyasarClient } from './moyasar.client';
import {
  FeaturedListingPaymentDto,
  SubscriptionPaymentDto,
} from './dto/payment.dto';

const FEATURED_PRICE_PER_DAY_HALALAS = 5_000; // SAR 50 / day — refine via plan policy later

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly payments: Repository<PaymentEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly moyasar: MoyasarClient,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ---------- Initiate ---------------------------------------------------

  async initiateFeaturedListingPayment(
    userId: string,
    dto: FeaturedListingPaymentDto,
  ): Promise<PaymentEntity> {
    const listing = await this.listings.findOne({ where: { id: dto.listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.ownerId !== userId) {
      throw new BadRequestException('You can only feature your own listings');
    }
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Only active listings can be featured');
    }

    const amount = dto.durationDays * FEATURED_PRICE_PER_DAY_HALALAS;
    const description = `Feature listing ${listing.referenceCode} for ${dto.durationDays} days`;

    const payment = await this.savePending(userId, {
      amount,
      currency: 'SAR',
      purpose: PaymentPurpose.FEATURED_LISTING,
      description,
      metadata: {
        listingId: listing.id,
        referenceCode: listing.referenceCode,
        durationDays: dto.durationDays,
      },
    });

    const moyasarPayment = await this.moyasar.createPayment({
      amount,
      currency: 'SAR',
      description,
      callbackUrl: dto.callbackUrl,
      metadata: { paymentId: payment.id, listingId: listing.id, durationDays: dto.durationDays },
    });

    payment.providerPaymentId = moyasarPayment.id;
    payment.status =
      moyasarPayment.status === 'paid' ? PaymentStatus.CAPTURED : PaymentStatus.PENDING;
    payment.providerPayload = moyasarPayment as unknown as Record<string, unknown>;
    return this.payments.save(payment);
  }

  async initiateSubscriptionPayment(
    userId: string,
    dto: SubscriptionPaymentDto,
  ): Promise<PaymentEntity> {
    const plan = await this.subscriptionsService.getPlan(dto.planKey);
    if (!plan.isActive) throw new BadRequestException('Plan is no longer available');
    if (plan.key === SubscriptionPlan.FREE) {
      throw new BadRequestException('The Free plan is automatic — no payment required');
    }

    const amount = Math.round(Number(plan.price) * 100); // SAR -> halalas
    const description = `eawlma ${plan.nameEn} (${plan.billingPeriod})`;

    const payment = await this.savePending(userId, {
      amount,
      currency: plan.currency,
      purpose: PaymentPurpose.SUBSCRIPTION,
      description,
      metadata: {
        planKey: plan.key,
        planId: plan.id,
        billingPeriod: plan.billingPeriod,
      },
    });

    const moyasarPayment = await this.moyasar.createPayment({
      amount,
      currency: plan.currency,
      description,
      callbackUrl: dto.callbackUrl,
      metadata: { paymentId: payment.id, planKey: plan.key },
    });

    payment.providerPaymentId = moyasarPayment.id;
    payment.status =
      moyasarPayment.status === 'paid' ? PaymentStatus.CAPTURED : PaymentStatus.PENDING;
    payment.providerPayload = moyasarPayment as unknown as Record<string, unknown>;
    return this.payments.save(payment);
  }

  // ---------- Webhook ----------------------------------------------------

  async handleWebhookPayload(parsed: Record<string, unknown>): Promise<{ ok: boolean }> {
    const data =
      ((parsed.data as Record<string, unknown> | undefined) ?? null) ??
      // older webhook shape (the payment object at top-level)
      (parsed.id ? parsed : null);
    if (!data) {
      this.logger.warn('Webhook payload missing payment data');
      return { ok: false };
    }
    const providerId = data.id as string | undefined;
    const remoteStatus = (data.status as string | undefined) ?? '';
    if (!providerId) {
      this.logger.warn('Webhook payload missing provider payment id');
      return { ok: false };
    }

    const payment = await this.payments.findOne({
      where: { providerPaymentId: providerId },
    });
    if (!payment) {
      this.logger.warn(`Webhook references unknown payment id ${providerId}`);
      return { ok: false };
    }

    const status = mapMoyasarStatus(remoteStatus);
    const previousStatus = payment.status;
    payment.status = status;
    payment.providerPayload = data as Record<string, unknown>;
    if (status === PaymentStatus.FAILED) {
      payment.failureMessage =
        (data.source as { message?: string } | undefined)?.message ?? 'Payment failed';
    }
    await this.payments.save(payment);

    if (status === PaymentStatus.CAPTURED && previousStatus !== PaymentStatus.CAPTURED) {
      await this.applyPaymentSideEffects(payment);
    } else if (status === PaymentStatus.FAILED && previousStatus !== PaymentStatus.FAILED) {
      await this.notificationsService
        .create({
          userId: payment.userId,
          type: NotificationType.PAYMENT_FAILED,
          title: 'Payment failed',
          body: payment.failureMessage ?? 'Your payment was not completed.',
          data: { paymentId: payment.id, providerPaymentId: payment.providerPaymentId },
        })
        .catch((err: Error) =>
          this.logger.error(`Failed to write payment-failed notification: ${err.message}`),
        );
    }

    return { ok: true };
  }

  async applyPaymentSideEffects(payment: PaymentEntity): Promise<void> {
    if (payment.purpose === PaymentPurpose.FEATURED_LISTING) {
      const listingId = payment.metadata.listingId as string | undefined;
      const durationDays = (payment.metadata.durationDays as number | undefined) ?? 7;
      if (!listingId) return;
      const listing = await this.listings.findOne({ where: { id: listingId } });
      if (!listing) return;
      const now = new Date();
      const base = listing.featuredUntil && listing.featuredUntil > now ? listing.featuredUntil : now;
      listing.isFeatured = true;
      listing.featuredUntil = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);
      await this.listings.save(listing);
    } else if (payment.purpose === PaymentPurpose.SUBSCRIPTION) {
      const planKey = payment.metadata.planKey as SubscriptionPlan | undefined;
      if (!planKey) return;
      const plan = await this.subscriptionsService.getPlan(planKey);
      const periodDays = plan.billingPeriod === 'yearly' ? 365 : 30;
      await this.subscriptionsService.activate(payment.userId, plan, periodDays, null);
    }

    await this.notificationsService
      .create({
        userId: payment.userId,
        type: NotificationType.PAYMENT_SUCCEEDED,
        title: 'Payment received',
        body: `We've activated ${payment.description ?? payment.purpose}.`,
        data: { paymentId: payment.id, amount: payment.amount, currency: payment.currency },
      })
      .catch((err: Error) =>
        this.logger.error(`Failed to write payment-succeeded notification: ${err.message}`),
      );
  }

  // ---------- Read -------------------------------------------------------

  async findByIdForUser(id: string, userId: string): Promise<PaymentEntity> {
    const payment = await this.payments.findOne({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async listForUser(userId: string, page: number, limit: number) {
    const [data, total] = await this.payments.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getBuyerForInvoice(payment: PaymentEntity): Promise<UserEntity | null> {
    return this.users.findOne({ where: { id: payment.userId } });
  }

  // ---------- Helpers ----------------------------------------------------

  private async savePending(
    userId: string,
    data: Pick<PaymentEntity, 'amount' | 'currency' | 'purpose' | 'description' | 'metadata'>,
  ): Promise<PaymentEntity> {
    const payment = this.payments.create({
      userId,
      amount: data.amount,
      currency: data.currency,
      status: PaymentStatus.INITIATED,
      purpose: data.purpose,
      description: data.description,
      metadata: data.metadata ?? {},
      provider: 'moyasar',
    });
    return this.payments.save(payment);
  }
}

function mapMoyasarStatus(remote: string): PaymentStatus {
  switch (remote) {
    case 'initiated':
      return PaymentStatus.INITIATED;
    case 'paid':
    case 'captured':
      return PaymentStatus.CAPTURED;
    case 'authorized':
      return PaymentStatus.AUTHORIZED;
    case 'failed':
      return PaymentStatus.FAILED;
    case 'refunded':
      return PaymentStatus.REFUNDED;
    case 'voided':
      return PaymentStatus.VOIDED;
    case 'pending':
    default:
      return PaymentStatus.PENDING;
  }
}
