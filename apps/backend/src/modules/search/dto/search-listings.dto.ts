import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  ListingFurnishing,
  ListingSortField,
  ListingType,
  PropertyType,
  RentPeriod,
  SortOrder,
} from '@eawlma/shared-types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
};

const toBool = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
};

export class SearchListingsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Free-text query against title + description' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  q?: string;

  @ApiPropertyOptional({ enum: ListingType })
  @IsOptional()
  @IsEnum(ListingType)
  type?: ListingType;

  @ApiPropertyOptional({ enum: PropertyType, isArray: true, description: 'Comma-separated or repeat param' })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @ArrayMaxSize(20)
  @IsEnum(PropertyType, { each: true })
  propertyTypes?: PropertyType[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 150)
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minBedrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxBedrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minBathrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minArea?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxArea?: number;

  @ApiPropertyOptional({ enum: ListingFurnishing })
  @IsOptional()
  @IsEnum(ListingFurnishing)
  furnishing?: ListingFurnishing;

  @ApiPropertyOptional({ type: [String], description: 'Amenity IDs (comma-separated)' })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  amenityIds?: string[];

  @ApiPropertyOptional({ enum: RentPeriod })
  @IsOptional()
  @IsEnum(RentPeriod)
  rentPeriod?: RentPeriod;

  // Bounding box (north-east + south-west)
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLatitude() neLat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLongitude() neLng?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLatitude() swLat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLongitude() swLng?: number;

  // Radius search (centre + km)
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLatitude() centerLat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLongitude() centerLng?: number;

  @ApiPropertyOptional({ minimum: 0.1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(200)
  radiusKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  agencyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  agentId?: string;

  @ApiPropertyOptional({ description: 'Only return featured listings' })
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ enum: ListingSortField, default: ListingSortField.CREATED_AT })
  @IsOptional()
  @IsEnum(ListingSortField)
  sortField?: ListingSortField = ListingSortField.CREATED_AT;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
