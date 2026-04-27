import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InquiryStatus } from '@aqarat/shared-types';
import { InquiryEntity } from '../entities/inquiry.entity';

export class InquiryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() listingId: string;
  @ApiProperty() agentId: string;
  @ApiPropertyOptional({ nullable: true }) userId: string | null;
  @ApiPropertyOptional({ nullable: true }) guestName: string | null;
  @ApiPropertyOptional({ nullable: true }) guestEmail: string | null;
  @ApiPropertyOptional({ nullable: true }) guestPhone: string | null;
  @ApiPropertyOptional({ nullable: true, enum: ['phone', 'email', 'whatsapp'] })
  preferredContactMethod: 'phone' | 'email' | 'whatsapp' | null;
  @ApiProperty() message: string;
  @ApiProperty({ enum: InquiryStatus }) status: InquiryStatus;
  @ApiPropertyOptional({ nullable: true }) agentNotes: string | null;
  @ApiPropertyOptional({ nullable: true }) nextAction: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) nextActionAt: Date | null;
  @ApiPropertyOptional({ type: String, nullable: true }) respondedAt: Date | null;
  @ApiProperty({ type: String }) createdAt: Date;
  @ApiProperty({ type: String }) updatedAt: Date;

  static fromEntity(i: InquiryEntity): InquiryResponseDto {
    const dto = new InquiryResponseDto();
    dto.id = i.id;
    dto.listingId = i.listingId;
    dto.agentId = i.agentId;
    dto.userId = i.userId;
    dto.guestName = i.guestName;
    dto.guestEmail = i.guestEmail;
    dto.guestPhone = i.guestPhone;
    dto.preferredContactMethod = i.preferredContactMethod;
    dto.message = i.message;
    dto.status = i.status;
    dto.agentNotes = i.agentNotes;
    dto.nextAction = i.nextAction;
    dto.nextActionAt = i.nextActionAt;
    dto.respondedAt = i.respondedAt;
    dto.createdAt = i.createdAt;
    dto.updatedAt = i.updatedAt;
    return dto;
  }
}
