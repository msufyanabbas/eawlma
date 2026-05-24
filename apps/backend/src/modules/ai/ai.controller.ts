import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@eawlma/shared-types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { ListingEntity } from '../listings/entities/listing.entity';
import { AiService } from './ai.service';
import {
  EnhanceDescriptionDto,
  EnhanceDescriptionResponseDto,
  RecommendationsDto,
  TranslateListingDto,
} from './dto/ai.dto';

@ApiTags('analytics')
@ApiBearerAuth('access-token')
@Controller({ path: 'ai', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
  ) {}

  @Post('predict-price')
  @ApiOperation({
    summary:
      'AI-driven price projection (1/2/5 yr) anchored on Vision 2030 city-level factors.',
  })
  async predictPrice(
    @Body()
    body: {
      currentPrice: number;
      city: string;
      district?: string;
      propertyType: string;
      area: number;
      bedrooms?: number;
    },
  ) {
    return this.aiService.predictPrice(body);
  }

  @Post('enhance-description')
  @Roles(UserRole.AGENT, UserRole.AGENCY_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Rewrite a listing description into an SEO-optimised version (preserves all facts)' })
  @ApiOkResponse({ type: EnhanceDescriptionResponseDto })
  async enhance(
    @Body() dto: EnhanceDescriptionDto,
  ): Promise<EnhanceDescriptionResponseDto> {
    const { enhanced, live } = await this.aiService.enhanceDescription(
      dto.text,
      dto.locale ?? 'en',
    );
    return { enhanced, live };
  }

  @Post('recommendations')
  @ApiOperation({ summary: 'Score and rank candidate listings against the caller\'s browse history' })
  async recommendations(@Body() dto: RecommendationsDto) {
    return this.aiService.scoreCandidates({
      history: dto.history ?? [],
      candidateIds: dto.candidateIds,
    });
  }

  @Post('translate-listing/:id')
  @Roles(UserRole.AGENT, UserRole.AGENCY_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Manually trigger AI translation of a listing into all 30 target languages' })
  async translate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: TranslateListingDto,
  ) {
    // Ownership check (admins/moderators bypass)
    if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.MODERATOR) {
      const listing = await this.listings.findOne({
        where: { id },
        select: ['id', 'ownerId'],
      });
      if (!listing) throw new ForbiddenException('Listing not found');
      if (listing.ownerId !== actor.id) {
        throw new ForbiddenException('You can only translate listings you own');
      }
    }
    const items = await this.aiService.translateListing(
      id,
      dto.targetLocales && dto.targetLocales.length > 0 ? dto.targetLocales : undefined,
    );
    return { translated: items.length, locales: items.map((t) => t.locale) };
  }
}
