import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RaiseDisputeDto {
  @ApiProperty({ description: 'Free-text reason the disputing party provides.' })
  @IsString()
  @MinLength(4)
  @MaxLength(2000)
  reason: string;
}
