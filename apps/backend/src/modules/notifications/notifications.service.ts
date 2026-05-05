import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { NotificationChannel, NotificationType } from '@eawlma/shared-types';

import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { NotificationEntity } from './entities/notification.entity';
import { UserEntity } from '../users/entities/user.entity';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  channel?: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifications: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  /**
   * Persists a notification — but only if the recipient has not opted out
   * of this NotificationType in their `notificationPreferences` map. A
   * missing key is treated as opted-in so we don't accidentally suppress
   * notifications for users who never visited Settings.
   */
  async create(input: CreateNotificationInput): Promise<NotificationEntity | null> {
    if (!(await this.userAllowsType(input.userId, input.type))) {
      this.logger.debug(`Skipping ${input.type} for ${input.userId} (opted out)`);
      return null;
    }
    const entity = this.notifications.create({
      userId: input.userId,
      type: input.type,
      channel: input.channel ?? NotificationChannel.IN_APP,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
    });
    return this.notifications.save(entity);
  }

  private async userAllowsType(userId: string, type: NotificationType): Promise<boolean> {
    const user = await this.users.findOne({
      where: { id: userId },
      select: { id: true, notificationPreferences: true },
    });
    if (!user) return true; // If user is gone, fail open — the row will FK-fail anyway.
    const prefs = user.notificationPreferences;
    if (!prefs) return true;
    // Explicit opt-out only when the value is exactly `false`.
    return prefs[type] !== false;
  }

  async paginate(
    userId: string,
    page: number,
    limit: number,
    onlyUnread = false,
  ): Promise<PaginatedResultDto<NotificationEntity>> {
    const where = onlyUnread ? { userId, readAt: IsNull() } : { userId };
    const [data, total] = await this.notifications.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return new PaginatedResultDto(data, total, page, limit);
  }

  async unreadCount(userId: string): Promise<number> {
    return this.notifications.count({ where: { userId, readAt: IsNull() } });
  }

  async markRead(userId: string, ids: string[]): Promise<number> {
    const result = await this.notifications.update(
      { userId, id: In(ids), readAt: IsNull() },
      { readAt: new Date() },
    );
    return result.affected ?? 0;
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.notifications.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return result.affected ?? 0;
  }
}
