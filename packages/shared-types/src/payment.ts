import {
  PaymentPurpose,
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from './enums';

export interface Payment {
  id: string;
  userId: string;
  amount: number;          // in halalas (smallest currency unit)
  currency: string;
  status: PaymentStatus;
  purpose: PaymentPurpose;
  provider: string;        // e.g. "moyasar"
  providerPaymentId: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  failureMessage: string | null;
  refundedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  amount: number;
  purpose: PaymentPurpose;
  description?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentResponse {
  paymentId: string;
  providerPaymentId: string;
  redirectUrl: string | null;
  status: PaymentStatus;
}

export interface FeaturedListingPurchase {
  listingId: string;
  durationDays: number;
}

export interface Subscription {
  id: string;
  userId: string;
  agencyId: string | null;
  /** FK to the catalog row in `plans` */
  planId: string;
  /** Stable plan identifier (free/starter/pro/enterprise) — denormalised from the plan row. */
  planKey: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  listingQuota: number;
  featuredQuota: number;
  createdAt: string;
  updatedAt: string;
}
