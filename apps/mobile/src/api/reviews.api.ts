import api from './client';

// Reviews controller mounts under listings/:id/reviews and agents/:id/reviews
export const reviewsApi = {
  listForListing: (listingId: string) =>
    api.get(`/listings/${listingId}/reviews`).then(r => r.data),

  listForAgent: (agentId: string) =>
    api.get(`/agents/${agentId}/reviews`).then(r => r.data),

  createForListing: (listingId: string, body: { rating: number; comment?: string }) =>
    api.post(`/reviews/listings/${listingId}`, body).then(r => r.data),

  createForAgent: (agentId: string, body: { rating: number; comment?: string }) =>
    api.post(`/agents/${agentId}/reviews`, body).then(r => r.data),

  reply: (reviewId: string, reply: string) =>
    api.patch(`/reviews/${reviewId}/reply`, { reply }).then(r => r.data),
};
