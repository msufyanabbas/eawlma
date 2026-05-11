import type {
  AdminResolveDisputeRequest,
  CloseInquiryDealRequest,
  CreateInquiryRequest,
  Inquiry,
  PaginatedResponse,
  PaginationParams,
  RaiseDisputeRequest,
  UpdateInquiryRequest,
} from '@eawlma/shared-types';
import { apiClient, unwrap } from './client';

export const inquiriesApi = {
  create: async (payload: CreateInquiryRequest): Promise<Inquiry> => {
    const { data } = await apiClient.post<{ data: Inquiry }>('/inquiries', payload);
    return unwrap<Inquiry>(data);
  },

  mineAsAgent: async (params: PaginationParams = {}): Promise<PaginatedResponse<Inquiry>> => {
    const { data } = await apiClient.get<PaginatedResponse<Inquiry>>('/inquiries/mine', {
      params,
    });
    return data;
  },

  mineSent: async (params: PaginationParams = {}): Promise<PaginatedResponse<Inquiry>> => {
    const { data } = await apiClient.get<PaginatedResponse<Inquiry>>('/inquiries/sent', {
      params,
    });
    return data;
  },

  getById: async (id: string): Promise<Inquiry> => {
    const { data } = await apiClient.get<{ data: Inquiry }>(`/inquiries/${id}`);
    return unwrap<Inquiry>(data);
  },

  update: async (id: string, payload: UpdateInquiryRequest): Promise<Inquiry> => {
    const { data } = await apiClient.patch<{ data: Inquiry }>(`/inquiries/${id}`, payload);
    return unwrap<Inquiry>(data);
  },

  closeDeal: async (id: string, payload: CloseInquiryDealRequest): Promise<Inquiry> => {
    const { data } = await apiClient.post<{ data: Inquiry }>(`/inquiries/${id}/close-deal`, payload);
    return unwrap<Inquiry>(data);
  },

  confirmDeal: async (id: string): Promise<Inquiry> => {
    const { data } = await apiClient.post<{ data: Inquiry }>(`/inquiries/${id}/confirm-deal`);
    return unwrap<Inquiry>(data);
  },

  raiseDispute: async (id: string, payload: RaiseDisputeRequest): Promise<Inquiry> => {
    const { data } = await apiClient.post<{ data: Inquiry }>(`/inquiries/${id}/raise-dispute`, payload);
    return unwrap<Inquiry>(data);
  },

  adminListDisputes: async (): Promise<Inquiry[]> => {
    const { data } = await apiClient.get<{ data: Inquiry[] }>('/inquiries/admin/disputes');
    return data.data;
  },

  adminCountDisputes: async (): Promise<number> => {
    const { data } = await apiClient.get<{ count: number }>('/inquiries/admin/disputes/count');
    return data.count;
  },

  adminResolveDispute: async (
    id: string,
    payload: AdminResolveDisputeRequest,
  ): Promise<Inquiry> => {
    const { data } = await apiClient.post<{ data: Inquiry }>(`/inquiries/${id}/admin-resolve`, payload);
    return unwrap<Inquiry>(data);
  },
};
