import api from './client';

// The backend only exposes per-agent profile endpoints — there is no public
// `GET /agents` directory route. The web app handles this by harvesting owner
// IDs from recent listings and resolving each one via `/agents/:id`; mobile
// does the same in AgentsListScreen.
export const agentsApi = {
  getById: (id: string) =>
    api.get(`/agents/${id}`).then(r => r.data),

  getListings: (agentId: string, params?: Record<string, any>) =>
    api.get(`/agents/${agentId}/listings`, { params }).then(r => r.data),

  getHostStats: (agentId: string) =>
    api.get(`/agents/${agentId}/host-stats`).then(r => r.data),
};
