import api from './client';

export const walletApi = {
  getBalance: () =>
    api.get('/wallet/me').then(r => r.data),

  getTransactions: (params?: Record<string, any>) =>
    api.get('/wallet/transactions', { params }).then(r => r.data),

  deposit: (amount: number) =>
    api.post('/wallet/deposit', { amount }).then(r => r.data),

  requestPayout: (data: Record<string, any>) =>
    api.post('/wallet/payout', data).then(r => r.data),
};
