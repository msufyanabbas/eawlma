import type {
  Listing,
  PaginatedResponse,
  PaginationParams,
  User,
  UserRole,
  UserStatus,
} from '@aqarat/shared-types';
import { apiClient, unwrap } from './client';

interface UsersFilter extends PaginationParams {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

export const adminApi = {
  // ---- Listings moderation ------------------------------------------------

  pendingListings: async (
    params: PaginationParams = {},
  ): Promise<PaginatedResponse<Listing>> => {
    const { data } = await apiClient.get<PaginatedResponse<Listing>>(
      '/admin/listings/pending',
      { params },
    );
    return data;
  },

  approveListing: async (id: string, internalNote?: string): Promise<Listing> => {
    const { data } = await apiClient.post<{ data: Listing }>(
      `/admin/listings/${id}/approve`,
      internalNote ? { internalNote } : {},
    );
    return unwrap<Listing>(data);
  },

  rejectListing: async (
    id: string,
    reason: string,
    internalNote?: string,
  ): Promise<Listing> => {
    const { data } = await apiClient.post<{ data: Listing }>(
      `/admin/listings/${id}/reject`,
      { reason, internalNote },
    );
    return unwrap<Listing>(data);
  },

  // ---- Users --------------------------------------------------------------

  users: async (filter: UsersFilter = {}): Promise<PaginatedResponse<User>> => {
    const { data } = await apiClient.get<PaginatedResponse<User>>('/admin/users', {
      params: filter,
    });
    return data;
  },

  setRole: async (id: string, role: UserRole): Promise<User> => {
    const { data } = await apiClient.patch<{ data: User }>(`/admin/users/${id}/role`, {
      role,
    });
    return unwrap<User>(data);
  },

  suspend: async (id: string, reason: string): Promise<User> => {
    const { data } = await apiClient.patch<{ data: User }>(`/admin/users/${id}/suspend`, {
      reason,
    });
    return unwrap<User>(data);
  },

  reactivate: async (id: string): Promise<User> => {
    const { data } = await apiClient.patch<{ data: User }>(`/admin/users/${id}/reactivate`);
    return unwrap<User>(data);
  },

  // ---- Audit --------------------------------------------------------------

  audit: async (params: {
    page?: number;
    limit?: number;
    entityType?: string;
    entityId?: string;
    action?: string;
    actorId?: string;
    search?: string;
    from?: string;
    to?: string;
  } = {}) => {
    const { data } = await apiClient.get('/admin/audit', { params });
    return data;
  },

  auditCsvUrl: (params: Record<string, string | undefined> = {}): string => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) search.set(k, v);
    }
    const qs = search.toString();
    return `/admin/audit/export.csv${qs ? `?${qs}` : ''}`;
  },
};
