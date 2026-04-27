import type {
  Amenity,
  CreateListingRequest,
  Listing,
  ListingMedia,
  ListingMediaUploadRequest,
  ListingTranslation,
  PaginatedResponse,
  PaginationParams,
  Tag,
  UpdateListingRequest,
} from '@aqarat/shared-types';
import { apiClient, unwrap } from './client';

export const listingsApi = {
  amenities: async (): Promise<Amenity[]> => {
    const { data } = await apiClient.get<{ data: Amenity[] }>('/listings/amenities');
    return unwrap<Amenity[]>(data);
  },

  tags: async (): Promise<Tag[]> => {
    const { data } = await apiClient.get<{ data: Tag[] }>('/listings/tags');
    return unwrap<Tag[]>(data);
  },

  getById: async (id: string): Promise<Listing> => {
    const { data } = await apiClient.get<{ data: Listing }>(`/listings/${id}`);
    return unwrap<Listing>(data);
  },

  mine: async (params: PaginationParams = {}): Promise<PaginatedResponse<Listing>> => {
    const { data } = await apiClient.get<PaginatedResponse<Listing>>('/listings/mine', {
      params,
    });
    return data;
  },

  create: async (payload: CreateListingRequest): Promise<Listing> => {
    const { data } = await apiClient.post<{ data: Listing }>('/listings', payload);
    return unwrap<Listing>(data);
  },

  update: async (id: string, payload: UpdateListingRequest): Promise<Listing> => {
    const { data } = await apiClient.patch<{ data: Listing }>(`/listings/${id}`, payload);
    return unwrap<Listing>(data);
  },

  submit: async (id: string): Promise<Listing> => {
    const { data } = await apiClient.post<{ data: Listing }>(`/listings/${id}/submit`);
    return unwrap<Listing>(data);
  },

  archive: async (id: string): Promise<void> => {
    await apiClient.post(`/listings/${id}/archive`);
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/listings/${id}`);
  },

  addMedia: async (
    id: string,
    payload: ListingMediaUploadRequest,
  ): Promise<ListingMedia> => {
    const { data } = await apiClient.post<{ data: ListingMedia }>(
      `/listings/${id}/media`,
      payload,
    );
    return unwrap<ListingMedia>(data);
  },

  removeMedia: async (id: string, mediaId: string): Promise<void> => {
    await apiClient.delete(`/listings/${id}/media/${mediaId}`);
  },

  reorderMedia: async (id: string, mediaIds: string[]): Promise<ListingMedia[]> => {
    const { data } = await apiClient.patch<{ data: ListingMedia[] }>(
      `/listings/${id}/media/reorder`,
      { mediaIds },
    );
    return unwrap<ListingMedia[]>(data);
  },

  upsertTranslation: async (
    id: string,
    locale: string,
    title: string,
    description: string,
  ): Promise<ListingTranslation> => {
    const { data } = await apiClient.post<{ data: ListingTranslation }>(
      `/listings/${id}/translations`,
      { locale, title, description },
    );
    return unwrap<ListingTranslation>(data);
  },

  removeTranslation: async (id: string, translationId: string): Promise<void> => {
    await apiClient.delete(`/listings/${id}/translations/${translationId}`);
  },
};
