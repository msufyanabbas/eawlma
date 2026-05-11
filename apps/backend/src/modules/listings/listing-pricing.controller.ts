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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, Length, Matches, Min } from 'class-validator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { ListingPricingService } from './listing-pricing.service';

class CreatePriceOverridesDto {
  @IsArray()
  @ArrayMinSize(1)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true })
  dates: string[];

  @IsNumber()
  @Min(1)
  price: number;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  reason?: string;
}

@ApiTags('listings')
@Controller({ path: 'listings', version: '1' })
export class ListingPricingController {
  constructor(private readonly pricing: ListingPricingService) {}

  @Public()
  @Get(':id/price-calendar')
  @ApiOperation({ summary: 'Month-by-month price calendar for a listing.' })
  async calendar(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('month') month?: string,
  ) {
    const m = month ?? new Date().toISOString().slice(0, 7);
    return this.pricing.calendar(id, m);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post(':id/price-overrides')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set custom prices for specific dates.' })
  async upsertOverrides(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreatePriceOverridesDto,
  ) {
    return this.pricing.upsertOverrides(id, actor, dto.dates, dto.price, dto.reason);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Delete(':id/price-overrides/:date')
  @ApiOperation({ summary: 'Remove a price override for a specific date.' })
  async removeOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('date') date: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<{ removed: true }> {
    await this.pricing.removeOverride(id, actor, date);
    return { removed: true };
  }
}
