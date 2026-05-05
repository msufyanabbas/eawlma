import type { Listing } from '@eawlma/shared-types';
import { apiClient, unwrap } from './client';

export const savedApi = {
  /** Idempotent. Returns the saved row id + listingId. */
  save: async (listingId: string, notes?: string): Promise<{ id: string; listingId: string }> => {
    const { data } = await apiClient.post<{ data: { id: string; listingId: string } }>(
      `/listings/${listingId}/save`,
      notes ? { notes } : {},
    );
    return unwrap<{ id: string; listingId: string }>(data);
  },

  unsave: async (listingId: string): Promise<void> => {
    await apiClient.delete(`/listings/${listingId}/save`);
  },

  mineIds: async (): Promise<string[]> => {
    const { data } = await apiClient.get<{ data: { ids: string[] } }>(
      '/users/me/saved-listings/ids',
    );
    return unwrap<{ ids: string[] }>(data).ids;
  },

  mine: async (): Promise<Listing[]> => {
    const { data } = await apiClient.get<{ data: Listing[] }>('/users/me/saved-listings');
    return unwrap<Listing[]>(data);
  },
};
