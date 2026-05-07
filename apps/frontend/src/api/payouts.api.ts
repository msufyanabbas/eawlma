import { apiClient, unwrap } from './client';

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'rejected';

export interface PayoutRequest {
  id: string;
  agentId: string;
  walletId: string;
  amount: number;
  ibanNumber: string;
  bankName: string;
  beneficiaryName: string;
  moyasarDisbursementId: string | null;
  status: PayoutStatus;
  failureReason: string | null;
  adminNotes: string | null;
  requestedAt: string;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  agentName?: string | null;
  agentEmail?: string | null;
}

export interface PayoutSummary {
  totalPaid: number;
  totalProcessing: number;
  totalFailed: number;
  countByStatus: Record<PayoutStatus, number>;
}

export interface RequestPayoutPayload {
  amount: number;
  ibanNumber: string;
  bankName: string;
}

export interface RejectPayoutPayload {
  reason: string;
  adminNotes?: string;
}

export const payoutsApi = {
  request: async (payload: RequestPayoutPayload): Promise<PayoutRequest> => {
    const { data } = await apiClient.post<{ data: PayoutRequest }>('/payouts/request', payload);
    return unwrap<PayoutRequest>(data);
  },

  my: async (): Promise<PayoutRequest[]> => {
    const { data } = await apiClient.get<{ data: PayoutRequest[] }>('/payouts/my');
    return unwrap<PayoutRequest[]>(data);
  },

  adminAll: async (status?: PayoutStatus): Promise<PayoutRequest[]> => {
    const { data } = await apiClient.get<{ data: PayoutRequest[] }>('/payouts/admin', {
      params: status ? { status } : undefined,
    });
    return unwrap<PayoutRequest[]>(data);
  },

  adminSummary: async (): Promise<PayoutSummary> => {
    const { data } = await apiClient.get<{ data: PayoutSummary }>('/payouts/admin/summary');
    return unwrap<PayoutSummary>(data);
  },

  adminReject: async (id: string, payload: RejectPayoutPayload): Promise<PayoutRequest> => {
    const { data } = await apiClient.patch<{ data: PayoutRequest }>(
      `/payouts/${id}/reject`,
      payload,
    );
    return unwrap<PayoutRequest>(data);
  },
};
