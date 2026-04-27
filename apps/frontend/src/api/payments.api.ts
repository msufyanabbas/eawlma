import type { Payment, PaginatedResponse, SubscriptionPlan } from '@aqarat/shared-types';
import { apiClient, unwrap } from './client';

export interface CreatePaymentResponse {
  paymentId: string;
  providerPaymentId: string;
  redirectUrl: string | null;
  status: string;
}

export const paymentsApi = {
  featuredListing: async (
    listingId: string,
    durationDays: number,
    callbackUrl?: string,
  ): Promise<CreatePaymentResponse> => {
    const { data } = await apiClient.post<{ data: CreatePaymentResponse }>(
      '/payments/featured-listing',
      { listingId, durationDays, callbackUrl },
    );
    return unwrap<CreatePaymentResponse>(data);
  },

  subscription: async (
    planKey: SubscriptionPlan,
    callbackUrl?: string,
  ): Promise<CreatePaymentResponse> => {
    const { data } = await apiClient.post<{ data: CreatePaymentResponse }>(
      '/payments/subscriptions',
      { planKey, callbackUrl },
    );
    return unwrap<CreatePaymentResponse>(data);
  },

  mine: async (page = 1, limit = 20): Promise<PaginatedResponse<Payment>> => {
    const { data } = await apiClient.get<PaginatedResponse<Payment>>('/payments/mine', {
      params: { page, limit },
    });
    return data;
  },

  invoiceUrl: (paymentId: string): string => `/payments/${paymentId}/invoice`,
};
