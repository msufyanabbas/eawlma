import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ListingFurnishing,
  ListingStatus,
  ListingType,
  MediaType,
  PropertyType,
  RentPeriod,
  type CancellationPolicy,
  type ShortTermAmenities,
} from '@eawlma/shared-types';
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
  @ApiProperty({ example: 'fr' }) locale: string;
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

  // Server-side machine-translated copy in the viewer's Accept-Language.
  // Populated by the listings/search controllers when the viewer's locale
  // differs from the listing's sourceLocale and no real translation row
  // exists. Absent when no translation was attempted or it failed.
  @ApiPropertyOptional({ nullable: true }) titleTranslated?: string;
  @ApiPropertyOptional({ nullable: true }) descriptionTranslated?: string;

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

  // Short-term / hospitality
  @ApiProperty({ enum: ['long_term', 'short_term', 'daily'] })
  bookingType: 'long_term' | 'short_term' | 'daily';
  @ApiPropertyOptional({ nullable: true }) dailyRate: number | null;
  @ApiPropertyOptional({ nullable: true }) weeklyRate: number | null;
  @ApiPropertyOptional({ nullable: true }) minimumStay: number | null;
  @ApiPropertyOptional({ type: String, nullable: true }) availableFrom: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) availableTo: string | null;
  @ApiPropertyOptional({ nullable: true }) maxGuests: number | null;
  @ApiPropertyOptional({ nullable: true, type: 'object', additionalProperties: true })
  amenitiesDetailed: ShortTermAmenities | null;
  @ApiPropertyOptional({ nullable: true }) houseRules: string | null;
  @ApiProperty() checkInTime: string;
  @ApiProperty() checkOutTime: string;
  @ApiProperty() instantBook: boolean;
  @ApiPropertyOptional({ nullable: true, enum: ['flexible', 'moderate', 'strict'] })
  cancellationPolicy: CancellationPolicy | null;
  @ApiPropertyOptional({ nullable: true }) hotelStarRating: number | null;
  @ApiPropertyOptional({ nullable: true }) hotelName: string | null;
  @ApiPropertyOptional({ nullable: true }) damageDeposit: number | null;
  /** Private check-in instructions — populated only on the owner's view. */
  @ApiPropertyOptional({ nullable: true }) checkInInstructions: string | null;

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

  /** City-level amenity counts (curated averages — see NearbyService).
   *  Attached by the listing-detail controller; absent on list endpoints. */
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'number' },
    nullable: true,
    example: { schools: 8, hospitals: 4, malls: 3, mosques: 12, restaurants: 25 },
  })
  nearbyCounts?: {
    schools: number;
    hospitals: number;
    malls: number;
    mosques: number;
    restaurants: number;
  };

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
    dto.bookingType = l.bookingType ?? 'long_term';
    dto.dailyRate = l.dailyRate !== null ? Number(l.dailyRate) : null;
    dto.weeklyRate = l.weeklyRate !== null ? Number(l.weeklyRate) : null;
    dto.minimumStay = l.minimumStay ?? null;
    dto.availableFrom = l.availableFrom;
    dto.availableTo = l.availableTo;
    dto.maxGuests = l.maxGuests;
    dto.amenitiesDetailed = l.amenitiesDetailed;
    dto.houseRules = l.houseRules;
    dto.checkInTime = l.checkInTime ?? '15:00';
    dto.checkOutTime = l.checkOutTime ?? '11:00';
    dto.instantBook = !!l.instantBook;
    dto.cancellationPolicy = l.cancellationPolicy;
    dto.hotelStarRating = l.hotelStarRating;
    dto.hotelName = l.hotelName;
    dto.damageDeposit = l.damageDeposit !== null && l.damageDeposit !== undefined
      ? Number(l.damageDeposit)
      : null;
    // Public listings hide the private check-in instructions; controllers
    // that serve the owner/buyer-after-booking view set this explicitly.
    dto.checkInInstructions = null;
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
