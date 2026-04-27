import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ListingEntity } from './entities/listing.entity';
import { ListingMediaEntity } from './entities/listing-media.entity';
import { ListingTranslationEntity } from './entities/listing-translation.entity';
import { AmenityEntity } from './entities/amenity.entity';
import { TagEntity } from './entities/tag.entity';

import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ListingEntity,
      ListingMediaEntity,
      ListingTranslationEntity,
      AmenityEntity,
      TagEntity,
    ]),
  ],
  providers: [ListingsService],
  controllers: [ListingsController],
  exports: [ListingsService, TypeOrmModule],
})
export class ListingsModule {}
