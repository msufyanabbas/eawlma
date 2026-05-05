import type { Listing, ListingSearchParams, PaginatedResponse } from '@eawlma/shared-types';
import { apiClient } from './client';

export interface FlatSearchParams {
  q?: string;
  type?: string;
  propertyTypes?: string[];
  city?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  furnishing?: string;
  amenityIds?: string[];
  rentPeriod?: string;
  agencyId?: string;
  agentId?: string;
  isFeatured?: boolean;
  // bbox
  neLat?: number;
  neLng?: number;
  swLat?: number;
  swLng?: number;
  // radius
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
  // sort + paging
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

const flattenParams = (p: FlatSearchParams): Record<string, string | number | boolean> => {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(p)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) out[key] = value.join(',');
    } else {
      out[key] = value as string | number | boolean;
    }
  }
  return out;
};

export const searchApi = {
  listings: async (params: FlatSearchParams = {}): Promise<PaginatedResponse<Listing>> => {
    const { data } = await apiClient.get<PaginatedResponse<Listing>>('/search/listings', {
      params: flattenParams(params),
    });
    return data;
  },
};

export type { ListingSearchParams };
