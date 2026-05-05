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
import { ListingStatus, UserRole, UserStatus } from '@eawlma/shared-types';

import { Public } from '../../common/decorators/public.decorator';
import { ListingEntity } from '../listings/entities/listing.entity';
import { ListingResponseDto } from '../listings/dto/listing-response.dto';
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

  @Public()
  @Get(':id/reviews')
  @ApiOperation({
    summary: 'Reviews for an agent. Returns an empty list for now — a full reviews module is on the roadmap.',
  })
  async agentReviews(@Param('id', ParseUUIDPipe) id: string) {
    void id;
    // TODO: when the reviews module ships, replace this stub with a query
    // against a `reviews` table joined with the reviewer profile + rating
    // distribution + verified-purchase badges. Returning an empty array
    // keeps the AgentProfilePage rendering "no reviews yet" cleanly.
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      reviews: [],
    };
  }
}
