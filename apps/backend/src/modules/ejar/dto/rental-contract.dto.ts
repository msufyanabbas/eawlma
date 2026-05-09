import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

import {
  RentalContractEntity,
  RentalContractStatus,
} from '../entities/rental-contract.entity';

export class CreateRentalContractDto {
  @ApiProperty()
  @IsUUID()
  listingId: string;

  @ApiProperty()
  @IsUUID()
  tenantUserId: string;

  @ApiProperty({ description: 'Tenant national ID (10 digits).' })
  @IsString()
  @Length(8, 16)
  tenantNationalId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(8, 16)
  landlordNationalId?: string;

  @ApiProperty({ example: '2025-06-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-05-31' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 4500 })
  @IsNumber()
  @Min(1)
  monthlyRent: number;

  @ApiProperty({ example: 54000 })
  @IsNumber()
  @Min(1)
  annualRent: number;
}

export class RentalContractResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() listingId: string;
  @ApiPropertyOptional({ nullable: true }) agentId: string | null;
  @ApiProperty() landlordUserId: string;
  @ApiProperty() tenantUserId: string;
  @ApiProperty() tenantNationalId: string;
  @ApiPropertyOptional({ nullable: true }) landlordNationalId: string | null;
  @ApiProperty() startDate: string;
  @ApiProperty() endDate: string;
  @ApiProperty() monthlyRent: number;
  @ApiProperty() annualRent: number;
  @ApiPropertyOptional({ nullable: true }) ejarContractId: string | null;
  @ApiPropertyOptional({ nullable: true }) ejarContractNumber: string | null;
  @ApiPropertyOptional({ nullable: true }) ejarUrl: string | null;
  @ApiProperty() status: RentalContractStatus;
  @ApiProperty({ type: String }) createdAt: Date;
  @ApiProperty({ type: String }) updatedAt: Date;

  static fromEntity(c: RentalContractEntity): RentalContractResponseDto {
    const dto = new RentalContractResponseDto();
    dto.id = c.id;
    dto.listingId = c.listingId;
    dto.agentId = c.agentId;
    dto.landlordUserId = c.landlordUserId;
    dto.tenantUserId = c.tenantUserId;
    dto.tenantNationalId = c.tenantNationalId;
    dto.landlordNationalId = c.landlordNationalId;
    dto.startDate = c.startDate;
    dto.endDate = c.endDate;
    dto.monthlyRent = Number(c.monthlyRent);
    dto.annualRent = Number(c.annualRent);
    dto.ejarContractId = c.ejarContractId;
    dto.ejarContractNumber = c.ejarContractNumber;
    dto.ejarUrl = c.ejarUrl;
    dto.status = c.status;
    dto.createdAt = c.createdAt;
    dto.updatedAt = c.updatedAt;
    return dto;
  }
}
