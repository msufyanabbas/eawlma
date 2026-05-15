import { Controller, Get, Headers, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ListingResponseDto } from '../listings/dto/listing-response.dto';
import { ListingsService } from '../listings/listings.service';
import { SearchService } from './search.service';
import { SearchListingsDto } from './dto/search-listings.dto';

@ApiTags('search')
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly listingsService: ListingsService,
  ) {}

  @Public()
  @Get('listings')
  @ApiOperation({ summary: 'Search ACTIVE listings with filters, geo and full-text search' })
  @ApiOkResponse({ description: 'Paginated list of matching listings' })
  async listings(
    @Query() dto: SearchListingsDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const result = await this.searchService.searchListings(dto);
    const dtos = result.data.map(ListingResponseDto.fromEntity);

    // Translate titles/descriptions into the viewer's locale in parallel.
    // The service short-circuits when the locale matches the source — that's
    // the hot path for AR viewers since most listings originate in Arabic.
    const translated = await Promise.all(
      dtos.map((d) => this.listingsService.attachTranslatedCopy(d, acceptLanguage)),
    );

    return {
      data: translated,
      meta: result.meta,
    };
  }
}
