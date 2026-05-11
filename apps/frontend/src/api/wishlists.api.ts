import type { Listing } from '@eawlma/shared-types';
import { apiClient, unwrap } from './client';

export interface WishlistSummary {
  id: string;
  name: string;
  emoji: string | null;
  isDefault: boolean;
  itemCount: number;
  listingIds: string[];
  createdAt: string;
}

export const wishlistsApi = {
  mine: async (): Promise<WishlistSummary[]> => {
    const { data } = await apiClient.get<{ data: WishlistSummary[] }>('/wishlists/my');
    return unwrap<WishlistSummary[]>(data);
  },

  create: async (name: string, emoji?: string): Promise<WishlistSummary> => {
    const { data } = await apiClient.post<{ data: WishlistSummary }>(
      '/wishlists',
      { name, emoji },
    );
    return unwrap<WishlistSummary>(data);
  },

  rename: async (id: string, name: string, emoji?: string): Promise<WishlistSummary> => {
    const { data } = await apiClient.patch<{ data: WishlistSummary }>(
      `/wishlists/${id}`,
      { name, emoji },
    );
    return unwrap<WishlistSummary>(data);
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/wishlists/${id}`);
  },

  addItem: async (id: string, listingId: string): Promise<void> => {
    await apiClient.post(`/wishlists/${id}/items`, { listingId });
  },

  removeItem: async (id: string, listingId: string): Promise<void> => {
    await apiClient.delete(`/wishlists/${id}/items/${listingId}`);
  },

  items: async (id: string): Promise<Listing[]> => {
    const { data } = await apiClient.get<{ data: Listing[] }>(`/wishlists/${id}/items`);
    return unwrap<Listing[]>(data);
  },
};
