import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ListingFurnishing,
  ListingType,
  Locale,
  PropertyType,
  RentPeriod,
  type CancellationPolicy,
  type ShortTermAmenities,
} from '@eawlma/shared-types';
import { AddressDto, FeaturesDto, GeoPointDto } from './address.dto';

export class ShortTermFieldsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  maxGuests?: number;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  amenitiesDetailed?: ShortTermAmenities;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 4000)
  houseRules?: string;

  @ApiPropertyOptional({ example: '15:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  checkInTime?: string;

  @ApiPropertyOptional({ example: '11:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  checkOutTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  instantBook?: boolean;

  @ApiPropertyOptional({ enum: ['flexible', 'moderate', 'strict'] })
  @IsOptional()
  @IsIn(['flexible', 'moderate', 'strict'])
  cancellationPolicy?: CancellationPolicy;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  hotelStarRating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 200)
  hotelName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  weeklyRate?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minimumStay?: number;

  @ApiPropertyOptional({ enum: ['long_term', 'short_term', 'daily'] })
  @IsOptional()
  @IsIn(['long_term', 'short_term', 'daily'])
  bookingType?: 'long_term' | 'short_term' | 'daily';
}

export class CreateListingDto {
  @ApiProperty({ enum: ListingType })
  @IsEnum(ListingType)
  type: ListingType;

  @ApiProperty({ enum: PropertyType })
  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @ApiProperty({ example: 'فيلا فاخرة في حي الياسمين' })
  @IsString()
  @Length(5, 200)
  title: string;

  @ApiProperty({ example: 'وصف تفصيلي للعقار...' })
  @IsString()
  @Length(20, 5000)
  description: string;

  @ApiProperty({ enum: Locale, default: Locale.AR, description: 'Source language of the title/description' })
  @IsEnum(Locale)
  locale: Locale;

  @ApiProperty({ example: 1500000 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ example: 'SAR', default: 'SAR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ enum: RentPeriod })
  @IsOptional()
  @IsEnum(RentPeriod)
  rentPeriod?: RentPeriod;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isNegotiable?: boolean;

  @ApiProperty({ type: FeaturesDto })
  @ValidateNested()
  @Type(() => FeaturesDto)
  features: FeaturesDto;

  @ApiPropertyOptional({ type: ShortTermFieldsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShortTermFieldsDto)
  shortTerm?: ShortTermFieldsDto;

  @ApiPropertyOptional({ enum: ListingFurnishing })
  @IsOptional()
  @IsEnum(ListingFurnishing)
  furnishing?: ListingFurnishing;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  location: GeoPointDto;

  @ApiPropertyOptional({ type: [String], description: 'Amenity IDs', maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  amenityIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Tag IDs', maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  agencyId?: string;
}
