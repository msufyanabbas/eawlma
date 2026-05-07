import type { PaginatedResponse, PaginationParams } from '@eawlma/shared-types';
import { apiClient, unwrap } from './client';

export type WalletTxnType =
  | 'deposit'
  | 'withdrawal'
  | 'commission_payment'
  | 'commission_received'
  | 'refund';

export type WalletTxnStatus = 'pending' | 'completed' | 'failed';

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTxnType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  referenceId: string | null;
  status: WalletTxnStatus;
  createdAt: string;
}

export interface WalletSummary {
  wallet: Wallet;
  recentTransactions: WalletTransaction[];
}

export const walletApi = {
  me: async (): Promise<WalletSummary> => {
    const { data } = await apiClient.get<{ data: WalletSummary }>('/wallet/me');
    return unwrap<WalletSummary>(data);
  },

  transactions: async (params: PaginationParams = {}): Promise<PaginatedResponse<WalletTransaction>> => {
    const { data } = await apiClient.get<PaginatedResponse<WalletTransaction>>(
      '/wallet/transactions',
      { params },
    );
    return data;
  },

  deposit: async (amount: number, description?: string): Promise<WalletTransaction> => {
    const { data } = await apiClient.post<{ data: WalletTransaction }>('/wallet/deposit', {
      amount,
      description,
    });
    return unwrap<WalletTransaction>(data);
  },

  payCommission: async (commissionId: string): Promise<{ ok: true }> => {
    const { data } = await apiClient.post<{ data: { ok: true } }>(
      `/wallet/pay-commission/${commissionId}`,
    );
    return unwrap<{ ok: true }>(data);
  },
};
