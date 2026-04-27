import { apiClient, unwrap } from './client';

export interface BrowseHistoryEntry {
  listingId?: string;
  type?: string;
  propertyType?: string;
  city?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  visitedAt?: string;
}

export interface RecommendationScore {
  listingId: string;
  score: number;
  reason: string;
}

export const aiApi = {
  enhanceDescription: async (
    text: string,
    locale = 'en',
  ): Promise<{ enhanced: string; live: boolean }> => {
    const { data } = await apiClient.post<{ data: { enhanced: string; live: boolean } }>(
      '/ai/enhance-description',
      { text, locale },
    );
    return unwrap<{ enhanced: string; live: boolean }>(data);
  },

  recommendations: async (
    candidateIds: string[],
    history: BrowseHistoryEntry[] = [],
  ): Promise<RecommendationScore[]> => {
    const { data } = await apiClient.post<{ data: RecommendationScore[] }>(
      '/ai/recommendations',
      { candidateIds, history },
    );
    return unwrap<RecommendationScore[]>(data);
  },

  translateListing: async (
    listingId: string,
    targetLocales?: string[],
  ): Promise<{ translated: number; locales: string[] }> => {
    const { data } = await apiClient.post<{ data: { translated: number; locales: string[] } }>(
      `/ai/translate-listing/${listingId}`,
      targetLocales ? { targetLocales } : {},
    );
    return unwrap<{ translated: number; locales: string[] }>(data);
  },
};
