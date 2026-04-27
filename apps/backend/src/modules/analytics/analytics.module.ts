import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingDailyMetricEntity } from './entities/listing-daily-metric.entity';
import { ListingEntity } from '../listings/entities/listing.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsConsumer } from './analytics.consumer';

@Module({
  imports: [TypeOrmModule.forFeature([ListingDailyMetricEntity, ListingEntity])],
  providers: [AnalyticsService, AnalyticsConsumer],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
