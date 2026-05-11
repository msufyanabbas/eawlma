import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InquiryStatus, type DealStatus } from '@eawlma/shared-types';
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
  @ApiPropertyOptional({ nullable: true }) transactionValue: number | null;
  @ApiPropertyOptional({ type: String, nullable: true }) closedAt: Date | null;

  // Deal confirmation + dispute fields
  @ApiProperty() dealClosedByAgent: boolean;
  @ApiProperty() dealConfirmedByBuyer: boolean;
  @ApiProperty({ enum: ['none', 'pending_confirmation', 'confirmed', 'disputed', 'resolved'] })
  dealStatus: DealStatus;
  @ApiPropertyOptional({ nullable: true }) disputeReason: string | null;
  @ApiPropertyOptional({ nullable: true }) disputeRaisedBy: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) disputeRaisedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) adminResolution: string | null;
  @ApiPropertyOptional({ nullable: true }) adminResolvedBy: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) adminResolvedAt: Date | null;

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
    dto.transactionValue = i.transactionValue !== null ? Number(i.transactionValue) : null;
    dto.closedAt = i.closedAt;
    dto.dealClosedByAgent = i.dealClosedByAgent ?? false;
    dto.dealConfirmedByBuyer = i.dealConfirmedByBuyer ?? false;
    dto.dealStatus = (i.dealStatus ?? 'none') as DealStatus;
    dto.disputeReason = i.disputeReason;
    dto.disputeRaisedBy = i.disputeRaisedBy;
    dto.disputeRaisedAt = i.disputeRaisedAt;
    dto.adminResolution = i.adminResolution;
    dto.adminResolvedBy = i.adminResolvedBy;
    dto.adminResolvedAt = i.adminResolvedAt;
    dto.createdAt = i.createdAt;
    dto.updatedAt = i.updatedAt;
    return dto;
  }
}
