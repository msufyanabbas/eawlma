import api from './client';

// Backend endpoints (apps/backend/src/modules/inquiries/inquiries.controller.ts):
//   GET    /inquiries/mine          — agent view (inquiries on listings the agent owns)
//   GET    /inquiries/sent          — user view (inquiries the user has sent)
//   GET    /inquiries/:id
//   POST   /inquiries
//   PATCH  /inquiries/:id
//   POST   /inquiries/:id/close-deal
//   POST   /inquiries/:id/confirm-deal
//   POST   /inquiries/:id/raise-dispute
export const inquiriesApi = {
  getMyInquiries: () =>
    api.get('/inquiries/mine').then(r => r.data),

  getMineAsAgent: () =>
    api.get('/inquiries/mine').then(r => r.data),

  getMineSent: () =>
    api.get('/inquiries/sent').then(r => r.data),

  getById: (id: string) =>
    api.get(`/inquiries/${id}`).then(r => r.data),

  createInquiry: (data: Record<string, any>) =>
    api.post('/inquiries', data).then(r => r.data),

  updateStatus: (id: string, status: string) =>
    api.patch(`/inquiries/${id}`, { status }).then(r => r.data),

  closeDeal: (id: string, data: Record<string, any>) =>
    api.post(`/inquiries/${id}/close-deal`, data).then(r => r.data),

  confirmDeal: (id: string) =>
    api.post(`/inquiries/${id}/confirm-deal`).then(r => r.data),

  raiseDispute: (id: string, reason: string) =>
    api.post(`/inquiries/${id}/raise-dispute`, { reason }).then(r => r.data),
};
