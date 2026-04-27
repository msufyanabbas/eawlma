import { NotificationChannel, NotificationType } from './enums';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: string;
  email: Partial<Record<NotificationType, boolean>>;
  inApp: Partial<Record<NotificationType, boolean>>;
  sms: Partial<Record<NotificationType, boolean>>;
  push: Partial<Record<NotificationType, boolean>>;
}

export interface MarkNotificationReadRequest {
  ids: string[];
}
