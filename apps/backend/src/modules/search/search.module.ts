import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [ListingsModule],
  providers: [SearchService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
