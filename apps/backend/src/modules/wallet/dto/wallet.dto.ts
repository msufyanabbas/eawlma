import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { WalletEntity } from '../entities/wallet.entity';
import {
  WalletTransactionEntity,
  WalletTxnStatus,
  WalletTxnType,
} from '../entities/wallet-transaction.entity';

export class DepositDto {
  @ApiProperty({ description: 'Amount in SAR (whole units, e.g. 100 = 100 SAR).' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class WalletResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() balance: number;
  @ApiProperty() currency: string;
  @ApiProperty({ type: String }) createdAt: Date;
  @ApiProperty({ type: String }) updatedAt: Date;

  static fromEntity(w: WalletEntity): WalletResponseDto {
    const dto = new WalletResponseDto();
    dto.id = w.id;
    dto.userId = w.userId;
    dto.balance = Number(w.balance);
    dto.currency = w.currency;
    dto.createdAt = w.createdAt;
    dto.updatedAt = w.updatedAt;
    return dto;
  }
}

export class WalletTransactionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() walletId: string;
  @ApiProperty() type: WalletTxnType;
  @ApiProperty() amount: number;
  @ApiProperty() balanceBefore: number;
  @ApiProperty() balanceAfter: number;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiPropertyOptional({ nullable: true }) referenceId: string | null;
  @ApiProperty() status: WalletTxnStatus;
  @ApiProperty({ type: String }) createdAt: Date;

  static fromEntity(t: WalletTransactionEntity): WalletTransactionResponseDto {
    const dto = new WalletTransactionResponseDto();
    dto.id = t.id;
    dto.walletId = t.walletId;
    dto.type = t.type;
    dto.amount = Number(t.amount);
    dto.balanceBefore = Number(t.balanceBefore);
    dto.balanceAfter = Number(t.balanceAfter);
    dto.description = t.description;
    dto.referenceId = t.referenceId;
    dto.status = t.status;
    dto.createdAt = t.createdAt;
    return dto;
  }
}

export class WalletSummaryDto {
  @ApiProperty({ type: WalletResponseDto }) wallet: WalletResponseDto;
  @ApiProperty({ type: [WalletTransactionResponseDto] })
  recentTransactions: WalletTransactionResponseDto[];
}
