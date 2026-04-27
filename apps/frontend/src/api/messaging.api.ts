import type {
  Conversation,
  CreateConversationRequest,
  Message,
  PaginatedResponse,
  PaginationParams,
  SendMessageRequest,
} from '@aqarat/shared-types';
import { apiClient, unwrap } from './client';

export const messagingApi = {
  list: async (params: PaginationParams = {}): Promise<PaginatedResponse<Conversation>> => {
    const { data } = await apiClient.get<PaginatedResponse<Conversation>>('/conversations', {
      params,
    });
    return data;
  },

  unreadTotal: async (): Promise<number> => {
    const { data } = await apiClient.get<{ data: { count: number } }>(
      '/conversations/unread-total',
    );
    return unwrap<{ count: number }>(data).count;
  },

  create: async (
    payload: CreateConversationRequest,
  ): Promise<{ conversation: Conversation; message: Message }> => {
    const { data } = await apiClient.post<{ data: { conversation: Conversation; message: Message } }>(
      '/conversations',
      payload,
    );
    return unwrap<{ conversation: Conversation; message: Message }>(data);
  },

  messages: async (
    conversationId: string,
    params: PaginationParams = {},
  ): Promise<PaginatedResponse<Message>> => {
    const { data } = await apiClient.get<PaginatedResponse<Message>>(
      `/conversations/${conversationId}/messages`,
      { params },
    );
    return data;
  },

  send: async (payload: SendMessageRequest): Promise<Message> => {
    const { data } = await apiClient.post<{ data: Message }>(
      `/conversations/${payload.conversationId}/messages`,
      { body: payload.body, attachmentUrls: payload.attachmentUrls },
    );
    return unwrap<Message>(data);
  },

  markRead: async (
    conversationId: string,
    upToMessageId?: string,
  ): Promise<{ updated: number }> => {
    const { data } = await apiClient.post<{ data: { updated: number } }>(
      `/conversations/${conversationId}/read`,
      upToMessageId ? { upToMessageId } : {},
    );
    return unwrap<{ updated: number }>(data);
  },
};
