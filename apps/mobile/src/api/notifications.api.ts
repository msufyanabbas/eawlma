import api from './client';

// Backend (notifications.controller.ts):
//   GET    /notifications
//   GET    /notifications/unread-count
//   PATCH  /notifications/read         body: { ids: string[] }
//   POST   /notifications/read-all
export const notificationsApi = {
  getAll: (params?: Record<string, any>) =>
    api.get('/notifications', { params }).then(r => r.data),

  getUnreadCount: () =>
    api.get('/notifications/unread-count').then(r => r.data),

  markRead: (id: string) =>
    api.patch('/notifications/read', { ids: [id] }).then(r => r.data),

  markManyRead: (ids: string[]) =>
    api.patch('/notifications/read', { ids }).then(r => r.data),

  markAllRead: () =>
    api.post('/notifications/read-all').then(r => r.data),
};
