import api from './client';

export const commissionsApi = {
  myCommissions: (params?: Record<string, any>) =>
    api.get('/commissions/my', { params }).then(r => r.data),

  myAsBuyer: (params?: Record<string, any>) =>
    api.get('/commissions/my-buyer', { params }).then(r => r.data),

  acceptOath: () =>
    api.post('/commissions/oath').then(r => r.data),

  hasAcceptedOath: () =>
    api.get('/commissions/oath').then(r => r.data),
};
