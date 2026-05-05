import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { NotificationChannel, NotificationType } from '@eawlma/shared-types';

import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { NotificationEntity } from './entities/notification.entity';

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
  ) {}

  async create(input: CreateNotificationInput): Promise<NotificationEntity> {
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
