import { apiClient, unwrap } from './client';

export interface ReviewerSnapshot {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Review {
  id: string;
  agentId: string;
  reviewerId: string;
  reviewer: ReviewerSnapshot | null;
  listingId: string | null;
  rating: number;
  comment: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  reviews: Review[];
}

export const reviewsApi = {
  forAgent: async (agentId: string, page = 1, limit = 20): Promise<ReviewSummary> => {
    const { data } = await apiClient.get<{ data: ReviewSummary }>(`/agents/${agentId}/reviews`, {
      params: { page, limit },
    });
    return unwrap<ReviewSummary>(data);
  },

  create: async (
    agentId: string,
    payload: { rating: number; comment: string; listingId?: string },
  ): Promise<Review> => {
    const { data } = await apiClient.post<{ data: Review }>(`/agents/${agentId}/reviews`, payload);
    return unwrap<Review>(data);
  },

  reply: async (reviewId: string, reply: string): Promise<Review> => {
    const { data } = await apiClient.patch<{ data: Review }>(`/reviews/${reviewId}/reply`, { reply });
    return unwrap<Review>(data);
  },
};
