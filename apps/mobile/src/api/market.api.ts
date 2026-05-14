import api from './client';

export const marketApi = {
  trends: (city = 'Riyadh', type = 'apartment') =>
    api.get('/price-trends', { params: { city, type } }).then(r => r.data),

  areaInsights: (city = 'Riyadh') =>
    api.get('/price-trends/area-insights', { params: { city } }).then(r => r.data),
};
