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

  // Backend SendMessageDto wants `body` (1-4000 chars). Accept either kwarg
  // name from callers and forward as `body`.
  sendMessage: (conversationId: string, body: string) =>
    api.post(`/conversations/${conversationId}/messages`, { body }).then(r => r.data),

  markRead: (conversationId: string, upToMessageId?: string) =>
    api.post(
      `/conversations/${conversationId}/read`,
      upToMessageId ? { upToMessageId } : {},
    ).then(r => r.data),

  // Translate route is GET /conversations/:id/messages/:messageId/translate
  // with the target language passed as the `target` query param.
  translate: (conversationId: string, messageId: string, target: string) =>
    api.get(
      `/conversations/${conversationId}/messages/${messageId}/translate`,
      { params: { target } },
    ).then(r => r.data),
};
