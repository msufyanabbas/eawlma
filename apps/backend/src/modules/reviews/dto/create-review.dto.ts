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

/** Posted from /bookings — guest leaves a stay review after a completed booking. */
export class CreateListingReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty()
  @IsString()
  @Length(10, 2000)
  comment: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  cleanlinessRating?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  accuracyRating?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  locationRating?: number;
}

export class ReplyReviewDto {
  @ApiProperty({ description: 'Public reply from the agent.', example: 'Thank you for the kind words!' })
  @IsString()
  @Length(2, 2000)
  reply: string;
}
