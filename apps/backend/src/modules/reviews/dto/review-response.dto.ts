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
  @ApiProperty({ nullable: true }) bookingId: string | null;
  @ApiProperty() rating: number;
  @ApiProperty({ nullable: true }) cleanlinessRating: number | null;
  @ApiProperty({ nullable: true }) accuracyRating: number | null;
  @ApiProperty({ nullable: true }) communicationRating: number | null;
  @ApiProperty({ nullable: true }) locationRating: number | null;
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
    dto.bookingId = r.bookingId ?? null;
    dto.rating = r.rating;
    dto.cleanlinessRating = r.cleanlinessRating ?? null;
    dto.accuracyRating = r.accuracyRating ?? null;
    dto.communicationRating = r.communicationRating ?? null;
    dto.locationRating = r.locationRating ?? null;
    dto.comment = r.comment;
    dto.reply = r.reply;
    dto.repliedAt = r.repliedAt;
    dto.createdAt = r.createdAt;
    return dto;
  }
}

/** Average of each sub-rating across a listing's reviews, returned alongside
 *  the listing-level review summary. */
export interface SubRatingAverages {
  cleanliness: number | null;
  accuracy: number | null;
  communication: number | null;
  location: number | null;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  reviews: ReviewResponseDto[];
  subRatings?: SubRatingAverages;
}
