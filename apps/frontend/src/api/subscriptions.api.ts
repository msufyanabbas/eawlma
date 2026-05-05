import type { Subscription } from '@eawlma/shared-types';
import { apiClient, unwrap } from './client';

export interface PlanCatalogEntry {
  id: string;
  key: string;
  nameAr: string;
  nameEn: string;
  price: string;
  currency: string;
  billingPeriod: 'monthly' | 'yearly';
  listingQuota: number;
  featuredQuota: number;
  agentSeats: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

export const subscriptionsApi = {
  plans: async (): Promise<PlanCatalogEntry[]> => {
    const { data } = await apiClient.get<{ data: PlanCatalogEntry[] }>(
      '/subscriptions/plans',
    );
    return unwrap<PlanCatalogEntry[]>(data);
  },

  me: async (): Promise<Subscription> => {
    const { data } = await apiClient.get<{ data: Subscription }>('/subscriptions/me');
    return unwrap<Subscription>(data);
  },

  cancel: async (): Promise<Subscription> => {
    const { data } = await apiClient.post<{ data: Subscription }>(
      '/subscriptions/cancel',
    );
    return unwrap<Subscription>(data);
  },
};
