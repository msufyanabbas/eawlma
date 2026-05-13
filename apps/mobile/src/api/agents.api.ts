import api from './client';

export const agentsApi = {
  getAll: (params?: Record<string, any>) =>
    api.get('/agents', { params }).then(r => r.data),

  getById: (id: string) =>
    api.get(`/agents/${id}`).then(r => r.data),

  getListings: (agentId: string, params?: Record<string, any>) =>
    api.get(`/agents/${agentId}/listings`, { params }).then(r => r.data),

  getHostStats: (agentId: string) =>
    api.get(`/agents/${agentId}/host-stats`).then(r => r.data),
};
