import { apiClient, unwrap } from './client';

/** Public-facing agent profile shape returned by GET /agents/:id. */
export interface PublicAgent {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl: string | null;
  bio: string | null;
  preferredLocale: string;
  identityVerified: boolean;
  agencyId: string | null;
  memberSince: string;
}

export const agentsApi = {
  getById: async (id: string): Promise<PublicAgent> => {
    const { data } = await apiClient.get<{ data: PublicAgent }>(`/agents/${id}`);
    return unwrap<PublicAgent>(data);
  },
};
