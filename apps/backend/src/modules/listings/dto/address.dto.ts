import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

export class AddressDto {
  @ApiProperty({ example: 'SA', description: 'ISO-3166 alpha-2 country code' })
  @IsString()
  @Length(2, 2)
  country: string;

  @ApiProperty({ example: 'الرياض' })
  @IsString()
  @Length(1, 100)
  region: string;

  @ApiProperty({ example: 'الرياض' })
  @IsString()
  @Length(1, 100)
  city: string;

  @ApiPropertyOptional({ example: 'حي العليا' })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  street?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 32)
  buildingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 16)
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 32)
  additionalNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  formatted?: string;
}

export class GeoPointDto {
  @ApiProperty({ example: 24.7136 })
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 46.6753 })
  @Type(() => Number)
  @IsLongitude()
  lng: number;
}

export class GeoBoundsDto {
  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  @IsNotEmpty()
  northEast: GeoPointDto;

  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  @IsNotEmpty()
  southWest: GeoPointDto;
}

export class FeaturesDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() bedrooms?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() bathrooms?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() area?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() landArea?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() parkingSpaces?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() floors?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() floorNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() yearBuilt?: number;
  @ApiPropertyOptional() @IsOptional() furnishing?: string;
  @ApiPropertyOptional() @IsOptional() hasElevator?: boolean;
  @ApiPropertyOptional() @IsOptional() hasPool?: boolean;
  @ApiPropertyOptional() @IsOptional() hasGarden?: boolean;
  @ApiPropertyOptional() @IsOptional() hasGym?: boolean;
  @ApiPropertyOptional() @IsOptional() hasMaidRoom?: boolean;
  @ApiPropertyOptional() @IsOptional() hasDriverRoom?: boolean;
  @ApiPropertyOptional() @IsOptional() hasCentralAC?: boolean;
  @ApiPropertyOptional() @IsOptional() hasKitchenAppliances?: boolean;
  @ApiPropertyOptional() @IsOptional() hasSecurity?: boolean;
  @ApiPropertyOptional() @IsOptional() isCornerUnit?: boolean;
}
