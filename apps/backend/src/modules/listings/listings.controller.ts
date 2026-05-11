import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { UserRole } from '@eawlma/shared-types';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import {
  CreateListingMediaDto,
  ReorderListingMediaDto,
} from './dto/listing-media.dto';
import { UpsertListingTranslationDto } from './dto/listing-translation.dto';
import {
  ListingMediaResponseDto,
  ListingResponseDto,
  ListingTranslationResponseDto,
} from './dto/listing-response.dto';

function classifySource(referer: string | null): string {
  if (!referer) return 'direct';
  try {
    const host = new URL(referer).hostname.toLowerCase();
    if (host.includes('google')) return 'google';
    if (host.includes('bing')) return 'bing';
    if (host.includes('facebook')) return 'facebook';
    if (host.includes('twitter') || host === 't.co' || host.includes('x.com')) return 'twitter';
    if (host.includes('instagram')) return 'instagram';
    if (host.includes('snapchat')) return 'snapchat';
    if (host.includes('tiktok')) return 'tiktok';
    return host;
  } catch {
    return 'direct';
  }
}

function classifyDevice(ua: string): string {
  const lower = ua.toLowerCase();
  if (!lower) return 'unknown';
  if (/bot|crawl|spider|slurp/.test(lower)) return 'bot';
  if (/ipad|tablet/.test(lower)) return 'tablet';
  if (/iphone|android|mobile/.test(lower)) return 'mobile';
  return 'desktop';
}

@ApiTags('listings')
@Controller({ path: 'listings', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  // ---------- Reference data (public) ------------------------------------

  @Public()
  @Get('amenities')
  @ApiOperation({ summary: 'List all amenities (reference data)' })
  async amenities() {
    return this.listingsService.listAmenities();
  }

  @Public()
  @Get('tags')
  @ApiOperation({ summary: 'List all tags (reference data)' })
  async tags() {
    return this.listingsService.listTags();
  }

  // ---------- CRUD --------------------------------------------------------

  @Roles(UserRole.AGENT, UserRole.AGENCY_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Post()
  @ApiOperation({ summary: 'Create a new listing (DRAFT status)' })
  @ApiCreatedResponse({ type: ListingResponseDto })
  async create(
    @CurrentUser('id') ownerId: string,
    @Body() dto: CreateListingDto,
  ): Promise<ListingResponseDto> {
    const listing = await this.listingsService.create(ownerId, dto);
    return ListingResponseDto.fromEntity(listing);
  }

  @ApiBearerAuth('access-token')
  @Get('mine')
  @ApiOperation({ summary: 'List the current user\'s listings (any status)' })
  async mine(
    @CurrentUser('id') ownerId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    const result = await this.listingsService.listForOwner(
      ownerId,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
    return {
      data: result.data.map(ListingResponseDto.fromEntity),
      meta: result.meta,
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a listing by ID. Public visibility limited to ACTIVE.' })
  @ApiOkResponse({ type: ListingResponseDto })
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() viewer: RequestUser | undefined,
    @Req() req: Request,
  ): Promise<ListingResponseDto> {
    const listing = await this.listingsService.findPublicById(id, viewer);
    // Record view counter + analytics event, but only for public viewers
    // (not the owner browsing their own page). Fire-and-forget — view counts
    // aren't part of the read transaction.
    if (!viewer || viewer.id !== listing.ownerId) {
      const ua = (req.headers['user-agent'] as string | undefined) ?? '';
      const referer = (req.headers['referer'] as string | undefined) ?? null;
      void this.listingsService
        .recordView(id, {
          source: classifySource(referer),
          device: classifyDevice(ua),
          viewerId: viewer?.id ?? null,
        })
        .catch(() => undefined);
    }
    const dto = ListingResponseDto.fromEntity(listing);
    // Owner (or privileged staff) sees their own private check-in copy on
    // the listing detail; everyone else gets `null` so the field can't leak
    // before a booking is confirmed.
    if (viewer && viewer.id === listing.ownerId) {
      dto.checkInInstructions = listing.checkInInstructions;
    }
    return dto;
  }

  @ApiBearerAuth('access-token')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a listing you own (or any, if admin/moderator)' })
  @ApiOkResponse({ type: ListingResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: UpdateListingDto,
  ): Promise<ListingResponseDto> {
    const updated = await this.listingsService.update(id, actor, dto);
    return ListingResponseDto.fromEntity(updated);
  }

  @ApiBearerAuth('access-token')
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a draft for moderator review' })
  @ApiOkResponse({ type: ListingResponseDto })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<ListingResponseDto> {
    const updated = await this.listingsService.submitForReview(id, actor);
    return ListingResponseDto.fromEntity(updated);
  }

  @ApiBearerAuth('access-token')
  @Post(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a listing (soft-hide from search)' })
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    await this.listingsService.archive(id, actor);
  }

  @ApiBearerAuth('access-token')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a listing' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    await this.listingsService.softDelete(id, actor);
  }

  @ApiBearerAuth('access-token')
  @Post('bulk-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk activate / deactivate / soft-delete several listings.',
  })
  async bulkUpdate(
    @CurrentUser() actor: RequestUser,
    @Body() body: { ids: string[]; action: 'activate' | 'deactivate' | 'delete' },
  ): Promise<{ matched: number; updated: number; skipped: number }> {
    return this.listingsService.bulkUpdate(actor, body.ids ?? [], body.action);
  }

  // ---------- Media -------------------------------------------------------

  @ApiBearerAuth('access-token')
  @Post(':id/media')
  @ApiOperation({ summary: 'Attach a media item (image/video/360/floorplan) to a listing' })
  @ApiCreatedResponse({ type: ListingMediaResponseDto })
  async addMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateListingMediaDto,
  ): Promise<ListingMediaResponseDto> {
    const m = await this.listingsService.addMedia(id, actor, dto);
    return ListingMediaResponseDto.fromEntity(m);
  }

  @ApiBearerAuth('access-token')
  @Patch(':id/media/reorder')
  @ApiOperation({ summary: 'Reorder media items by ID' })
  async reorderMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: ReorderListingMediaDto,
  ): Promise<ListingMediaResponseDto[]> {
    const reordered = await this.listingsService.reorderMedia(id, actor, dto);
    return reordered.map(ListingMediaResponseDto.fromEntity);
  }

  @ApiBearerAuth('access-token')
  @Delete(':id/media/:mediaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a media item from a listing' })
  async removeMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    await this.listingsService.removeMedia(id, mediaId, actor);
  }

  // ---------- Translations -----------------------------------------------

  @ApiBearerAuth('access-token')
  @Post(':id/translations')
  @ApiOperation({ summary: 'Upsert a translation (locale unique per listing)' })
  @ApiOkResponse({ type: ListingTranslationResponseDto })
  async upsertTranslation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: UpsertListingTranslationDto,
  ): Promise<ListingTranslationResponseDto> {
    const t = await this.listingsService.upsertTranslation(id, actor, dto);
    return ListingTranslationResponseDto.fromEntity(t);
  }

  @ApiBearerAuth('access-token')
  @Delete(':id/translations/:translationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a translation' })
  async deleteTranslation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('translationId', ParseUUIDPipe) translationId: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    await this.listingsService.deleteTranslation(id, translationId, actor);
  }
}
