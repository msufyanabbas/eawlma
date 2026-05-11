import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import type { DisputeFavor } from '@eawlma/shared-types';

export class AdminResolveDisputeDto {
  @ApiProperty({ description: 'Admin-written resolution notes shared with both parties.' })
  @IsString()
  @MinLength(4)
  @MaxLength(2000)
  resolution: string;

  @ApiProperty({
    description:
      'Who the dispute is resolved in favor of. `agent` creates the commission as if confirmed; `buyer` cancels the deal; `cancelled` marks the deal as cancelled without favoring either side.',
    enum: ['agent', 'buyer', 'cancelled'],
  })
  @IsString()
  @IsIn(['agent', 'buyer', 'cancelled'])
  favor: DisputeFavor;
}
