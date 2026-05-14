import api from './client';

export const savedApi = {
  list: () =>
    api.get('/users/me/saved-listings').then(r => r.data),

  listIds: () =>
    api.get('/users/me/saved-listings/ids').then(r => r.data),

  save: (listingId: string, notes?: string) =>
    api.post(`/listings/${listingId}/save`, notes ? { notes } : {}).then(r => r.data),

  unsave: (listingId: string) =>
    api.delete(`/listings/${listingId}/save`).then(r => r.data),
};
