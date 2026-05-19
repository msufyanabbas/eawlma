import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DeviceTokenEntity, DevicePlatform } from './entities/device-token.entity';

// We talk to Expo's push notification service directly. For builds that
// haven't moved to FCM/APNs yet — i.e. development builds + Expo Go — this
// is the only viable path. For production EAS builds, Expo still proxies to
// FCM/APNs so the surface stays the same.
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
  sound?: 'default' | null;
  channelId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  badge?: number;
  sound?: 'default' | null;
  channelId: string;
  priority: 'high' | 'default';
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(DeviceTokenEntity)
    private readonly deviceTokens: Repository<DeviceTokenEntity>,
  ) {}

  // ---------------------------------------------------------------------------
  // Token lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Idempotent upsert keyed on the token string (which is unique server-side).
   * A previously-deactivated token re-registers cleanly because we set
   * isActive: true on conflict.
   */
  async registerToken(
    userId: string,
    token: string,
    platform: DevicePlatform,
    deviceModel?: string | null,
  ): Promise<void> {
    await this.deviceTokens.upsert(
      {
        userId,
        token,
        platform,
        deviceModel: deviceModel ?? null,
        isActive: true,
      },
      { conflictPaths: ['token'] },
    );
  }

  async unregisterToken(token: string): Promise<void> {
    // Soft-disable rather than delete so we keep the audit trail of which
    // devices a user signed in from. The partial index on is_active = true
    // means inactive rows don't cost anything at query time.
    await this.deviceTokens.update({ token }, { isActive: false });
  }

  // ---------------------------------------------------------------------------
  // Send
  // ---------------------------------------------------------------------------

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const tokens = await this.deviceTokens.find({
      where: { userId, isActive: true },
    });
    if (tokens.length === 0) {
      this.logger.debug(`No active push tokens for user ${userId}`);
      return;
    }

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      badge: payload.badge,
      sound: payload.sound === undefined ? 'default' : payload.sound,
      channelId: payload.channelId ?? 'default',
      priority: 'high',
    }));

    await this.dispatch(messages);
  }

  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    // Sequential rather than Promise.all so a slow Expo endpoint doesn't
    // burst hundreds of concurrent HTTP requests when an admin broadcast
    // touches a large audience. The body of the loop is still I/O-bound.
    for (const id of userIds) {
      await this.sendToUser(id, payload);
    }
  }

  /**
   * Single HTTP POST to Expo with the batched message array. Failures are
   * swallowed and logged — push must never block the in-app notification
   * write path that called us.
   */
  private async dispatch(messages: ExpoPushMessage[]): Promise<void> {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const body = (await response.json()) as { data?: ExpoPushTicket[] };
      if (!Array.isArray(body.data)) {
        this.logger.warn(`Unexpected Expo push response shape: ${JSON.stringify(body)}`);
        return;
      }

      // Deactivate tokens that Expo says are no longer registered (uninstall,
      // user revoked permission, etc.) so we stop attempting them.
      for (let i = 0; i < body.data.length; i++) {
        const ticket = body.data[i];
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          await this.deviceTokens.update({ token: messages[i].to }, { isActive: false });
        }
      }

      this.logger.debug(`Push: sent ${messages.length} messages`);
    } catch (err) {
      this.logger.error(`Push dispatch failed: ${(err as Error).message}`);
    }
  }
}
