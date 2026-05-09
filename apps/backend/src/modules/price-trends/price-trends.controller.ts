import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';

import { PriceTrendsService } from './price-trends.service';

@ApiTags('price-trends')
@Controller({ path: 'price-trends', version: '1' })
export class PriceTrendsController {
  constructor(private readonly priceTrends: PriceTrendsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Monthly price trend for a city + property type (12 months).' })
  async trends(
    @Query('city') city = 'Riyadh',
    @Query('type') type = 'apartment',
  ) {
    return this.priceTrends.getPriceTrends(city, type);
  }

  @Public()
  @Get('area-insights')
  @ApiOperation({ summary: 'Avg price per m² per district inside a city.' })
  async area(@Query('city') city = 'Riyadh') {
    return this.priceTrends.getAreaInsights(city);
  }
}
