import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ListingResponseDto } from '../listings/dto/listing-response.dto';
import { SearchService } from './search.service';
import { SearchListingsDto } from './dto/search-listings.dto';

@ApiTags('search')
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get('listings')
  @ApiOperation({ summary: 'Search ACTIVE listings with filters, geo and full-text search' })
  @ApiOkResponse({ description: 'Paginated list of matching listings' })
  async listings(@Query() dto: SearchListingsDto) {
    const result = await this.searchService.searchListings(dto);
    return {
      data: result.data.map(ListingResponseDto.fromEntity),
      meta: result.meta,
    };
  }
}
