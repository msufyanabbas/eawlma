import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

import { DufaatPlanEntity, DufaatPlanStatus } from '../entities/dufaat-plan.entity';
import {
  DufaatInstallmentEntity,
  DufaatInstallmentStatus,
} from '../entities/dufaat-installment.entity';

export class CreateDufaatPlanDto {
  @ApiProperty()
  @IsUUID()
  rentalContractId: string;
}

export class DufaatInstallmentDto {
  @ApiProperty() id: string;
  @ApiProperty() planId: string;
  @ApiProperty() dueDate: string;
  @ApiProperty() amount: number;
  @ApiPropertyOptional({ type: String, nullable: true }) paidAt: Date | null;
  @ApiProperty() status: DufaatInstallmentStatus;

  static fromEntity(i: DufaatInstallmentEntity): DufaatInstallmentDto {
    const dto = new DufaatInstallmentDto();
    dto.id = i.id;
    dto.planId = i.planId;
    dto.dueDate = i.dueDate;
    dto.amount = Number(i.amount);
    dto.paidAt = i.paidAt;
    dto.status = i.status;
    return dto;
  }
}

export class DufaatPlanResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() rentalContractId: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() landlordId: string;
  @ApiProperty() totalAnnualAmount: number;
  @ApiProperty() monthlyInstallment: number;
  @ApiProperty() platformFeeRate: number;
  @ApiProperty() platformFee: number;
  @ApiProperty() status: DufaatPlanStatus;
  @ApiProperty() startDate: string;
  @ApiProperty() endDate: string;
  @ApiProperty({ type: [DufaatInstallmentDto] }) installments: DufaatInstallmentDto[];
  @ApiProperty({ type: String }) createdAt: Date;
  @ApiProperty({ type: String }) updatedAt: Date;

  static fromEntity(p: DufaatPlanEntity): DufaatPlanResponseDto {
    const dto = new DufaatPlanResponseDto();
    dto.id = p.id;
    dto.rentalContractId = p.rentalContractId;
    dto.tenantId = p.tenantId;
    dto.landlordId = p.landlordId;
    dto.totalAnnualAmount = Number(p.totalAnnualAmount);
    dto.monthlyInstallment = Number(p.monthlyInstallment);
    dto.platformFeeRate = Number(p.platformFeeRate);
    dto.platformFee = Number(p.platformFee);
    dto.status = p.status;
    dto.startDate = p.startDate;
    dto.endDate = p.endDate;
    dto.installments = (p.installments ?? []).map(DufaatInstallmentDto.fromEntity);
    dto.createdAt = p.createdAt;
    dto.updatedAt = p.updatedAt;
    return dto;
  }
}
