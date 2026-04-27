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
  createdAt: string;
  updatedAt: string;
  media: ListingMedia[];
  translations: ListingTranslation[];
  amenityIds: string[];
  tagIds: string[];
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
