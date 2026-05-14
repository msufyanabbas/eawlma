import api from './client';

// Backend wallet endpoints live at /wallet/*; payouts live at /payouts/*
// (separate module).
export const walletApi = {
  getBalance: () =>
    api.get('/wallet/me').then(r => r.data),

  getTransactions: (params?: Record<string, any>) =>
    api.get('/wallet/transactions', { params }).then(r => r.data),

  deposit: (amount: number) =>
    api.post('/wallet/deposit', { amount }).then(r => r.data),

  // Payouts have their own controller — request creates a payout, /my lists
  // the current user's payouts.
  requestPayout: (data: Record<string, any>) =>
    api.post('/payouts/request', data).then(r => r.data),

  myPayouts: () =>
    api.get('/payouts/my').then(r => r.data),
};
