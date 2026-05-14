import api from './client';

// Backend mounts the messaging controller at `/conversations` and the
// unread-total endpoint is `/conversations/unread-total` (NOT `unread-count`).
export const messagesApi = {
  getConversations: () =>
    api.get('/conversations').then(r => r.data),

  unreadTotal: () =>
    api.get('/conversations/unread-total').then(r => r.data),

  createConversation: (data: Record<string, any>) =>
    api.post('/conversations', data).then(r => r.data),

  startConversation: (recipientId: string, listingId: string, message: string) =>
    api.post('/conversations', { recipientId, listingId, initialMessage: message }).then(r => r.data),

  getMessages: (conversationId: string) =>
    api.get(`/conversations/${conversationId}/messages`).then(r => r.data),

  sendMessage: (conversationId: string, content: string) =>
    api.post(`/conversations/${conversationId}/messages`, { content }).then(r => r.data),

  markRead: (conversationId: string) =>
    api.post(`/conversations/${conversationId}/read`).then(r => r.data),

  translate: (messageId: string, targetLang: string) =>
    api.get(`/conversations/messages/${messageId}/translate?targetLang=${encodeURIComponent(targetLang)}`).then(r => r.data),
};
