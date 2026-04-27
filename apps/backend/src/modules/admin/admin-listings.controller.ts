import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@aqarat/shared-types';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

import { ListingResponseDto } from '../listings/dto/listing-response.dto';
import { ModerationService } from './moderation.service';
import { ApproveListingDto, RejectListingDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Controller({ path: 'admin/listings', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AdminListingsController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Paginated moderation queue — listings awaiting review' })
  @ApiOkResponse()
  async pending(@Query() pagination: PaginationQueryDto) {
    const result = await this.moderationService.pendingListings(
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
    return {
      data: result.data.map(ListingResponseDto.fromEntity),
      meta: result.meta,
    };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending listing — flips status to ACTIVE and notifies the agent' })
  @ApiOkResponse({ type: ListingResponseDto })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: ApproveListingDto,
  ): Promise<ListingResponseDto> {
    const listing = await this.moderationService.approveListing(
      id,
      { id: actor.id, email: actor.email },
      dto.internalNote,
    );
    return ListingResponseDto.fromEntity(listing);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending listing — requires a reason; notifies agent' })
  @ApiOkResponse({ type: ListingResponseDto })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: RejectListingDto,
  ): Promise<ListingResponseDto> {
    const listing = await this.moderationService.rejectListing(
      id,
      { id: actor.id, email: actor.email },
      dto.reason,
      dto.internalNote,
    );
    return ListingResponseDto.fromEntity(listing);
  }
}
