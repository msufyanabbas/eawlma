import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

import {
  SupportMessageEntity,
} from '../entities/support-message.entity';
import {
  SupportTicketCategory,
  SupportTicketEntity,
  SupportTicketPriority,
  SupportTicketStatus,
} from '../entities/support-ticket.entity';

const CATEGORIES: SupportTicketCategory[] = [
  'general',
  'technical',
  'billing',
  'listing',
  'account',
  'other',
];

const PRIORITIES: SupportTicketPriority[] = ['low', 'medium', 'high', 'urgent'];

const STATUSES: SupportTicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

export class CreateTicketDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @Length(1, 200)
  subject: string;

  @ApiProperty()
  @IsString()
  @MaxLength(8000)
  description: string;

  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional()
  @IsString()
  @IsIn(CATEGORIES as unknown as string[])
  category?: SupportTicketCategory;

  @ApiPropertyOptional({ enum: PRIORITIES })
  @IsOptional()
  @IsString()
  @IsIn(PRIORITIES as unknown as string[])
  priority?: SupportTicketPriority;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  @Length(1, 8000)
  message: string;
}

export class UpdateStatusDto {
  @ApiProperty({ enum: STATUSES })
  @IsString()
  @IsIn(STATUSES as unknown as string[])
  status: SupportTicketStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  resolution?: string;
}

export class SupportTicketResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() subject: string;
  @ApiProperty() description: string;
  @ApiProperty() category: SupportTicketCategory;
  @ApiProperty() priority: SupportTicketPriority;
  @ApiProperty() status: SupportTicketStatus;
  @ApiPropertyOptional({ nullable: true }) assignedToId: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) resolvedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) resolution: string | null;
  @ApiPropertyOptional({ nullable: true }) ticketNumber: string | null;
  // Convenience fields surfaced to admin clients.
  @ApiPropertyOptional({ nullable: true }) userEmail?: string | null;
  @ApiPropertyOptional({ nullable: true }) userName?: string | null;
  @ApiProperty({ type: String }) createdAt: Date;
  @ApiProperty({ type: String }) updatedAt: Date;

  static fromEntity(t: SupportTicketEntity): SupportTicketResponseDto {
    const dto = new SupportTicketResponseDto();
    dto.id = t.id;
    dto.userId = t.userId;
    dto.subject = t.subject;
    dto.description = t.description;
    dto.category = t.category;
    dto.priority = t.priority;
    dto.status = t.status;
    dto.assignedToId = t.assignedToId;
    dto.resolvedAt = t.resolvedAt;
    dto.resolution = t.resolution;
    dto.ticketNumber = t.ticketNumber;
    if (t.user) {
      dto.userEmail = t.user.email ?? null;
      dto.userName = `${t.user.firstName ?? ''} ${t.user.lastName ?? ''}`.trim() || null;
    }
    dto.createdAt = t.createdAt;
    dto.updatedAt = t.updatedAt;
    return dto;
  }
}

export class SupportMessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() ticketId: string;
  @ApiProperty() senderId: string;
  @ApiProperty() message: string;
  @ApiProperty() isStaff: boolean;
  @ApiPropertyOptional({ nullable: true }) attachmentUrl: string | null;
  @ApiPropertyOptional({ nullable: true }) senderName?: string | null;
  @ApiProperty({ type: String }) createdAt: Date;

  static fromEntity(m: SupportMessageEntity): SupportMessageResponseDto {
    const dto = new SupportMessageResponseDto();
    dto.id = m.id;
    dto.ticketId = m.ticketId;
    dto.senderId = m.senderId;
    dto.message = m.message;
    dto.isStaff = m.isStaff;
    dto.attachmentUrl = m.attachmentUrl;
    if (m.sender) {
      dto.senderName = `${m.sender.firstName ?? ''} ${m.sender.lastName ?? ''}`.trim() || null;
    }
    dto.createdAt = m.createdAt;
    return dto;
  }
}
