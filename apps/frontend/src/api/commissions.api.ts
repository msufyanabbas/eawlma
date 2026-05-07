import { apiClient, unwrap } from './client';

export type CommissionStatus = 'pending' | 'confirmed' | 'paid' | 'disputed';
export type OathType = 'agent_listing' | 'buyer_purchase';

export interface Commission {
  id: string;
  listingId: string;
  agentId: string;
  buyerId: string | null;
  transactionValue: number;
  agentCommissionRate: number;
  platformCommissionRate: number;
  agentCommissionAmount: number;
  platformCommissionAmount: number;
  status: CommissionStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Optional joined fields populated by list endpoints so the UI can show
  // human names instead of raw UUIDs.
  listingTitle?: string | null;
  listingReferenceCode?: string | null;
  agentName?: string | null;
  buyerName?: string | null;
}

export interface CommissionSummary {
  totalPlatformRevenue: number;
  totalAgentCommissions: number;
  totalTransactions: number;
  byStatus: Record<CommissionStatus, number>;
  byMonth: Array<{ month: string; platform: number; agent: number; count: number }>;
}

export interface OathRecord {
  id: string;
  userId: string;
  oathType: OathType;
  oathText: string;
  acceptedAt: string;
  listingId: string | null;
}

export const commissionsApi = {
  acceptOath: async (payload: {
    oathType: OathType;
    oathText: string;
    listingId?: string;
  }): Promise<OathRecord> => {
    const { data } = await apiClient.post<{ data: OathRecord }>('/commissions/oath', payload);
    return unwrap<OathRecord>(data);
  },

  hasAcceptedOath: async (oathType: OathType): Promise<boolean> => {
    const { data } = await apiClient.get<{ data: { accepted: boolean } }>(
      `/commissions/oath/${oathType}`,
    );
    const unwrapped = unwrap<{ accepted: boolean }>(data);
    return unwrapped.accepted;
  },

  myCommissions: async (): Promise<Commission[]> => {
    const { data } = await apiClient.get<{ data: Commission[] }>('/commissions/my');
    return unwrap<Commission[]>(data);
  },

  /** Buyer-side view: commissions the current authenticated user owes. */
  myAsBuyer: async (): Promise<Commission[]> => {
    const { data } = await apiClient.get<{ data: Commission[] }>('/commissions/buyer/me');
    return unwrap<Commission[]>(data);
  },

  adminAll: async (): Promise<Commission[]> => {
    const { data } = await apiClient.get<{ data: Commission[] }>('/commissions/admin');
    return unwrap<Commission[]>(data);
  },

  adminSummary: async (): Promise<CommissionSummary> => {
    const { data } = await apiClient.get<{ data: CommissionSummary }>('/commissions/admin/summary');
    return unwrap<CommissionSummary>(data);
  },

  adminUpdateStatus: async (
    id: string,
    payload: { status: CommissionStatus; notes?: string },
  ): Promise<Commission> => {
    const { data } = await apiClient.patch<{ data: Commission }>(
      `/commissions/${id}/status`,
      payload,
    );
    return unwrap<Commission>(data);
  },
};
