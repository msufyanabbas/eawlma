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
  // Google-Translate-detected source language (ISO 639-1). Null when
  // detection was skipped or failed; the UI then translates unconditionally.
  detectedLanguage?: string | null;
}

export interface TranslatedMessage {
  messageId: string;
  targetLang: string;
  sourceLang: string | null;
  translatedText: string;
  /** True when source==target — the body is already in the viewer's lang. */
  isOriginal: boolean;
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
