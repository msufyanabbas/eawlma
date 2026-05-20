import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ListingEntity } from './entities/listing.entity';
import { ListingMediaEntity } from './entities/listing-media.entity';
import { ListingTranslationEntity } from './entities/listing-translation.entity';
import { AmenityEntity } from './entities/amenity.entity';
import { TagEntity } from './entities/tag.entity';
import { ListingPriceOverrideEntity } from './entities/listing-price-override.entity';

import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { ListingPricingService } from './listing-pricing.service';
import { ListingPricingController } from './listing-pricing.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TranslationModule } from '../translation/translation.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ListingEntity,
      ListingMediaEntity,
      ListingTranslationEntity,
      AmenityEntity,
      TagEntity,
      ListingPriceOverrideEntity,
    ]),
    forwardRef(() => SubscriptionsModule),
    NotificationsModule,
    TranslationModule,
    ModerationModule,
  ],
  providers: [ListingsService, ListingPricingService],
  controllers: [ListingsController, ListingPricingController],
  exports: [ListingsService, ListingPricingService, TypeOrmModule],
})
export class ListingsModule {}
