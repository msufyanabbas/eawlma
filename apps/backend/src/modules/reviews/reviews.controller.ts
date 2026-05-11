import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import {
  CreateListingReviewDto,
  CreateReviewDto,
  ReplyReviewDto,
} from './dto/create-review.dto';
import { ReviewResponseDto, ReviewSummary } from './dto/review-response.dto';

@ApiTags('reviews')
@Controller({ version: '1' })
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get('agents/:id/reviews')
  @ApiOperation({ summary: 'Public reviews for an agent — paginated with rating summary.' })
  @ApiOkResponse()
  async listForAgent(
    @Param('id', ParseUUIDPipe) agentId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<ReviewSummary> {
    return this.reviews.listForAgent(agentId, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post('agents/:id/reviews')
  @ApiOperation({ summary: 'Create a review for an agent (one per buyer per agent).' })
  async create(
    @Param('id', ParseUUIDPipe) agentId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviews.create(agentId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Patch('reviews/:id/reply')
  @ApiOperation({ summary: 'Agent replies to a review — only the reviewed agent may reply.' })
  async reply(
    @Param('id', ParseUUIDPipe) reviewId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: ReplyReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviews.reply(reviewId, user.id, dto);
  }

  @Public()
  @Get('listings/:id/reviews')
  @ApiOperation({ summary: 'Public reviews for a listing with sub-rating averages.' })
  @ApiOkResponse()
  async listForListing(
    @Param('id', ParseUUIDPipe) listingId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<ReviewSummary> {
    return this.reviews.listForListing(listingId, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post('reviews/listings/:id')
  @ApiOperation({
    summary:
      'Leave a stay review on a listing. Requires the actor to have a confirmed or completed booking on that listing.',
  })
  async createForListing(
    @Param('id', ParseUUIDPipe) listingId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateListingReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviews.createForListing(listingId, user.id, dto);
  }
}
