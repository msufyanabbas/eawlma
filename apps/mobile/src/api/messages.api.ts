import api from './client';

export const messagesApi = {
  getConversations: () =>
    api.get('/conversations').then(r => r.data),

  unreadTotal: () =>
    api.get('/conversations/unread-total').then(r => r.data),

  createConversation: (data: Record<string, any>) =>
    api.post('/conversations', data).then(r => r.data),

  getMessages: (conversationId: string) =>
    api.get(`/conversations/${conversationId}/messages`).then(r => r.data),

  sendMessage: (conversationId: string, content: string) =>
    api.post(`/conversations/${conversationId}/messages`, { content }).then(r => r.data),

  markRead: (conversationId: string) =>
    api.post(`/conversations/${conversationId}/read`).then(r => r.data),

  translate: (messageId: string, targetLang: string) =>
    api.post(`/conversations/messages/${messageId}/translate`, { targetLang }).then(r => r.data),
};
