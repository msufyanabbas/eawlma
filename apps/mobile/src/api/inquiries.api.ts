import api from './client';

export const inquiriesApi = {
  getMyInquiries: () =>
    api.get('/inquiries/mine').then(r => r.data),

  getMineAsAgent: () =>
    api.get('/inquiries/mine-agent').then(r => r.data),

  getMineSent: () =>
    api.get('/inquiries/mine-sent').then(r => r.data),

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
    api.post(`/inquiries/${id}/dispute`, { reason }).then(r => r.data),
};
