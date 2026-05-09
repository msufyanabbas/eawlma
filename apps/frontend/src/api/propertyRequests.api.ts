import { apiClient, unwrap } from './client';

export type PropertyRequestStatus = 'open' | 'matched' | 'closed';

export interface PropertyRequest {
  id: string;
  userId: string | null;
  propertyType: string;
  city: string;
  minBudget: number | null;
  maxBudget: number | null;
  bedrooms: number | null;
  message: string | null;
  contactPhone: string;
  contactEmail: string | null;
  status: PropertyRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePropertyRequestPayload {
  propertyType: string;
  city: string;
  minBudget?: number;
  maxBudget?: number;
  bedrooms?: number;
  message?: string;
  contactPhone: string;
  contactEmail?: string;
}

export const propertyRequestsApi = {
  create: async (
    payload: CreatePropertyRequestPayload,
  ): Promise<PropertyRequest> => {
    const { data } = await apiClient.post<{ data: PropertyRequest }>(
      '/property-requests',
      payload,
    );
    return unwrap<PropertyRequest>(data);
  },

  mine: async (): Promise<PropertyRequest[]> => {
    const { data } = await apiClient.get<{ data: PropertyRequest[] }>(
      '/property-requests/mine',
    );
    return unwrap<PropertyRequest[]>(data);
  },

  adminAll: async (status?: PropertyRequestStatus): Promise<PropertyRequest[]> => {
    const { data } = await apiClient.get<{ data: PropertyRequest[] }>(
      '/property-requests/admin',
      { params: status ? { status } : undefined },
    );
    return unwrap<PropertyRequest[]>(data);
  },

  adminUpdateStatus: async (
    id: string,
    status: PropertyRequestStatus,
  ): Promise<PropertyRequest> => {
    const { data } = await apiClient.patch<{ data: PropertyRequest }>(
      `/property-requests/${id}/status`,
      { status },
    );
    return unwrap<PropertyRequest>(data);
  },
};
