import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ListingFurnishing,
  ListingStatus,
  ListingType,
  Locale,
  MediaType,
  PropertyType,
  RentPeriod,
} from '@aqarat/shared-types';
import { ListingEntity } from '../entities/listing.entity';
import { ListingMediaEntity } from '../entities/listing-media.entity';
import { ListingTranslationEntity } from '../entities/listing-translation.entity';

export class ListingMediaResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: MediaType }) type: MediaType;
  @ApiProperty() url: string;
  @ApiPropertyOptional({ nullable: true }) thumbnailUrl: string | null;
  @ApiPropertyOptional({ nullable: true }) caption: string | null;
  @ApiProperty() position: number;
  @ApiPropertyOptional({ nullable: true }) width: number | null;
  @ApiPropertyOptional({ nullable: true }) height: number | null;
  @ApiPropertyOptional({ nullable: true }) durationSeconds: number | null;

  static fromEntity(m: ListingMediaEntity): ListingMediaResponseDto {
    const dto = new ListingMediaResponseDto();
    dto.id = m.id;
    dto.type = m.type;
    dto.url = m.url;
    dto.thumbnailUrl = m.thumbnailUrl;
    dto.caption = m.caption;
    dto.position = m.position;
    dto.width = m.width;
    dto.height = m.height;
    dto.durationSeconds = m.durationSeconds;
    return dto;
  }
}

export class ListingTranslationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: Locale }) locale: Locale;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() isMachineTranslated: boolean;
  @ApiPropertyOptional({ type: String, nullable: true }) translatedAt: Date | null;

  static fromEntity(t: ListingTranslationEntity): ListingTranslationResponseDto {
    const dto = new ListingTranslationResponseDto();
    dto.id = t.id;
    dto.locale = t.locale;
    dto.title = t.title;
    dto.description = t.description;
    dto.isMachineTranslated = t.isMachineTranslated;
    dto.translatedAt = t.translatedAt;
    return dto;
  }
}

export class ListingResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() referenceCode: string;
  @ApiProperty({ enum: ListingType }) type: ListingType;
  @ApiProperty({ enum: PropertyType }) propertyType: PropertyType;
  @ApiProperty({ enum: ListingStatus }) status: ListingStatus;
  @ApiProperty() sourceLocale: string;

  @ApiProperty() title: string;
  @ApiProperty() description: string;

  @ApiProperty() price: number;
  @ApiProperty() currency: string;
  @ApiPropertyOptional({ enum: RentPeriod, nullable: true }) rentPeriod: RentPeriod | null;
  @ApiProperty() isNegotiable: boolean;

  @ApiPropertyOptional({ nullable: true }) bedrooms: number | null;
  @ApiPropertyOptional({ nullable: true }) bathrooms: number | null;
  @ApiPropertyOptional({ nullable: true }) area: number | null;
  @ApiPropertyOptional({ nullable: true }) landArea: number | null;
  @ApiPropertyOptional({ nullable: true }) parkingSpaces: number | null;
  @ApiPropertyOptional({ nullable: true }) floors: number | null;
  @ApiPropertyOptional({ nullable: true }) floorNumber: number | null;
  @ApiPropertyOptional({ nullable: true }) yearBuilt: number | null;
  @ApiPropertyOptional({ enum: ListingFurnishing, nullable: true }) furnishing: ListingFurnishing | null;

  @ApiProperty() hasElevator: boolean;
  @ApiProperty() hasPool: boolean;
  @ApiProperty() hasGarden: boolean;
  @ApiProperty() hasGym: boolean;
  @ApiProperty() hasMaidRoom: boolean;
  @ApiProperty() hasDriverRoom: boolean;
  @ApiProperty() hasCentralAC: boolean;
  @ApiProperty() hasKitchenAppliances: boolean;
  @ApiProperty() hasSecurity: boolean;
  @ApiProperty() isCornerUnit: boolean;

  @ApiProperty() country: string;
  @ApiProperty() region: string;
  @ApiProperty() city: string;
  @ApiPropertyOptional({ nullable: true }) district: string | null;
  @ApiProperty({ type: 'object', additionalProperties: true }) address: Record<string, unknown>;
  @ApiProperty() lat: number;
  @ApiProperty() lng: number;

  @ApiProperty() ownerId: string;
  @ApiPropertyOptional({ nullable: true }) agencyId: string | null;

  @ApiProperty() isFeatured: boolean;
  @ApiPropertyOptional({ type: String, nullable: true }) featuredUntil: Date | null;
  @ApiProperty() viewCount: number;
  @ApiProperty() inquiryCount: number;
  @ApiProperty() saveCount: number;

  @ApiPropertyOptional({ type: String, nullable: true }) publishedAt: Date | null;
  @ApiPropertyOptional({ type: String, nullable: true }) expiresAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) rejectionReason: string | null;

  @ApiProperty({ type: String }) createdAt: Date;
  @ApiProperty({ type: String }) updatedAt: Date;

  @ApiProperty({ type: [ListingMediaResponseDto] })
  media: ListingMediaResponseDto[];

  @ApiProperty({ type: [ListingTranslationResponseDto] })
  translations: ListingTranslationResponseDto[];

  @ApiProperty({ type: [String] })
  amenityIds: string[];

  @ApiProperty({ type: [String] })
  tagIds: string[];

  static fromEntity(l: ListingEntity): ListingResponseDto {
    const dto = new ListingResponseDto();
    dto.id = l.id;
    dto.referenceCode = l.referenceCode;
    dto.type = l.type;
    dto.propertyType = l.propertyType;
    dto.status = l.status;
    dto.sourceLocale = l.sourceLocale;
    dto.title = l.title;
    dto.description = l.description;
    dto.price = Number(l.price);
    dto.currency = l.currency;
    dto.rentPeriod = l.rentPeriod;
    dto.isNegotiable = l.isNegotiable;
    dto.bedrooms = l.bedrooms;
    dto.bathrooms = l.bathrooms;
    dto.area = l.area !== null ? Number(l.area) : null;
    dto.landArea = l.landArea !== null ? Number(l.landArea) : null;
    dto.parkingSpaces = l.parkingSpaces;
    dto.floors = l.floors;
    dto.floorNumber = l.floorNumber;
    dto.yearBuilt = l.yearBuilt;
    dto.furnishing = l.furnishing;
    dto.hasElevator = l.hasElevator;
    dto.hasPool = l.hasPool;
    dto.hasGarden = l.hasGarden;
    dto.hasGym = l.hasGym;
    dto.hasMaidRoom = l.hasMaidRoom;
    dto.hasDriverRoom = l.hasDriverRoom;
    dto.hasCentralAC = l.hasCentralAC;
    dto.hasKitchenAppliances = l.hasKitchenAppliances;
    dto.hasSecurity = l.hasSecurity;
    dto.isCornerUnit = l.isCornerUnit;
    dto.country = l.country;
    dto.region = l.region;
    dto.city = l.city;
    dto.district = l.district;
    dto.address = l.address;
    dto.lat = Number(l.lat);
    dto.lng = Number(l.lng);
    dto.ownerId = l.ownerId;
    dto.agencyId = l.agencyId;
    dto.isFeatured = l.isFeatured;
    dto.featuredUntil = l.featuredUntil;
    dto.viewCount = l.viewCount;
    dto.inquiryCount = l.inquiryCount;
    dto.saveCount = l.saveCount;
    dto.publishedAt = l.publishedAt;
    dto.expiresAt = l.expiresAt;
    dto.rejectionReason = l.rejectionReason;
    dto.createdAt = l.createdAt;
    dto.updatedAt = l.updatedAt;
    dto.media = (l.media ?? []).map(ListingMediaResponseDto.fromEntity);
    dto.translations = (l.translations ?? []).map(ListingTranslationResponseDto.fromEntity);
    dto.amenityIds = (l.amenities ?? []).map((a) => a.id);
    dto.tagIds = (l.tags ?? []).map((t) => t.id);
    return dto;
  }
}
