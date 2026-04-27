export interface Conversation {
  id: string;
  listingId: string | null;
  participantIds: string[];
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  attachmentUrls: string[];
  readBy: string[];
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface CreateConversationRequest {
  recipientId: string;
  listingId?: string;
  initialMessage: string;
}

export interface SendMessageRequest {
  conversationId: string;
  body: string;
  attachmentUrls?: string[];
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresenceEvent {
  userId: string;
  online: boolean;
  lastSeenAt: string | null;
}
