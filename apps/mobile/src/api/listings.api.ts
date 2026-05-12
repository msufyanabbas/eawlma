import { apiClient } from './client';

export interface Listing {
  id: string;
  referenceCode: string;
  title: string;
  description?: string | null;
  type: 'sale' | 'rent';
  propertyType: string;
  price: number;
  city: string;
  district?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  images?: string[];
  thumbnailUrl?: string | null;
  ownerId: string;
  status: string;
  inquiryCount?: number;
  viewCount?: number;
  isFeatured?: boolean;
  isVerified?: boolean;
}

export interface ListingSearchParams {
  q?: string;
  city?: string;
  type?: 'sale' | 'rent';
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  page?: number;
  limit?: number;
}

interface PaginatedListings {
  data: Listing[];
  meta: { total: number; page: number; limit: number };
}

export const listingsApi = {
  search: async (params: ListingSearchParams = {}): Promise<PaginatedListings> => {
    const { data } = await apiClient.get<PaginatedListings>('/listings', { params });
    return data;
  },
  featured: async (): Promise<Listing[]> => {
    const { data } = await apiClient.get<{ data: Listing[] }>('/listings/featured');
    return data.data ?? [];
  },
  getById: async (id: string): Promise<Listing> => {
    const { data } = await apiClient.get<Listing>(`/listings/${id}`);
    return data;
  },
  mine: async (): Promise<Listing[]> => {
    const { data } = await apiClient.get<{ data: Listing[] }>('/listings/mine');
    return data.data ?? [];
  },
};
