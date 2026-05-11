import { apiClient, unwrap } from './client';

export interface PriceCalendarDay {
  date: string;
  price: number;
  isOverride: boolean;
  reason: string | null;
}

export interface PriceCalendar {
  defaultRate: number;
  days: PriceCalendarDay[];
}

export const pricingApi = {
  /** month is YYYY-MM. */
  calendar: async (listingId: string, month: string): Promise<PriceCalendar> => {
    const { data } = await apiClient.get<{ data: PriceCalendar }>(
      `/listings/${listingId}/price-calendar`,
      { params: { month } },
    );
    return unwrap<PriceCalendar>(data);
  },

  upsertOverrides: async (
    listingId: string,
    dates: string[],
    price: number,
    reason?: string,
  ): Promise<void> => {
    await apiClient.post(`/listings/${listingId}/price-overrides`, {
      dates,
      price,
      reason,
    });
  },

  removeOverride: async (listingId: string, date: string): Promise<void> => {
    await apiClient.delete(`/listings/${listingId}/price-overrides/${date}`);
  },
};
