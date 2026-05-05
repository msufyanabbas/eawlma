import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';
import { NotificationChannel, NotificationType } from '@eawlma/shared-types';
import { NotificationEntity } from '../entities/notification.entity';

export class MarkNotificationsReadDto {
  @ApiProperty({ type: [String], description: 'Notification IDs to mark as read' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids: string[];
}

export class NotificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: NotificationType }) type: NotificationType;
  @ApiProperty({ enum: NotificationChannel }) channel: NotificationChannel;
  @ApiProperty() title: string;
  @ApiProperty() body: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) data: Record<string, unknown>;
  @ApiPropertyOptional({ type: String, nullable: true }) readAt: Date | null;
  @ApiProperty({ type: String }) createdAt: Date;

  static fromEntity(n: NotificationEntity): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = n.id;
    dto.userId = n.userId;
    dto.type = n.type;
    dto.channel = n.channel;
    dto.title = n.title;
    dto.body = n.body;
    dto.data = n.data ?? {};
    dto.readAt = n.readAt;
    dto.createdAt = n.createdAt;
    return dto;
  }
}
