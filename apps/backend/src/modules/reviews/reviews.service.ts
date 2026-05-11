import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserRole } from '@eawlma/shared-types';

import { ReviewEntity } from './entities/review.entity';
import { UserEntity } from '../users/entities/user.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import {
  CreateListingReviewDto,
  CreateReviewDto,
  ReplyReviewDto,
} from './dto/create-review.dto';
import {
  ReviewResponseDto,
  ReviewerSnapshot,
  ReviewSummary,
  SubRatingAverages,
} from './dto/review-response.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviews: Repository<ReviewEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
  ) {}

  /** GET /agents/:id/reviews — public listing with rating distribution. */
  async listForAgent(agentId: string, page = 1, limit = 20): Promise<ReviewSummary> {
    const [rows, total] = await this.reviews.findAndCount({
      where: { agentId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const reviewerIds = Array.from(new Set(rows.map((r) => r.reviewerId)));
    const reviewers = reviewerIds.length
      ? await this.users.find({ where: { id: In(reviewerIds) } })
      : [];
    const reviewerMap = new Map<string, ReviewerSnapshot>();
    for (const u of reviewers) {
      reviewerMap.set(u.id, { id: u.id, firstName: u.firstName, lastName: u.lastName });
    }

    // Rating distribution + average computed across the agent's full set
    // (not just this page) so the summary stays accurate when paginating.
    const fullSet = total === rows.length
      ? rows
      : await this.reviews.find({ where: { agentId } });
    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of fullSet) {
      const k = Math.max(1, Math.min(5, r.rating)) as 1 | 2 | 3 | 4 | 5;
      distribution[k] += 1;
      sum += r.rating;
    }
    const averageRating = fullSet.length === 0 ? 0 : Math.round((sum / fullSet.length) * 10) / 10;

    return {
      averageRating,
      totalReviews: total,
      ratingDistribution: distribution,
      reviews: rows.map((r) => ReviewResponseDto.fromEntity(r, reviewerMap.get(r.reviewerId) ?? null)),
    };
  }

  /** POST /agents/:id/reviews — buyers only, one per agent. */
  async create(agentId: string, reviewerId: string, dto: CreateReviewDto): Promise<ReviewResponseDto> {
    if (agentId === reviewerId) {
      throw new ForbiddenException('You cannot review yourself');
    }
    const agent = await this.users.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');
    if (![UserRole.AGENT, UserRole.AGENCY_ADMIN].includes(agent.role)) {
      throw new ForbiddenException('Only agent profiles can be reviewed');
    }

    const existing = await this.reviews.findOne({ where: { agentId, reviewerId } });
    if (existing) {
      throw new ConflictException('You have already reviewed this agent');
    }

    const entity = this.reviews.create({
      agentId,
      reviewerId,
      listingId: dto.listingId ?? null,
      rating: dto.rating,
      comment: dto.comment,
      reply: null,
      repliedAt: null,
    });
    const saved = await this.reviews.save(entity);
    const reviewer = await this.users.findOne({ where: { id: reviewerId } });
    return ReviewResponseDto.fromEntity(
      saved,
      reviewer ? { id: reviewer.id, firstName: reviewer.firstName, lastName: reviewer.lastName } : null,
    );
  }

  /** PATCH /reviews/:id/reply — agent who was reviewed only. */
  async reply(reviewId: string, agentId: string, dto: ReplyReviewDto): Promise<ReviewResponseDto> {
    const review = await this.reviews.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.agentId !== agentId) {
      throw new ForbiddenException('Only the reviewed agent can reply');
    }
    review.reply = dto.reply;
    review.repliedAt = new Date();
    const saved = await this.reviews.save(review);
    const reviewer = await this.users.findOne({ where: { id: review.reviewerId } });
    return ReviewResponseDto.fromEntity(
      saved,
      reviewer ? { id: reviewer.id, firstName: reviewer.firstName, lastName: reviewer.lastName } : null,
    );
  }

  /** POST /reviews/listings/:listingId — guest review after a completed stay.
   *  Requires a non-cancelled booking owned by the actor on this listing. The
   *  agent being reviewed is the listing's host. */
  async createForListing(
    listingId: string,
    reviewerId: string,
    dto: CreateListingReviewDto,
  ): Promise<ReviewResponseDto> {
    // Eligibility: actor must have at least one confirmed or completed booking
    // on this listing. We intentionally accept `confirmed` (not strictly
    // completed) so that guests can review immediately after check-out even
    // before any nightly cron flips the row to `completed`.
    const booking = await this.bookings.findOne({
      where: [
        { listingId, guestId: reviewerId, status: 'completed' },
        { listingId, guestId: reviewerId, status: 'confirmed' },
      ],
    });
    if (!booking) {
      throw new ForbiddenException('You can only review a listing you have booked');
    }

    const existing = await this.reviews.findOne({
      where: { bookingId: booking.id },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this stay');
    }
    if (booking.guestId === booking.hostId) {
      throw new BadRequestException('Cannot review your own booking');
    }

    const entity = this.reviews.create({
      agentId: booking.hostId,
      reviewerId,
      listingId,
      bookingId: booking.id,
      rating: dto.rating,
      cleanlinessRating: dto.cleanlinessRating ?? null,
      accuracyRating: dto.accuracyRating ?? null,
      communicationRating: dto.communicationRating ?? null,
      locationRating: dto.locationRating ?? null,
      comment: dto.comment,
      reply: null,
      repliedAt: null,
    });
    const saved = await this.reviews.save(entity);
    const reviewer = await this.users.findOne({ where: { id: reviewerId } });
    return ReviewResponseDto.fromEntity(
      saved,
      reviewer ? { id: reviewer.id, firstName: reviewer.firstName, lastName: reviewer.lastName } : null,
    );
  }

  /** GET /listings/:id/reviews — listing-scoped review summary with sub-rating
   *  averages. Same shape as `listForAgent` but filtered by listingId. */
  async listForListing(listingId: string, page = 1, limit = 20): Promise<ReviewSummary> {
    const [rows, total] = await this.reviews.findAndCount({
      where: { listingId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const reviewerIds = Array.from(new Set(rows.map((r) => r.reviewerId)));
    const reviewers = reviewerIds.length
      ? await this.users.find({ where: { id: In(reviewerIds) } })
      : [];
    const reviewerMap = new Map<string, ReviewerSnapshot>();
    for (const u of reviewers) {
      reviewerMap.set(u.id, { id: u.id, firstName: u.firstName, lastName: u.lastName });
    }

    const fullSet = total === rows.length
      ? rows
      : await this.reviews.find({ where: { listingId } });
    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of fullSet) {
      const k = Math.max(1, Math.min(5, r.rating)) as 1 | 2 | 3 | 4 | 5;
      distribution[k] += 1;
      sum += r.rating;
    }
    const averageRating = fullSet.length === 0 ? 0 : Math.round((sum / fullSet.length) * 10) / 10;
    const subRatings: SubRatingAverages = {
      cleanliness: avgOf(fullSet, (r) => r.cleanlinessRating),
      accuracy: avgOf(fullSet, (r) => r.accuracyRating),
      communication: avgOf(fullSet, (r) => r.communicationRating),
      location: avgOf(fullSet, (r) => r.locationRating),
    };

    return {
      averageRating,
      totalReviews: total,
      ratingDistribution: distribution,
      subRatings,
      reviews: rows.map((r) =>
        ReviewResponseDto.fromEntity(r, reviewerMap.get(r.reviewerId) ?? null),
      ),
    };
  }

  /**
   * Idempotent helper used by the seed: creates a review only if the
   * (agentId, reviewerId) pair doesn't already exist. Skips the
   * "can't review yourself" / role checks since the seed controls inputs.
   */
  async upsertSeed(input: {
    agentId: string;
    reviewerId: string;
    rating: number;
    comment: string;
  }): Promise<void> {
    const existing = await this.reviews.findOne({
      where: { agentId: input.agentId, reviewerId: input.reviewerId },
    });
    if (existing) {
      existing.rating = input.rating;
      existing.comment = input.comment;
      await this.reviews.save(existing);
      return;
    }
    await this.reviews.save(
      this.reviews.create({
        agentId: input.agentId,
        reviewerId: input.reviewerId,
        listingId: null,
        rating: input.rating,
        comment: input.comment,
        reply: null,
        repliedAt: null,
      }),
    );
  }
}

function avgOf(rows: ReviewEntity[], pick: (r: ReviewEntity) => number | null): number | null {
  const values = rows.map(pick).filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
