import { apiClient, unwrap } from './client';

export interface PriceTrendPoint {
  month: string;
  avgPricePerSqm: number;
  avgPrice: number;
  listingCount: number;
}

export interface DistrictInsight {
  district: string;
  avgPricePerSqm: number;
  count: number;
}

export const priceTrendsApi = {
  trends: async (city: string, type: string): Promise<PriceTrendPoint[]> => {
    const { data } = await apiClient.get<{ data: PriceTrendPoint[] }>(
      '/price-trends',
      { params: { city, type } },
    );
    return unwrap<PriceTrendPoint[]>(data);
  },
  areaInsights: async (city: string): Promise<DistrictInsight[]> => {
    const { data } = await apiClient.get<{ data: DistrictInsight[] }>(
      '/price-trends/area-insights',
      { params: { city } },
    );
    return unwrap<DistrictInsight[]>(data);
  },
};
