import api from './client';

export const listingsApi = {
  getAll: (params?: Record<string, any>) =>
    api.get('/listings', { params }).then(r => r.data),

  getById: (id: string) =>
    api.get(`/listings/${id}`).then(r => r.data),

  search: (params: Record<string, any>) =>
    api.get('/listings', { params }).then(r => r.data),

  getFeatured: () =>
    api.get('/listings?isFeatured=true&limit=10').then(r => r.data),

  create: (data: Record<string, any>) =>
    api.post('/listings', data).then(r => r.data),

  update: (id: string, data: Record<string, any>) =>
    api.patch(`/listings/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/listings/${id}`).then(r => r.data),

  getMine: () =>
    api.get('/listings/mine').then(r => r.data),
};
