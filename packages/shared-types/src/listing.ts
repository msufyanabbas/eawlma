import {
  ListingFurnishing,
  ListingStatus,
  ListingType,
  Locale,
  MediaType,
  PropertyType,
  RentPeriod,
  ListingSortField,
  SortOrder,
  type CancellationPolicy,
  type RentalType,
} from './enums';
import { Address, GeoBounds, GeoPoint } from './geo';
import { PaginationParams } from './pagination';

export interface ListingMedia {
  id: string;
  listingId: string;
  type: MediaType;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  position: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  createdAt: string;
}

export interface ListingTranslation {
  id: string;
  listingId: string;
  locale: Locale;
  title: string;
  description: string;
  isMachineTranslated: boolean;
  translatedAt: string | null;
}

export interface ListingFeatures {
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;          // m²
  landArea: number | null;      // m² (for villas/land)
  parkingSpaces: number | null;
  floors: number | null;
  floorNumber: number | null;
  yearBuilt: number | null;
  furnishing: ListingFurnishing | null;
  hasElevator: boolean;
  hasPool: boolean;
  hasGarden: boolean;
  hasGym: boolean;
  hasMaidRoom: boolean;
  hasDriverRoom: boolean;
  hasCentralAC: boolean;
  hasKitchenAppliances: boolean;
  hasSecurity: boolean;
  isCornerUnit: boolean;
}

/** Wire shape of a listing, mirroring the backend's ListingResponseDto.
 *  Feature and address fields are denormalised onto the listing for cheap
 *  table/card rendering; the original `address` JSONB is also carried as
 *  `address` for richer detail-page display.
 */
export interface Listing {
  id: string;
  referenceCode: string;
  type: ListingType;
  propertyType: PropertyType;
  status: ListingStatus;
  sourceLocale: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  rentPeriod: RentPeriod | null;
  isNegotiable: boolean;

  // ---- Features (flat) ----
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  landArea: number | null;
  parkingSpaces: number | null;
  floors: number | null;
  floorNumber: number | null;
  yearBuilt: number | null;
  furnishing: ListingFurnishing | null;
  hasElevator: boolean;
  hasPool: boolean;
  hasGarden: boolean;
  hasGym: boolean;
  hasMaidRoom: boolean;
  hasDriverRoom: boolean;
  hasCentralAC: boolean;
  hasKitchenAppliances: boolean;
  hasSecurity: boolean;
  isCornerUnit: boolean;

  // ---- Short-term / hospitality fields ----
  bookingType?: 'long_term' | 'short_term' | 'daily';
  dailyRate?: number | null;
  weeklyRate?: number | null;
  minimumStay?: number | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  maxGuests?: number | null;
  amenitiesDetailed?: ShortTermAmenities | null;
  houseRules?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  instantBook?: boolean;
  cancellationPolicy?: CancellationPolicy | null;
  hotelStarRating?: number | null;
  hotelName?: string | null;
  damageDeposit?: number | null;
  /** Private check-in instructions. Only present on the listing payload for
   *  the agent who owns it; never exposed publicly. */
  checkInInstructions?: string | null;

  // ---- Address (flat for filtering + nested for display) ----
  country: string;
  region: string;
  city: string;
  district: string | null;
  address: Address | Record<string, unknown>;
  lat: number;
  lng: number;

  ownerId: string;
  agencyId: string | null;
  isFeatured: boolean;
  featuredUntil: string | null;
  viewCount: number;
  inquiryCount: number;
  saveCount: number;
  publishedAt: string | null;
  expiresAt: string | null;
  rejectionReason: string | null;
  /** AI moderation verdict, populated on create. Score is 0-100 (higher = worse). */
  moderationScore?: number;
  moderationCategory?: string | null;
  moderationReasons?: string[];
  requiresReview?: boolean;
  createdAt: string;
  updatedAt: string;
  media: ListingMedia[];
  translations: ListingTranslation[];
  amenityIds: string[];
  tagIds: string[];
}

/** Bag of boolean flags for short-term amenities (wifi, pool, breakfast, …).
 *  Stored as JSONB on the backend; keys are stable and extensible. */
export interface ShortTermAmenities {
  wifi?: boolean;
  pool?: boolean;
  parking?: boolean;
  breakfast?: boolean;
  ac?: boolean;
  kitchen?: boolean;
  tv?: boolean;
  washer?: boolean;
  workspace?: boolean;
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  wheelchairAccessible?: boolean;
  [key: string]: boolean | undefined;
}

/** Fields specific to short-term/Airbnb-style + hotel listings. Persisted on
 *  the listing row (not a separate table) since every value is optional and
 *  read in the same payload as the listing detail. */
export interface ShortTermListingFields {
  maxGuests?: number;
  amenitiesDetailed?: ShortTermAmenities;
  houseRules?: string;
  checkInTime?: string;            // HH:mm
  checkOutTime?: string;           // HH:mm
  instantBook?: boolean;
  cancellationPolicy?: CancellationPolicy;
  hotelStarRating?: number;        // 1-5 for hotels
  hotelName?: string;
  dailyRate?: number;
  weeklyRate?: number;
  minimumStay?: number;
  bookingType?: 'long_term' | 'short_term' | 'daily';
  availableFrom?: string;
  availableTo?: string;
  damageDeposit?: number;
  checkInInstructions?: string;
}

export interface CreateListingRequest {
  type: ListingType;
  propertyType: PropertyType;
  title: string;
  description: string;
  locale: Locale;
  price: number;
  currency?: string;
  rentPeriod?: RentPeriod;
  isNegotiable?: boolean;
  features: Partial<ListingFeatures>;
  shortTerm?: ShortTermListingFields;
  address: Address;
  location: GeoPoint;
  amenityIds?: string[];
  tagIds?: string[];
  agencyId?: string;
}

export interface UpdateListingRequest extends Partial<CreateListingRequest> {
  status?: ListingStatus;
}

export interface ListingMediaUploadRequest {
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  position?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export interface ListingSearchParams extends PaginationParams {
  q?: string;
  type?: ListingType;
  propertyTypes?: PropertyType[];
  city?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  furnishing?: ListingFurnishing;
  amenityIds?: string[];
  rentPeriod?: RentPeriod;
  bounds?: GeoBounds;
  near?: GeoPoint;
  radiusKm?: number;
  agencyId?: string;
  agentId?: string;
  isFeatured?: boolean;
  status?: ListingStatus;
  sortBy?: ListingSortField;
  sortOrder?: SortOrder;
  locale?: Locale;
  rentalType?: RentalType;
  minGuests?: number;
  hotelStarRating?: number;
  instantBookOnly?: boolean;
  checkIn?: string;
  checkOut?: string;
}

export interface Amenity {
  id: string;
  key: string;            // stable key e.g. "pool"
  nameAr: string;
  nameEn: string;
  icon: string | null;
  category: string;       // e.g. "indoor", "outdoor", "security"
}

export interface Tag {
  id: string;
  key: string;
  nameAr: string;
  nameEn: string;
  color: string | null;
}

export interface SavedListing {
  id: string;
  userId: string;
  listingId: string;
  notes: string | null;
  createdAt: string;
}
