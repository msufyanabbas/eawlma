import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ListingEntity } from '../listings/entities/listing.entity';
import { SitemapController } from './sitemap.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ListingEntity])],
  controllers: [SitemapController],
})
export class SeoModule {}
