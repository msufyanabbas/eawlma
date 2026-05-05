import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: 'Public review text', example: 'Very professional and responsive.' })
  @IsString()
  @Length(10, 2000)
  comment: string;

  @ApiPropertyOptional({ description: 'Listing this review relates to (optional).' })
  @IsOptional()
  @IsUUID()
  listingId?: string;
}

export class ReplyReviewDto {
  @ApiProperty({ description: 'Public reply from the agent.', example: 'Thank you for the kind words!' })
  @IsString()
  @Length(2, 2000)
  reply: string;
}
