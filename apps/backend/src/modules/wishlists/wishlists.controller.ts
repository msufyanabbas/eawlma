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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { WishlistsService } from './wishlists.service';
import { ListingResponseDto } from '../listings/dto/listing-response.dto';

class CreateWishlistDto {
  @IsString()
  @Length(1, 120)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 8)
  emoji?: string;
}

class AddItemDto {
  @IsUUID()
  listingId: string;
}

@ApiTags('wishlists')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'wishlists', version: '1' })
export class WishlistsController {
  constructor(private readonly service: WishlistsService) {}

  @Get('my')
  @ApiOperation({ summary: "Current user's wishlists with items preview." })
  async my(@CurrentUser() user: RequestUser) {
    const lists = await this.service.listForUser(user.id);
    return {
      data: lists.map((l) => ({
        id: l.id,
        name: l.name,
        emoji: l.emoji,
        isDefault: l.isDefault,
        itemCount: l.items?.length ?? 0,
        listingIds: (l.items ?? []).map((i) => i.listingId),
        createdAt: l.createdAt,
      })),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new wishlist.' })
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateWishlistDto) {
    return this.service.create(user.id, dto.name, dto.emoji);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a wishlist / update emoji.' })
  async rename(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateWishlistDto,
  ) {
    return this.service.rename(id, user.id, dto.name, dto.emoji);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a wishlist (default list cannot be deleted).' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ deleted: true }> {
    await this.service.remove(id, user.id);
    return { deleted: true };
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a listing to a wishlist.' })
  async addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: AddItemDto,
  ) {
    return this.service.addItem(id, user.id, dto.listingId);
  }

  @Delete(':id/items/:listingId')
  @ApiOperation({ summary: 'Remove a listing from a wishlist.' })
  async removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ removed: true }> {
    await this.service.removeItem(id, user.id, listingId);
    return { removed: true };
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Full listings inside a wishlist.' })
  async items(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const listings = await this.service.listItems(id, user.id);
    return { data: listings.map(ListingResponseDto.fromEntity) };
  }
}
