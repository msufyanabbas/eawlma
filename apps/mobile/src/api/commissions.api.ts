import api from './client';

// Backend (commissions.controller.ts):
//   POST  /commissions/oath
//   GET   /commissions/oath/:oathType
//   GET   /commissions/my            — agent's commission history
//   GET   /commissions/buyer/me      — buyer-side commissions
export const commissionsApi = {
  myCommissions: () =>
    api.get('/commissions/my').then(r => r.data),

  myAsBuyer: () =>
    api.get('/commissions/buyer/me').then(r => r.data),

  acceptOath: (oathType: 'agent_listing' | 'buyer_purchase') =>
    api.post('/commissions/oath', { oathType }).then(r => r.data),

  hasAcceptedOath: (oathType: 'agent_listing' | 'buyer_purchase') =>
    api.get(`/commissions/oath/${oathType}`).then(r => r.data),
};
