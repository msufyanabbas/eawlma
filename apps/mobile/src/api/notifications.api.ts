import api from './client';

export const notificationsApi = {
  getAll: (params?: Record<string, any>) =>
    api.get('/notifications', { params }).then(r => r.data),

  getUnreadCount: () =>
    api.get('/notifications/unread-count').then(r => r.data),

  markRead: (id: string) =>
    api.post(`/notifications/${id}/read`).then(r => r.data),

  markAllRead: () =>
    api.post('/notifications/read-all').then(r => r.data),
};
