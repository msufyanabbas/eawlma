import api from './client';

// Backend search endpoint lives at /search/listings (the bare /listings only
// has /amenities, /tags, /mine, /:id). Search params: q, type, propertyTypes
// (comma-separated), city, district, minPrice/maxPrice, minBedrooms,
// sortField, sortOrder, page, limit, agentId, isFeatured.
export const listingsApi = {
  getAll: (params?: Record<string, any>) =>
    api.get('/search/listings', { params }).then(r => r.data),

  getById: (id: string) =>
    api.get(`/listings/${id}`).then(r => r.data),

  search: (params: Record<string, any>) =>
    api.get('/search/listings', { params }).then(r => r.data),

  getFeatured: () =>
    api.get('/search/listings', { params: { isFeatured: true, limit: 10 } }).then(r => r.data),

  getByAgent: (agentId: string, params: Record<string, any> = {}) =>
    api.get('/search/listings', { params: { ...params, agentId } }).then(r => r.data),

  create: (data: Record<string, any>) =>
    api.post('/listings', data).then(r => r.data),

  update: (id: string, data: Record<string, any>) =>
    api.patch(`/listings/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/listings/${id}`).then(r => r.data),

  getMine: () =>
    api.get('/listings/mine').then(r => r.data),
};
