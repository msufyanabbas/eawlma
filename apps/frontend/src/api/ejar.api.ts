import { apiClient, unwrap } from './client';

export type RentalContractStatus =
  | 'draft'
  | 'pending_signatures'
  | 'active'
  | 'expired'
  | 'cancelled';

export interface RentalContract {
  id: string;
  listingId: string;
  agentId: string | null;
  landlordUserId: string;
  tenantUserId: string;
  tenantNationalId: string;
  landlordNationalId: string | null;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  annualRent: number;
  ejarContractId: string | null;
  ejarContractNumber: string | null;
  ejarUrl: string | null;
  status: RentalContractStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRentalContractPayload {
  listingId: string;
  tenantUserId: string;
  tenantNationalId: string;
  landlordNationalId?: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  annualRent: number;
}

export const ejarApi = {
  create: async (payload: CreateRentalContractPayload): Promise<RentalContract> => {
    const { data } = await apiClient.post<{ data: RentalContract }>(
      '/rental-contracts',
      payload,
    );
    return unwrap<RentalContract>(data);
  },

  my: async (): Promise<RentalContract[]> => {
    const { data } = await apiClient.get<{ data: RentalContract[] }>(
      '/rental-contracts/my',
    );
    return unwrap<RentalContract[]>(data);
  },

  getOne: async (id: string): Promise<RentalContract> => {
    const { data } = await apiClient.get<{ data: RentalContract }>(
      `/rental-contracts/${id}`,
    );
    return unwrap<RentalContract>(data);
  },

  refreshStatus: async (id: string): Promise<RentalContract> => {
    const { data } = await apiClient.get<{ data: RentalContract }>(
      `/rental-contracts/${id}/status`,
    );
    return unwrap<RentalContract>(data);
  },

  sign: async (id: string): Promise<RentalContract> => {
    const { data } = await apiClient.post<{ data: RentalContract }>(
      `/rental-contracts/${id}/sign`,
    );
    return unwrap<RentalContract>(data);
  },
};
