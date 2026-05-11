import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AIPricingService, PriceSuggestionResult } from './ai-pricing.service';

class SuggestPriceDto {
  @IsString()
  @Length(1, 100)
  city: string;

  @IsString()
  @Length(1, 32)
  propertyType: string;

  @IsNumber()
  @Min(1)
  areaSqm: number;

  @IsInt()
  @Min(0)
  bedrooms: number;

  @IsInt()
  @Min(0)
  bathrooms: number;

  @IsOptional()
  @IsString()
  @Length(0, 150)
  district?: string;

  @IsIn(['sale', 'rent'])
  transactionType: 'sale' | 'rent';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}

@ApiTags('ai')
@ApiBearerAuth('access-token')
@Controller({ path: 'ai', version: '1' })
@UseGuards(JwtAuthGuard)
export class AIPricingController {
  constructor(private readonly aiPricing: AIPricingService) {}

  @Post('suggest-price')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suggest a sale or rent price for a draft listing based on live comparables.',
  })
  async suggestPrice(@Body() dto: SuggestPriceDto): Promise<PriceSuggestionResult> {
    return this.aiPricing.suggestPrice(dto);
  }
}
