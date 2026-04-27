import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@aqarat/shared-types';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AnalyticsService } from './analytics.service';
import { ListingEntity } from '../listings/entities/listing.entity';

@ApiTags('analytics')
@ApiBearerAuth('access-token')
@Controller({ path: 'analytics', version: '1' })
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
  ) {}

  @Get('listings/:id/views-over-time')
  @ApiOperation({ summary: 'Daily impressions / detail views / inquiries for a listing' })
  async views(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Query('rangeDays') rangeDaysRaw?: string,
  ) {
    await this.assertCanView(id, actor);
    const rangeDays = clampRange(rangeDaysRaw, 30);
    return this.analyticsService.listingViewsOverTime(id, rangeDays);
  }

  @Get('listings/:id/funnel')
  @ApiOperation({ summary: 'Impression → detail-view → inquiry funnel for a listing' })
  async funnel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Query('rangeDays') rangeDaysRaw?: string,
  ) {
    await this.assertCanView(id, actor);
    const rangeDays = clampRange(rangeDaysRaw, 30);
    return this.analyticsService.listingFunnel(id, rangeDays);
  }

  @Get('listings/:id/sources')
  @ApiOperation({ summary: 'Top traffic sources for a listing' })
  async sources(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Query('rangeDays') rangeDaysRaw?: string,
  ) {
    await this.assertCanView(id, actor);
    const rangeDays = clampRange(rangeDaysRaw, 30);
    return this.analyticsService.listingTrafficSources(id, rangeDays);
  }

  @Get('listings/:id/devices')
  @ApiOperation({ summary: 'Device breakdown for a listing' })
  async devices(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Query('rangeDays') rangeDaysRaw?: string,
  ) {
    await this.assertCanView(id, actor);
    const rangeDays = clampRange(rangeDaysRaw, 30);
    return this.analyticsService.listingDeviceBreakdown(id, rangeDays);
  }

  @Get('agent-dashboard')
  @ApiOperation({ summary: 'Aggregate dashboard for the current agent' })
  async agentDashboard(
    @CurrentUser() actor: RequestUser,
    @Query('rangeDays') rangeDaysRaw?: string,
  ) {
    const rangeDays = clampRange(rangeDaysRaw, 30);
    return this.analyticsService.agentDashboard(actor.id, rangeDays);
  }

  // ---- helpers --------------------------------------------------------

  private async assertCanView(listingId: string, actor: RequestUser): Promise<void> {
    if (
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.MODERATOR ||
      actor.role === UserRole.AGENCY_ADMIN
    ) {
      return;
    }
    const listing = await this.listings.findOne({
      where: { id: listingId },
      select: ['id', 'ownerId'],
    });
    if (!listing) throw new ForbiddenException('Listing not found');
    if (listing.ownerId !== actor.id) {
      throw new ForbiddenException('You can only view analytics for listings you own');
    }
  }
}

function clampRange(value: string | undefined, fallback: number): number {
  const n = value ? Number.parseInt(value, 10) : fallback;
  if (Number.isNaN(n)) return fallback;
  if (n < 1) return 1;
  if (n > 365) return 365;
  return n;
}
