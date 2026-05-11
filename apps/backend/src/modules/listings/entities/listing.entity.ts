import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import {
  ListingFurnishing,
  ListingStatus,
  ListingType,
  PropertyType,
  RentPeriod,
  type CancellationPolicy,
  type ShortTermAmenities,
} from '@eawlma/shared-types';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { AmenityEntity } from './amenity.entity';
import { TagEntity } from './tag.entity';
import { ListingMediaEntity } from './listing-media.entity';
import { ListingTranslationEntity } from './listing-translation.entity';

@Entity({ name: 'listings' })
@Index('idx_listings_owner', ['ownerId'])
@Index('idx_listings_status', ['status'])
@Index('idx_listings_type_status', ['type', 'status'])
@Index('idx_listings_property_type', ['propertyType'])
@Index('idx_listings_city', ['city'])
@Index('idx_listings_district', ['district'])
@Index('idx_listings_price', ['price'])
@Index('idx_listings_published_at', ['publishedAt'])
@Index('idx_listings_geo', ['lat', 'lng'])
@Index('uq_listings_reference', ['referenceCode'], { unique: true })
export class ListingEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 32, name: 'reference_code' })
  referenceCode: string;

  @Column({ type: 'enum', enum: ListingType })
  type: ListingType;

  @Column({ type: 'enum', enum: PropertyType, name: 'property_type' })
  propertyType: PropertyType;

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.DRAFT })
  status: ListingStatus;

  @Column({ type: 'varchar', length: 8, name: 'source_locale', default: 'ar' })
  sourceLocale: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  // ----- Pricing -------------------------------------------------------------

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 3, default: 'SAR' })
  currency: string;

  @Column({ type: 'enum', enum: RentPeriod, name: 'rent_period', nullable: true })
  rentPeriod: RentPeriod | null;

  @Column({ type: 'boolean', name: 'is_negotiable', default: false })
  isNegotiable: boolean;

  // ----- Booking type (long-term / short-term / daily) ---------------------
  // `daily` listings (chalets, rest houses, furnished short stays) get the
  // calendar-based booking flow on the listing detail; the others keep the
  // standard inquiry form.

  @Column({ type: 'varchar', length: 16, name: 'booking_type', default: 'long_term' })
  bookingType: 'long_term' | 'short_term' | 'daily';

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'daily_rate', nullable: true })
  dailyRate: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'weekly_rate', nullable: true })
  weeklyRate: number | null;

  @Column({ type: 'integer', name: 'minimum_stay', default: 1 })
  minimumStay: number;

  @Column({ type: 'date', name: 'available_from', nullable: true })
  availableFrom: string | null;

  @Column({ type: 'date', name: 'available_to', nullable: true })
  availableTo: string | null;

  // ----- Short-term / hospitality (Airbnb + hotel) -------------------------
  // Optional fields that only matter for short-term listings. Stored on the
  // listings table directly since the read pattern is "fetch one listing" —
  // a separate table would double the joins for no benefit.

  @Column({ type: 'integer', name: 'max_guests', nullable: true })
  maxGuests: number | null;

  @Column({ type: 'jsonb', name: 'amenities_detailed', nullable: true })
  amenitiesDetailed: ShortTermAmenities | null;

  @Column({ type: 'text', name: 'house_rules', nullable: true })
  houseRules: string | null;

  @Column({ type: 'varchar', length: 8, name: 'check_in_time', default: '15:00' })
  checkInTime: string;

  @Column({ type: 'varchar', length: 8, name: 'check_out_time', default: '11:00' })
  checkOutTime: string;

  @Column({ type: 'boolean', name: 'instant_book', default: false })
  instantBook: boolean;

  @Column({ type: 'varchar', length: 16, name: 'cancellation_policy', nullable: true })
  cancellationPolicy: CancellationPolicy | null;

  @Column({ type: 'integer', name: 'hotel_star_rating', nullable: true })
  hotelStarRating: number | null;

  @Column({ type: 'varchar', length: 200, name: 'hotel_name', nullable: true })
  hotelName: string | null;

  /** Refundable damage deposit charged on top of the stay total at booking time.
   *  Held by the platform until check-out + a 24h claim window. */
  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'damage_deposit', default: 0 })
  damageDeposit: string;

  /** Private check-in directions revealed to guests *only* after a booking is
   *  confirmed. Never exposed on the public listing detail. */
  @Column({ type: 'text', name: 'check_in_instructions', nullable: true })
  checkInInstructions: string | null;

  // ----- Features (denormalized for fast filtering) --------------------------

  @Column({ type: 'integer', nullable: true })
  bedrooms: number | null;

  @Column({ type: 'integer', nullable: true })
  bathrooms: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  area: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'land_area', nullable: true })
  landArea: number | null;

  @Column({ type: 'integer', name: 'parking_spaces', nullable: true })
  parkingSpaces: number | null;

  @Column({ type: 'integer', nullable: true })
  floors: number | null;

  @Column({ type: 'integer', name: 'floor_number', nullable: true })
  floorNumber: number | null;

  @Column({ type: 'integer', name: 'year_built', nullable: true })
  yearBuilt: number | null;

  @Column({ type: 'enum', enum: ListingFurnishing, nullable: true })
  furnishing: ListingFurnishing | null;

  // Boolean amenities denormalized for cheap filtering
  @Column({ type: 'boolean', name: 'has_elevator', default: false })
  hasElevator: boolean;

  @Column({ type: 'boolean', name: 'has_pool', default: false })
  hasPool: boolean;

  @Column({ type: 'boolean', name: 'has_garden', default: false })
  hasGarden: boolean;

  @Column({ type: 'boolean', name: 'has_gym', default: false })
  hasGym: boolean;

  @Column({ type: 'boolean', name: 'has_maid_room', default: false })
  hasMaidRoom: boolean;

  @Column({ type: 'boolean', name: 'has_driver_room', default: false })
  hasDriverRoom: boolean;

  @Column({ type: 'boolean', name: 'has_central_ac', default: false })
  hasCentralAC: boolean;

  @Column({ type: 'boolean', name: 'has_kitchen_appliances', default: false })
  hasKitchenAppliances: boolean;

  @Column({ type: 'boolean', name: 'has_security', default: false })
  hasSecurity: boolean;

  @Column({ type: 'boolean', name: 'is_corner_unit', default: false })
  isCornerUnit: boolean;

  // ----- Address (also stored as JSONB for richer client display) -----------

  @Column({ type: 'varchar', length: 2, default: 'SA' })
  country: string;

  @Column({ type: 'varchar', length: 100 })
  region: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  district: string | null;

  @Column({ type: 'jsonb' })
  address: Record<string, unknown>;

  // ----- Geo (lat/lng — bounding-box + haversine; PostGIS later) ------------

  @Column({ type: 'double precision' })
  lat: number;

  @Column({ type: 'double precision' })
  lng: number;

  // ----- Ownership -----------------------------------------------------------

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: UserEntity;

  @Column({ type: 'uuid', name: 'agency_id', nullable: true })
  agencyId: string | null;

  // ----- Featured / lifecycle -----------------------------------------------

  @Column({ type: 'boolean', name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ type: 'timestamptz', name: 'featured_until', nullable: true })
  featuredUntil: Date | null;

  @Column({ type: 'integer', name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ type: 'integer', name: 'inquiry_count', default: 0 })
  inquiryCount: number;

  @Column({ type: 'integer', name: 'save_count', default: 0 })
  saveCount: number;

  @Column({ type: 'timestamptz', name: 'published_at', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason: string | null;

  // ----- Relations -----------------------------------------------------------

  @OneToMany(() => ListingMediaEntity, (m) => m.listing, { cascade: ['insert', 'update'] })
  media: ListingMediaEntity[];

  @OneToMany(() => ListingTranslationEntity, (t) => t.listing, { cascade: ['insert', 'update'] })
  translations: ListingTranslationEntity[];

  @ManyToMany(() => AmenityEntity, { cascade: false })
  @JoinTable({
    name: 'listing_amenities',
    joinColumn: { name: 'listing_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'amenity_id', referencedColumnName: 'id' },
  })
  amenities: AmenityEntity[];

  @ManyToMany(() => TagEntity, { cascade: false })
  @JoinTable({
    name: 'listing_tags',
    joinColumn: { name: 'listing_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: TagEntity[];
}
