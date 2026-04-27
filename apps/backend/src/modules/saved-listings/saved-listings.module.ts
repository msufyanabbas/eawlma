import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedListingEntity } from './entities/saved-listing.entity';
import { ListingEntity } from '../listings/entities/listing.entity';
import { SavedListingsService } from './saved-listings.service';
import { SavedListingsController } from './saved-listings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SavedListingEntity, ListingEntity])],
  providers: [SavedListingsService],
  controllers: [SavedListingsController],
  exports: [SavedListingsService],
})
export class SavedListingsModule {}
