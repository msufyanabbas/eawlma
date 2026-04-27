import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';
import { MediaType } from '@aqarat/shared-types';

export class CreateListingMediaDto {
  @ApiProperty({ enum: MediaType })
  @IsEnum(MediaType)
  type: MediaType;

  @ApiProperty({ description: 'Public URL to the asset (CDN, S3, etc.)' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @Length(8, 1024)
  url: string;

  @ApiPropertyOptional({ description: 'Smaller preview/thumbnail URL' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @Length(8, 1024)
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  caption?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 999, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  position?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationSeconds?: number;
}

export class ReorderListingMediaDto {
  @ApiProperty({ type: [String], description: 'Media IDs in their new visual order' })
  mediaIds: string[];
}
