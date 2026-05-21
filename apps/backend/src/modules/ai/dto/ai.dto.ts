import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class EnhanceDescriptionDto {
  @ApiProperty({ minLength: 20, maxLength: 5000 })
  @IsString()
  @Length(20, 5000)
  text: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @Length(2, 8)
  locale?: string;
}

export class BrowseHistoryEntryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') listingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) propertyType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) district?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 30) visitedAt?: string;
}

export class RecommendationsDto {
  @ApiProperty({ type: [String], description: 'Candidate listing UUIDs to rank' })
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  candidateIds: string[];

  @ApiPropertyOptional({ type: [BrowseHistoryEntryDto], description: 'Recent browse history' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BrowseHistoryEntryDto)
  history?: BrowseHistoryEntryDto[];
}

export class TranslateListingDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Optional override of target locales; defaults to all 30 supported.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Length(2, 8, { each: true })
  targetLocales?: string[];
}

export class EnhanceDescriptionResponseDto {
  @ApiProperty() enhanced: string;
  @ApiProperty({ description: 'True when produced by live AI (Amazon Bedrock); false for stub' })
  live: boolean;
}
