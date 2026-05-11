import { apiClient, unwrap } from './client';

export type PromoType = 'percentage' | 'fixed_amount' | 'free_nights';
export type PromoApplicableTo = 'all' | 'stays' | 'long_term' | 'specific_listing';

export interface PromoCode {
  id: string;
  code: string;
  type: PromoType;
  discountValue: string;
  minBookingAmount: string;
  maxDiscountAmount: string | null;
  validFrom: string;
  validUntil: string;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  applicableTo: PromoApplicableTo;
  listingId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromoUsage {
  id: string;
  promoCodeId: string;
  userId: string;
  bookingId: string | null;
  discountApplied: string;
  usedAt: string;
}

export interface ValidatePromoResult {
  valid: boolean;
  discount: number;
  finalAmount: number;
  message: string;
  code?: string;
  promoCodeId?: string;
}

export interface UpsertPromoInput {
  code?: string;
  type?: PromoType;
  discountValue?: number;
  minBookingAmount?: number;
  maxDiscountAmount?: number | null;
  validFrom?: string;
  validUntil?: string;
  maxUses?: number | null;
  isActive?: boolean;
  applicableTo?: PromoApplicableTo;
  listingId?: string | null;
}

export const promosApi = {
  validate: async (
    code: string,
    amount: number,
    listingId?: string,
  ): Promise<ValidatePromoResult> => {
    const { data } = await apiClient.post<{ data: ValidatePromoResult }>('/promos/validate', {
      code,
      amount,
      listingId,
    });
    return unwrap<ValidatePromoResult>(data);
  },

  apply: async (code: string, bookingId: string): Promise<{ discount: number }> => {
    const { data } = await apiClient.post<{ data: { discount: number } }>('/promos/apply', {
      code,
      bookingId,
    });
    return unwrap<{ discount: number }>(data);
  },

  // ----- Admin -------------------------------------------------------------

  listAll: async (): Promise<PromoCode[]> => {
    const { data } = await apiClient.get<{ data: PromoCode[] }>('/admin/promos');
    return unwrap<PromoCode[]>(data);
  },

  create: async (input: UpsertPromoInput): Promise<PromoCode> => {
    const { data } = await apiClient.post<{ data: PromoCode }>('/admin/promos', input);
    return unwrap<PromoCode>(data);
  },

  update: async (id: string, input: UpsertPromoInput): Promise<PromoCode> => {
    const { data } = await apiClient.patch<{ data: PromoCode }>(`/admin/promos/${id}`, input);
    return unwrap<PromoCode>(data);
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/promos/${id}`);
  },

  usage: async (id: string): Promise<PromoUsage[]> => {
    const { data } = await apiClient.get<{ data: PromoUsage[] }>(`/admin/promos/${id}/usage`);
    return unwrap<PromoUsage[]>(data);
  },
};
