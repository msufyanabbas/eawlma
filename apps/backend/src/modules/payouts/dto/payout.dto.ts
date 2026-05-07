import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

import { PayoutRequestEntity, PayoutStatus } from '../entities/payout-request.entity';

export class RequestPayoutDto {
  @ApiProperty({ minimum: 100 })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({
    description: 'Saudi IBAN — 24 chars, must start with `SA` followed by 22 digits.',
    example: 'SA0380000000608010167519',
  })
  @IsString()
  @Length(24, 24)
  @Matches(/^SA\d{22}$/, { message: 'Invalid Saudi IBAN' })
  ibanNumber: string;

  @ApiProperty()
  @IsString()
  @Length(2, 100)
  bankName: string;
}

export class RejectPayoutDto {
  @ApiProperty({ description: 'Reason shown to the agent on rejection.' })
  @IsString()
  @Length(2, 500)
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNotes?: string;
}

export class PayoutResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() agentId: string;
  @ApiProperty() walletId: string;
  @ApiProperty() amount: number;
  @ApiProperty() ibanNumber: string;
  @ApiProperty() bankName: string;
  @ApiProperty() beneficiaryName: string;
  @ApiPropertyOptional({ nullable: true }) moyasarDisbursementId: string | null;
  @ApiProperty() status: PayoutStatus;
  @ApiPropertyOptional({ nullable: true }) failureReason: string | null;
  @ApiPropertyOptional({ nullable: true }) adminNotes: string | null;
  @ApiProperty({ type: String }) requestedAt: Date;
  @ApiPropertyOptional({ type: String, nullable: true }) processedAt: Date | null;
  @ApiProperty({ type: String }) createdAt: Date;
  @ApiProperty({ type: String }) updatedAt: Date;
  // Optional joined fields populated by admin list endpoint.
  @ApiPropertyOptional({ nullable: true }) agentName?: string | null;
  @ApiPropertyOptional({ nullable: true }) agentEmail?: string | null;

  static fromEntity(
    p: PayoutRequestEntity,
    enrich?: { agentName?: string | null; agentEmail?: string | null },
  ): PayoutResponseDto {
    const dto = new PayoutResponseDto();
    dto.id = p.id;
    dto.agentId = p.agentId;
    dto.walletId = p.walletId;
    dto.amount = Number(p.amount);
    dto.ibanNumber = p.ibanNumber;
    dto.bankName = p.bankName;
    dto.beneficiaryName = p.beneficiaryName;
    dto.moyasarDisbursementId = p.moyasarDisbursementId;
    dto.status = p.status;
    dto.failureReason = p.failureReason;
    dto.adminNotes = p.adminNotes;
    dto.requestedAt = p.requestedAt;
    dto.processedAt = p.processedAt;
    dto.createdAt = p.createdAt;
    dto.updatedAt = p.updatedAt;
    if (enrich) {
      dto.agentName = enrich.agentName ?? null;
      dto.agentEmail = enrich.agentEmail ?? null;
    }
    return dto;
  }
}

export class PayoutSummaryDto {
  @ApiProperty() totalPaid: number;
  @ApiProperty() totalProcessing: number;
  @ApiProperty() totalFailed: number;
  @ApiProperty() countByStatus: Record<PayoutStatus, number>;
}
