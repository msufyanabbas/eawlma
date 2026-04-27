import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SavedListingsService } from './saved-listings.service';
import { ListingResponseDto } from '../listings/dto/listing-response.dto';

class SaveListingBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

@ApiTags('listings')
@ApiBearerAuth('access-token')
@Controller({ version: '1' })
@UseGuards(JwtAuthGuard)
export class SavedListingsController {
  constructor(private readonly savedListingsService: SavedListingsService) {}

  @Post('listings/:id/save')
  @ApiOperation({
    summary: 'Save a listing to the current user\'s favorites (idempotent).',
  })
  async save(
    @Param('id', ParseUUIDPipe) listingId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SaveListingBodyDto,
  ) {
    const saved = await this.savedListingsService.save(userId, listingId, dto?.notes);
    return { id: saved.id, listingId: saved.listingId, notes: saved.notes };
  }

  @Delete('listings/:id/save')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a listing from the current user\'s favorites.' })
  async unsave(
    @Param('id', ParseUUIDPipe) listingId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.savedListingsService.unsave(userId, listingId);
  }

  @Get('users/me/saved-listings')
  @ApiOperation({ summary: 'List all listings the current user has saved.' })
  @ApiOkResponse({ type: [ListingResponseDto] })
  async mine(@CurrentUser('id') userId: string): Promise<ListingResponseDto[]> {
    const listings = await this.savedListingsService.listForUser(userId);
    return listings.map(ListingResponseDto.fromEntity);
  }

  @Get('users/me/saved-listings/ids')
  @ApiOperation({ summary: 'Return only the listing IDs the user has saved (cheap hydration for the frontend).' })
  async ids(@CurrentUser('id') userId: string): Promise<{ ids: string[] }> {
    return { ids: await this.savedListingsService.listIdsForUser(userId) };
  }
}
