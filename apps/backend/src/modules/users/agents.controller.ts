import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListingStatus, UserRole, UserStatus, type HostStats } from '@eawlma/shared-types';

import { Public } from '../../common/decorators/public.decorator';
import { ListingEntity } from '../listings/entities/listing.entity';
import { ListingResponseDto } from '../listings/dto/listing-response.dto';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { UserEntity } from './entities/user.entity';
import { PublicAgentDto } from './dto/public-agent.dto';

@ApiTags('users')
@Controller({ path: 'agents', version: '1' })
export class AgentsController {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(ReviewEntity)
    private readonly reviews: Repository<ReviewEntity>,
  ) {}

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Public agent profile (no email/phone exposed).' })
  @ApiOkResponse({ type: PublicAgentDto })
  async profile(@Param('id', ParseUUIDPipe) id: string): Promise<PublicAgentDto> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Agent not found');
    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      throw new NotFoundException('Agent not found');
    }
    if (![UserRole.AGENT, UserRole.AGENCY_ADMIN].includes(user.role)) {
      throw new NotFoundException('Agent not found');
    }
    return PublicAgentDto.fromEntity(user);
  }

  @Public()
  @Get(':id/listings')
  @ApiOperation({ summary: 'Active listings owned by an agent (public).' })
  async agentListings(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.listings.find({
      where: { ownerId: id, status: ListingStatus.ACTIVE },
      order: { isFeatured: 'DESC', publishedAt: 'DESC' },
      relations: ['media'],
      take: 50,
    });
    return data.map(ListingResponseDto.fromEntity);
  }

  /**
   * GET /users/:id/host-stats — aggregate host stats used by the listing
   * detail page and the agent card. Recalculated lazily here from the
   * `bookings` and `reviews` tables so the cached columns on `users` stay
   * eventually-consistent without a separate cron.
   *
   * Mounted on both `/agents/:id/host-stats` and a top-level
   * `/users/:id/host-stats` alias (see below) to match the spec.
   */
  @Public()
  @Get(':id/host-stats')
  @ApiOperation({ summary: 'Aggregate host stats — response rate, superhost badge, totals.' })
  async hostStats(@Param('id', ParseUUIDPipe) id: string): Promise<HostStats> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Completed bookings + earnings — sum totalAmount on `completed` rows
    // hosted by this user. `completed` is the terminal post-checkout state.
    const completed = await this.bookings.find({ where: { hostId: id, status: 'completed' } });
    const totalCompletedBookings = completed.length;
    const totalEarnings = completed.reduce(
      (sum, b) => sum + Number(b.totalAmount ?? 0),
      0,
    );

    // Average review rating across all reviews this host has received.
    const reviews = await this.reviews.find({ where: { agentId: id } });
    const reviewCount = reviews.length;
    const averageRating = reviewCount === 0
      ? null
      : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10;

    // Superhost criteria — applied here in addition to whatever the user row
    // already carries. ≥10 completed bookings, response rate ≥90%, avg rating
    // ≥4.8. Cancellations check is deferred until we surface a bookings.cancellations
    // counter.
    const responseRate =
      user.responseRate !== null && user.responseRate !== undefined
        ? Number(user.responseRate)
        : null;
    const meetsCriteria =
      totalCompletedBookings >= 10 &&
      (responseRate ?? 0) >= 90 &&
      (averageRating ?? 0) >= 4.8;
    const isSuperhost = user.isSuperhost || meetsCriteria;

    return {
      userId: id,
      responseRate,
      responseTime: user.responseTime ?? null,
      isSuperhost,
      totalCompletedBookings,
      totalEarnings,
      averageRating,
      reviewCount,
    };
  }

  // The reviews endpoint moved to ReviewsController (GET /agents/:id/reviews).
}
