import { apiClient, unwrap } from './client';

export type DufaatPlanStatus = 'active' | 'completed' | 'defaulted' | 'cancelled';
export type DufaatInstallmentStatus = 'pending' | 'paid' | 'overdue' | 'waived';

export interface DufaatInstallment {
  id: string;
  planId: string;
  dueDate: string;
  amount: number;
  paidAt: string | null;
  status: DufaatInstallmentStatus;
}

export interface DufaatPlan {
  id: string;
  rentalContractId: string;
  tenantId: string;
  landlordId: string;
  totalAnnualAmount: number;
  monthlyInstallment: number;
  platformFeeRate: number;
  platformFee: number;
  status: DufaatPlanStatus;
  startDate: string;
  endDate: string;
  installments: DufaatInstallment[];
  createdAt: string;
  updatedAt: string;
}

export const dufaatApi = {
  createPlan: async (rentalContractId: string): Promise<DufaatPlan> => {
    const { data } = await apiClient.post<{ data: DufaatPlan }>('/dufaat/plans', {
      rentalContractId,
    });
    return unwrap<DufaatPlan>(data);
  },
  myPlans: async (): Promise<DufaatPlan[]> => {
    const { data } = await apiClient.get<{ data: DufaatPlan[] }>('/dufaat/plans/my');
    return unwrap<DufaatPlan[]>(data);
  },
  landlordPlans: async (): Promise<DufaatPlan[]> => {
    const { data } = await apiClient.get<{ data: DufaatPlan[] }>(
      '/dufaat/plans/landlord',
    );
    return unwrap<DufaatPlan[]>(data);
  },
  payInstallment: async (id: string): Promise<DufaatInstallment> => {
    const { data } = await apiClient.post<{ data: DufaatInstallment }>(
      `/dufaat/installments/${id}/pay`,
    );
    return unwrap<DufaatInstallment>(data);
  },
};
