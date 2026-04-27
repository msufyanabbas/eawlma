import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ListingStatus } from '@aqarat/shared-types';
import { CreateListingDto } from './create-listing.dto';

export class UpdateListingDto extends PartialType(CreateListingDto) {
  @ApiPropertyOptional({
    enum: ListingStatus,
    description: 'Optional status transition. Only DRAFT → PENDING_REVIEW or back to DRAFT is allowed via this endpoint; admin/moderator endpoints handle other transitions.',
  })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;
}
