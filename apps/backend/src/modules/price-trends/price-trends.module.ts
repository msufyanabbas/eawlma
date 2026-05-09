import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ListingEntity } from '../listings/entities/listing.entity';

import { PriceTrendsService } from './price-trends.service';
import { PriceTrendsController } from './price-trends.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ListingEntity])],
  providers: [PriceTrendsService],
  controllers: [PriceTrendsController],
  exports: [PriceTrendsService],
})
export class PriceTrendsModule {}
