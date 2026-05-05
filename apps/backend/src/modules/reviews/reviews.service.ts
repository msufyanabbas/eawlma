import {
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
import { CreateReviewDto, ReplyReviewDto } from './dto/create-review.dto';
import {
  ReviewResponseDto,
  ReviewerSnapshot,
  ReviewSummary,
} from './dto/review-response.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviews: Repository<ReviewEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
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
