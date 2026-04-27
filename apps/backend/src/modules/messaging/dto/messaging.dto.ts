import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';
import { ConversationEntity } from '../entities/conversation.entity';
import { MessageEntity } from '../entities/message.entity';

export class CreateConversationDto {
  @ApiProperty({ description: 'The other participant (e.g. the agent for a listing)' })
  @IsUUID('4')
  recipientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  listingId?: string;

  @ApiProperty()
  @IsString()
  @Length(1, 4000)
  initialMessage: string;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  @Length(1, 4000)
  body: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { each: true })
  attachmentUrls?: string[];
}

export class TypingPayloadDto {
  @ApiProperty()
  @IsUUID('4')
  conversationId: string;

  @ApiProperty()
  @IsBoolean()
  isTyping: boolean;
}

export class JoinConversationPayloadDto {
  @ApiProperty()
  @IsUUID('4')
  conversationId: string;
}

export class MarkAsReadPayloadDto {
  @ApiProperty()
  @IsUUID('4')
  conversationId: string;

  @ApiPropertyOptional({
    description: 'Optional — if provided, mark up to and including this message; otherwise mark all unread.',
  })
  @IsOptional()
  @IsUUID('4')
  upToMessageId?: string;
}

// ---------- Response shapes ----------

export class MessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() conversationId: string;
  @ApiProperty() senderId: string;
  @ApiProperty() body: string;
  @ApiProperty({ type: [String] }) attachmentUrls: string[];
  @ApiProperty({ type: [String] }) readBy: string[];
  @ApiPropertyOptional({ type: String, nullable: true }) deliveredAt: Date | null;
  @ApiProperty({ type: String }) createdAt: Date;

  static fromEntity(m: MessageEntity): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = m.id;
    dto.conversationId = m.conversationId;
    dto.senderId = m.senderId;
    dto.body = m.body;
    dto.attachmentUrls = m.attachmentUrls ?? [];
    dto.readBy = m.readBy ?? [];
    dto.deliveredAt = m.deliveredAt;
    dto.createdAt = m.createdAt;
    return dto;
  }
}

export class ConversationResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true }) listingId: string | null;
  @ApiProperty({ type: [String] }) participantIds: string[];
  @ApiPropertyOptional({ type: String, nullable: true }) lastMessageAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) lastMessagePreview: string | null;
  @ApiPropertyOptional({ nullable: true }) lastSenderId: string | null;
  @ApiProperty() unreadCount: number;
  @ApiProperty({ type: String }) createdAt: Date;
  @ApiProperty({ type: String }) updatedAt: Date;

  static fromEntity(
    c: ConversationEntity,
    unreadCount = 0,
  ): ConversationResponseDto {
    const dto = new ConversationResponseDto();
    dto.id = c.id;
    dto.listingId = c.listingId;
    dto.participantIds = c.participantIds;
    dto.lastMessageAt = c.lastMessageAt;
    dto.lastMessagePreview = c.lastMessagePreview;
    dto.lastSenderId = c.lastSenderId;
    dto.unreadCount = unreadCount;
    dto.createdAt = c.createdAt;
    dto.updatedAt = c.updatedAt;
    return dto;
  }
}
