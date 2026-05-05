import { ApiProperty } from '@nestjs/swagger';
import { ReviewEntity } from '../entities/review.entity';

export interface ReviewerSnapshot {
  id: string;
  firstName: string;
  lastName: string;
}

export class ReviewResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() agentId: string;
  @ApiProperty() reviewerId: string;
  @ApiProperty({ type: 'object', additionalProperties: true })
  reviewer: ReviewerSnapshot | null;
  @ApiProperty({ nullable: true }) listingId: string | null;
  @ApiProperty() rating: number;
  @ApiProperty() comment: string;
  @ApiProperty({ nullable: true }) reply: string | null;
  @ApiProperty({ type: String, nullable: true }) repliedAt: Date | null;
  @ApiProperty({ type: String }) createdAt: Date;

  static fromEntity(r: ReviewEntity, reviewer: ReviewerSnapshot | null = null): ReviewResponseDto {
    const dto = new ReviewResponseDto();
    dto.id = r.id;
    dto.agentId = r.agentId;
    dto.reviewerId = r.reviewerId;
    dto.reviewer = reviewer;
    dto.listingId = r.listingId;
    dto.rating = r.rating;
    dto.comment = r.comment;
    dto.reply = r.reply;
    dto.repliedAt = r.repliedAt;
    dto.createdAt = r.createdAt;
    return dto;
  }
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  reviews: ReviewResponseDto[];
}
