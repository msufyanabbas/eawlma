import type {
  Notification,
  PaginatedResponse,
  PaginationParams,
} from '@eawlma/shared-types';
import { apiClient, unwrap } from './client';

export const notificationsApi = {
  list: async (
    params: PaginationParams & { unread?: boolean } = {},
  ): Promise<PaginatedResponse<Notification>> => {
    const { data } = await apiClient.get<PaginatedResponse<Notification>>('/notifications', {
      params: {
        page: params.page,
        limit: params.limit,
        unread: params.unread ? 'true' : undefined,
      },
    });
    return data;
  },

  unreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get<{ data: { count: number } }>(
      '/notifications/unread-count',
    );
    return unwrap<{ count: number }>(data).count;
  },

  markRead: async (ids: string[]): Promise<{ updated: number }> => {
    const { data } = await apiClient.patch<{ data: { updated: number } }>(
      '/notifications/read',
      { ids },
    );
    return unwrap<{ updated: number }>(data);
  },

  markAllRead: async (): Promise<{ updated: number }> => {
    const { data } = await apiClient.post<{ data: { updated: number } }>(
      '/notifications/read-all',
    );
    return unwrap<{ updated: number }>(data);
  },
};
