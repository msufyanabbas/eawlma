import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CloseDealDto {
  @ApiProperty({ description: 'Final transaction value in SAR (whole units).' })
  @IsNumber()
  @Min(1)
  transactionValue: number;

  @ApiPropertyOptional({ description: 'Date the deal was closed (defaults to now).' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  closedAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
