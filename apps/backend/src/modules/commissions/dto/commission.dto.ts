import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, IsNumber, Min } from 'class-validator';

import { CommissionEntity, CommissionStatus } from '../entities/commission.entity';
import { CommitmentOathEntity, OathType } from '../entities/commitment-oath.entity';

export class CreateCommissionDto {
  @ApiProperty()
  @IsUUID()
  listingId: string;

  @ApiProperty()
  @IsUUID()
  agentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  buyerId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  transactionValue: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateCommissionStatusDto {
  @ApiProperty({ enum: ['pending', 'confirmed', 'paid', 'disputed'] })
  @IsEnum(['pending', 'confirmed', 'paid', 'disputed'])
  status: CommissionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class AcceptOathDto {
  @ApiProperty({ enum: ['agent_listing', 'buyer_purchase'] })
  @IsEnum(['agent_listing', 'buyer_purchase'])
  oathType: OathType;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  oathText: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  listingId?: string;
}

export class CommissionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() listingId: string;
  @ApiProperty() agentId: string;
  @ApiPropertyOptional({ nullable: true }) buyerId: string | null;
  @ApiProperty() transactionValue: number;
  @ApiProperty() agentCommissionRate: number;
  @ApiProperty() platformCommissionRate: number;
  @ApiProperty() agentCommissionAmount: number;
  @ApiProperty() platformCommissionAmount: number;
  @ApiProperty() status: CommissionStatus;
  @ApiPropertyOptional({ nullable: true }) notes: string | null;
  @ApiProperty({ type: String }) createdAt: Date;
  @ApiProperty({ type: String }) updatedAt: Date;

  static fromEntity(c: CommissionEntity): CommissionResponseDto {
    const dto = new CommissionResponseDto();
    dto.id = c.id;
    dto.listingId = c.listingId;
    dto.agentId = c.agentId;
    dto.buyerId = c.buyerId;
    dto.transactionValue = Number(c.transactionValue);
    dto.agentCommissionRate = Number(c.agentCommissionRate);
    dto.platformCommissionRate = Number(c.platformCommissionRate);
    dto.agentCommissionAmount = Number(c.agentCommissionAmount);
    dto.platformCommissionAmount = Number(c.platformCommissionAmount);
    dto.status = c.status;
    dto.notes = c.notes;
    dto.createdAt = c.createdAt;
    dto.updatedAt = c.updatedAt;
    return dto;
  }
}

export class CommissionSummaryDto {
  @ApiProperty() totalPlatformRevenue: number;
  @ApiProperty() totalAgentCommissions: number;
  @ApiProperty() totalTransactions: number;
  @ApiProperty() byStatus: Record<CommissionStatus, number>;
  @ApiProperty() byMonth: Array<{ month: string; platform: number; agent: number; count: number }>;
}

export class OathResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() oathType: OathType;
  @ApiProperty() oathText: string;
  @ApiProperty({ type: String }) acceptedAt: Date;
  @ApiPropertyOptional({ nullable: true }) listingId: string | null;

  static fromEntity(o: CommitmentOathEntity): OathResponseDto {
    const dto = new OathResponseDto();
    dto.id = o.id;
    dto.userId = o.userId;
    dto.oathType = o.oathType;
    dto.oathText = o.oathText;
    dto.acceptedAt = o.acceptedAt;
    dto.listingId = o.listingId;
    return dto;
  }
}
