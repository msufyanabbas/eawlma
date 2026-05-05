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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReplyReviewDto } from './dto/create-review.dto';
import { ReviewResponseDto, ReviewSummary } from './dto/review-response.dto';

interface CurrentUserPayload {
  sub: string;
  role?: string;
}

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
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviews.create(agentId, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Patch('reviews/:id/reply')
  @ApiOperation({ summary: 'Agent replies to a review — only the reviewed agent may reply.' })
  async reply(
    @Param('id', ParseUUIDPipe) reviewId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ReplyReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviews.reply(reviewId, user.sub, dto);
  }
}
