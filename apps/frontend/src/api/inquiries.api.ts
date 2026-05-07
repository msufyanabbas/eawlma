import type {
  CloseInquiryDealRequest,
  CreateInquiryRequest,
  Inquiry,
  PaginatedResponse,
  PaginationParams,
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
};
