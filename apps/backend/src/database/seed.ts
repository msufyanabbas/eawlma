/**
 * Seed script — creates a deterministic dev/demo dataset:
 *   • 1 admin (admin@eawlma.sa / Admin123!)
 *   • 6 agents with realistic Saudi names (agent1..6@eawlma.sa / Agent123!)
 *   • 10 ACTIVE listings in Riyadh, mixed property types, prices, owners
 *
 * Run with:  npm run seed   (alias for ts-node + tsconfig-paths)
 *
 * Idempotent: re-running upserts users by email and re-uses the same listing
 * reference codes (EAW-SEED-NN) instead of bumping the production sequence.
 */
import 'reflect-metadata';
import * as argon2 from 'argon2';
import {
  ListingFurnishing,
  ListingStatus,
  ListingType,
  PropertyType,
  RentPeriod,
  MediaType,
  UserRole,
  UserStatus,
} from '@eawlma/shared-types';

import dataSource from './data-source';
import { UserEntity } from '../modules/users/entities/user.entity';
import { ListingEntity } from '../modules/listings/entities/listing.entity';
import { ListingMediaEntity } from '../modules/listings/entities/listing-media.entity';
import { ListingTranslationEntity } from '../modules/listings/entities/listing-translation.entity';
import { ReviewEntity } from '../modules/reviews/entities/review.entity';
import type { CancellationPolicy, ShortTermAmenities } from '@eawlma/shared-types';

const ARGON_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

const RIYADH = { lat: 24.7136, lng: 46.6753 };

// ------------------------------------------------------------------
// Cover-image map per seeded reference code.
// Direct, deterministic — no hashing — guarantees the right photo
// per listing every re-seed.
// ------------------------------------------------------------------

const COVER_IMAGE_BY_REF: Record<string, string> = {
  'EAW-SEED-01': 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80', // apartment
  'EAW-SEED-02': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', // villa
  'EAW-SEED-03': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80', // apartment
  'EAW-SEED-04': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80', // office
  'EAW-SEED-05': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80', // land
  'EAW-SEED-06': 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80', // villa
  'EAW-SEED-07': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80', // apartment
  'EAW-SEED-08': 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80', // studio (was commercial — see spec)
  'EAW-SEED-09': 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80', // townhouse
  'EAW-SEED-10': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80', // office
};

// Same per-property-type defaults as the frontend listingImages helper —
// kept in sync so any future seeds without an explicit map entry still get a
// real-estate image, never a random hashed photo.
const FALLBACK_BY_TYPE: Record<string, string> = {
  apartment: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
  villa:     'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  office:    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  land:      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
  townhouse: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80',
  studio:    'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80',
  commercial:'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80',
  penthouse: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
};

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';

function pickCoverImage(propertyType: PropertyType, refCode: string): string {
  return (
    COVER_IMAGE_BY_REF[refCode] ??
    FALLBACK_BY_TYPE[propertyType] ??
    DEFAULT_COVER
  );
}

// ------------------------------------------------------------------
// Listing specs
// ------------------------------------------------------------------

interface SeedListingSpec {
  ref: string;
  type: ListingType;
  propertyType: PropertyType;
  title: string;
  /** Optional English translation persisted alongside the Arabic source. */
  titleEn?: string;
  description: string;
  /** Optional English description persisted alongside the Arabic source. */
  descriptionEn?: string;
  price: number;
  rentPeriod?: RentPeriod;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  landArea?: number;
  parkingSpaces?: number;
  furnishing?: ListingFurnishing;
  district: string;
  /** Either provide explicit lat/lng OR a Riyadh-relative offset. */
  lat?: number;
  lng?: number;
  latOffset?: number;
  lngOffset?: number;
  /** Override city/region when seeding outside Riyadh. */
  city?: string;
  region?: string;
  hasPool?: boolean;
  hasGym?: boolean;
  hasGarden?: boolean;
  isFeatured?: boolean;
  /** Curated cover image — overrides the ref/type fallback maps. */
  coverImageUrl?: string;
  /** Index into the SEED_AGENTS array — distributes listings across owners. */
  ownerIdx: number;

  // ---- Short-term / hospitality (Airbnb + hotel) ----
  bookingType?: 'long_term' | 'short_term' | 'daily';
  dailyRate?: number;
  weeklyRate?: number;
  minimumStay?: number;
  maxGuests?: number;
  checkInTime?: string;
  checkOutTime?: string;
  cancellationPolicy?: CancellationPolicy;
  instantBook?: boolean;
  houseRules?: string;
  amenitiesDetailed?: ShortTermAmenities;
  hotelName?: string;
  hotelStarRating?: number;
}

const LISTING_SPECS: SeedListingSpec[] = [
  {
    ref: 'EAW-SEED-01',
    type: ListingType.SALE,
    propertyType: PropertyType.APARTMENT,
    title: 'شقة فاخرة في حي الياسمين',
    description: 'شقة فاخرة بإطلالة بانورامية على الرياض، تشطيبات راقية وموقع استراتيجي.',
    price: 950_000,
    bedrooms: 3,
    bathrooms: 2,
    area: 180,
    parkingSpaces: 1,
    furnishing: ListingFurnishing.FURNISHED,
    district: 'حي الياسمين',
    latOffset: 0.012,
    lngOffset: 0.018,
    isFeatured: true,
    ownerIdx: 0,
  },
  {
    ref: 'EAW-SEED-02',
    type: ListingType.SALE,
    propertyType: PropertyType.VILLA,
    title: 'فيلا حديثة 5 غرف في حي قرطبة',
    description: 'فيلا واسعة بمسبح خاص وحديقة، تشطيب فاخر، قريبة من المدارس.',
    price: 3_200_000,
    bedrooms: 5,
    bathrooms: 6,
    area: 520,
    landArea: 600,
    parkingSpaces: 3,
    hasPool: true,
    hasGarden: true,
    furnishing: ListingFurnishing.SEMI_FURNISHED,
    district: 'حي قرطبة',
    latOffset: -0.015,
    lngOffset: 0.022,
    isFeatured: true,
    ownerIdx: 1,
  },
  {
    ref: 'EAW-SEED-03',
    type: ListingType.RENT,
    propertyType: PropertyType.APARTMENT,
    title: 'شقة مفروشة للإيجار في العليا',
    description: 'شقة مفروشة بالكامل، إيجار شهري، خدمات متكاملة، مدخل مستقل.',
    price: 6_500,
    rentPeriod: RentPeriod.MONTHLY,
    bedrooms: 2,
    bathrooms: 2,
    area: 110,
    parkingSpaces: 1,
    furnishing: ListingFurnishing.FURNISHED,
    district: 'حي العليا',
    latOffset: 0.005,
    lngOffset: -0.009,
    isFeatured: true,
    ownerIdx: 2,
  },
  {
    ref: 'EAW-SEED-04',
    type: ListingType.RENT,
    propertyType: PropertyType.OFFICE,
    title: 'مكتب إداري في الملقا',
    description: 'مكتب جاهز للعمل، موقع متميز قرب طريق الملك فهد.',
    price: 12_000,
    rentPeriod: RentPeriod.MONTHLY,
    area: 95,
    parkingSpaces: 2,
    district: 'حي الملقا',
    latOffset: 0.018,
    lngOffset: -0.014,
    ownerIdx: 3,
  },
  {
    ref: 'EAW-SEED-05',
    type: ListingType.SALE,
    propertyType: PropertyType.LAND,
    title: 'أرض سكنية في حي النرجس',
    description: 'أرض في موقع مميز جاهزة للبناء، صك إلكتروني، شارعين.',
    price: 1_800_000,
    landArea: 750,
    district: 'حي النرجس',
    latOffset: 0.024,
    lngOffset: 0.011,
    ownerIdx: 4,
  },
  {
    ref: 'EAW-SEED-06',
    type: ListingType.SALE,
    propertyType: PropertyType.VILLA,
    title: 'فيلا ذكية مع مسبح في حي الندى',
    description: 'فيلا ذكية بمواصفات حديثة، مسبح ساخن، نظام أمان متكامل.',
    price: 4_900_000,
    bedrooms: 6,
    bathrooms: 7,
    area: 720,
    landArea: 800,
    parkingSpaces: 4,
    hasPool: true,
    hasGym: true,
    hasGarden: true,
    furnishing: ListingFurnishing.FURNISHED,
    district: 'حي الندى',
    latOffset: -0.022,
    lngOffset: -0.018,
    isFeatured: true,
    ownerIdx: 5,
  },
  {
    ref: 'EAW-SEED-07',
    type: ListingType.SALE,
    propertyType: PropertyType.APARTMENT,
    title: 'شقة استثمارية في حي الورود',
    description: 'شقة بدخل تأجيري ممتاز، قريبة من الخدمات والمدارس.',
    price: 720_000,
    bedrooms: 2,
    bathrooms: 2,
    area: 95,
    parkingSpaces: 1,
    district: 'حي الورود',
    latOffset: 0.003,
    lngOffset: 0.026,
    ownerIdx: 0,
  },
  {
    ref: 'EAW-SEED-08',
    type: ListingType.RENT,
    propertyType: PropertyType.STUDIO,
    title: 'استوديو حديث للإيجار في حي العروبة',
    description: 'استوديو مفروش بتصميم عصري، مدخل مستقل، قريب من المرافق الحيوية.',
    price: 3_200,
    rentPeriod: RentPeriod.MONTHLY,
    bedrooms: 1,
    bathrooms: 1,
    area: 45,
    parkingSpaces: 1,
    furnishing: ListingFurnishing.FURNISHED,
    district: 'حي العروبة',
    latOffset: -0.008,
    lngOffset: 0.017,
    ownerIdx: 1,
  },
  {
    ref: 'EAW-SEED-09',
    type: ListingType.SALE,
    propertyType: PropertyType.TOWNHOUSE,
    title: 'تاون هاوس عصري في الياسمين',
    description: 'تاون هاوس بتصميم معاصر ومرافق مشتركة، حي عائلي هادئ.',
    price: 2_350_000,
    bedrooms: 4,
    bathrooms: 4,
    area: 320,
    landArea: 280,
    parkingSpaces: 2,
    furnishing: ListingFurnishing.UNFURNISHED,
    district: 'حي الياسمين',
    latOffset: 0.014,
    lngOffset: 0.019,
    isFeatured: true,
    ownerIdx: 2,
  },
  {
    ref: 'EAW-SEED-10',
    type: ListingType.SALE,
    propertyType: PropertyType.OFFICE,
    title: 'مكتب على طريق الملك فهد',
    description: 'مكتب جاهز للاستثمار في برج تجاري بإطلالة على المدينة.',
    price: 1_450_000,
    area: 130,
    parkingSpaces: 2,
    district: 'حي العليا',
    latOffset: 0.006,
    lngOffset: -0.011,
    ownerIdx: 3,
  },

  // -------------------- Short-term / hospitality (Airbnb + hotel) --------------------
  // All assigned to agent1 (Mohammed Al-Otaibi) so a single demo host has a
  // populated /dashboard/hosting page.
  {
    ref: 'EAW-SEED-11',
    type: ListingType.RENT,
    propertyType: PropertyType.CHALET,
    title: 'شاليه فاخر في الخبر',
    titleEn: 'Luxury Chalet in Al Khobar',
    description: 'شاليه جميل على الشاطئ مثالي لتجمعات العائلة وعطلات نهاية الأسبوع.',
    descriptionEn: 'Beautiful beachfront chalet perfect for family gatherings and weekend getaways.',
    price: 850,
    bedrooms: 4,
    bathrooms: 3,
    area: 400,
    district: 'حي الشاطئ',
    city: 'Al Khobar',
    region: 'Eastern Province',
    lat: 26.2172,
    lng: 50.1971,
    ownerIdx: 0,
    isFeatured: true,
    coverImageUrl: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
    bookingType: 'daily',
    dailyRate: 850,
    weeklyRate: 5000,
    minimumStay: 1,
    maxGuests: 10,
    checkInTime: '15:00',
    checkOutTime: '11:00',
    cancellationPolicy: 'moderate',
    instantBook: true,
    houseRules: 'No smoking. No loud music after 11pm. Max 10 guests.',
    amenitiesDetailed: {
      wifi: true, pool: true, parking: true,
      ac: true, bbq: true, kitchen: true,
      tv: true, washer: true,
    },
  },
  {
    ref: 'EAW-SEED-12',
    type: ListingType.RENT,
    propertyType: PropertyType.CHALET,
    title: 'شاليه حديث مع مسبح خاص - الرياض',
    titleEn: 'Modern Chalet with Private Pool - Riyadh',
    description: 'شاليه حديث وفسيح مع مسبح خاص وجميع المرافق للعائلات الكبيرة.',
    descriptionEn: 'Spacious modern chalet with private pool and full amenities for large families.',
    price: 1200,
    bedrooms: 5,
    bathrooms: 4,
    area: 500,
    district: 'حي النرجس',
    lat: 24.8200,
    lng: 46.6800,
    ownerIdx: 0,
    isFeatured: true,
    coverImageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    bookingType: 'daily',
    dailyRate: 1200,
    weeklyRate: 7500,
    minimumStay: 1,
    maxGuests: 15,
    checkInTime: '14:00',
    checkOutTime: '12:00',
    cancellationPolicy: 'strict',
    instantBook: false,
    houseRules: 'Family bookings only. No events or parties.',
    amenitiesDetailed: {
      wifi: true, pool: true, parking: true,
      ac: true, bbq: true, kitchen: true,
      tv: true, security: true,
    },
  },
  {
    ref: 'EAW-SEED-13',
    type: ListingType.RENT,
    propertyType: PropertyType.REST_HOUSE,
    title: 'استراحة مريحة - الدرعية',
    titleEn: 'Cozy Rest House - Al Diriyah',
    description: 'استراحة تراثية قريبة من موقع الدرعية التاريخي. مثالية للعائلات.',
    descriptionEn: 'Traditional rest house near Al Diriyah heritage site. Perfect for families.',
    price: 600,
    bedrooms: 3,
    bathrooms: 2,
    area: 300,
    district: 'الدرعية',
    lat: 24.7340,
    lng: 46.5740,
    ownerIdx: 0,
    coverImageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
    bookingType: 'daily',
    dailyRate: 600,
    minimumStay: 1,
    maxGuests: 8,
    checkInTime: '15:00',
    checkOutTime: '11:00',
    cancellationPolicy: 'flexible',
    instantBook: true,
    amenitiesDetailed: {
      wifi: true, parking: true, ac: true,
      kitchen: true, bbq: true,
    },
  },
  {
    ref: 'EAW-SEED-14',
    type: ListingType.RENT,
    propertyType: PropertyType.FARM,
    title: 'مزرعة خضراء مع مسبح - الخرج',
    titleEn: 'Green Farm with Pool - Al Kharj',
    description: 'مزرعة كبيرة مثالية للفعاليات والتجمعات العائلية.',
    descriptionEn: 'Large farm property ideal for events and family gatherings.',
    price: 1500,
    bedrooms: 4,
    bathrooms: 3,
    area: 5000,
    district: 'الخرج',
    city: 'Al Kharj',
    region: 'Riyadh Province',
    lat: 24.1554,
    lng: 47.3348,
    ownerIdx: 0,
    isFeatured: true,
    coverImageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
    bookingType: 'daily',
    dailyRate: 1500,
    weeklyRate: 9000,
    minimumStay: 1,
    maxGuests: 20,
    checkInTime: '14:00',
    checkOutTime: '12:00',
    cancellationPolicy: 'moderate',
    instantBook: false,
    amenitiesDetailed: {
      pool: true, parking: true, ac: true,
      kitchen: true, bbq: true, wifi: true,
    },
  },
  {
    ref: 'EAW-SEED-15',
    type: ListingType.RENT,
    propertyType: PropertyType.HOTEL_ROOM,
    title: 'جناح فندقي فاخر - الرياض',
    titleEn: 'Luxury Hotel Suite - Riyadh',
    description: 'جناح فاخر 5 نجوم مع إطلالات بانورامية على المدينة في قلب الرياض.',
    descriptionEn: '5-star luxury suite with panoramic city views in the heart of Riyadh.',
    price: 750,
    bedrooms: 1,
    bathrooms: 1,
    area: 65,
    district: 'حي العليا',
    lat: 24.6969,
    lng: 46.6894,
    ownerIdx: 0,
    isFeatured: true,
    coverImageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    bookingType: 'daily',
    dailyRate: 750,
    minimumStay: 1,
    maxGuests: 2,
    checkInTime: '15:00',
    checkOutTime: '12:00',
    cancellationPolicy: 'moderate',
    instantBook: true,
    hotelName: 'Eawlma Grand Hotel',
    hotelStarRating: 5,
    amenitiesDetailed: {
      wifi: true, ac: true, tv: true,
      parking: true, breakfast: true,
    },
  },
  {
    ref: 'EAW-SEED-16',
    type: ListingType.RENT,
    propertyType: PropertyType.HOTEL_ROOM,
    title: 'غرفة فندقية اقتصادية - جدة',
    titleEn: 'Budget Hotel Room - Jeddah',
    description: 'فندق مريح 3 نجوم في حي البلد التاريخي.',
    descriptionEn: 'Comfortable 3-star hotel in historic Al Balad district.',
    price: 250,
    bedrooms: 1,
    bathrooms: 1,
    area: 30,
    district: 'حي البلد',
    city: 'Jeddah',
    region: 'Makkah Province',
    lat: 21.4858,
    lng: 39.1925,
    ownerIdx: 0,
    coverImageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
    bookingType: 'daily',
    dailyRate: 250,
    minimumStay: 1,
    maxGuests: 2,
    checkInTime: '14:00',
    checkOutTime: '11:00',
    cancellationPolicy: 'flexible',
    instantBook: true,
    hotelName: 'Al Balad Heritage Hotel',
    hotelStarRating: 3,
    amenitiesDetailed: {
      wifi: true, ac: true, tv: true,
    },
  },
  {
    ref: 'EAW-SEED-17',
    type: ListingType.RENT,
    propertyType: PropertyType.ENTIRE_HOME,
    title: 'فيلا فاخرة كاملة للإيجار - جدة',
    titleEn: 'Entire Luxury Villa for Rent - Jeddah',
    description: 'فيلا رائعة بالكامل متاحة للإقامة القصيرة.',
    descriptionEn: 'Stunning entire villa available for short stays.',
    price: 2000,
    bedrooms: 6,
    bathrooms: 5,
    area: 600,
    district: 'حي الزهراء',
    city: 'Jeddah',
    region: 'Makkah Province',
    lat: 21.5433,
    lng: 39.1728,
    ownerIdx: 0,
    isFeatured: true,
    coverImageUrl: 'https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=800&q=80',
    bookingType: 'daily',
    dailyRate: 2000,
    weeklyRate: 12000,
    minimumStay: 2,
    maxGuests: 16,
    checkInTime: '15:00',
    checkOutTime: '11:00',
    cancellationPolicy: 'strict',
    instantBook: false,
    houseRules: 'No parties. No smoking inside. Respect quiet hours.',
    amenitiesDetailed: {
      wifi: true, pool: true, parking: true,
      ac: true, kitchen: true, tv: true,
      security: true, bbq: true,
    },
  },
  {
    ref: 'EAW-SEED-18',
    type: ListingType.RENT,
    propertyType: PropertyType.ROOM,
    title: 'غرفة خاصة في فيلا مشتركة - الرياض',
    titleEn: 'Private Room in Shared Villa - Riyadh',
    description: 'غرفة خاصة نظيفة في فيلا مشتركة. مثالية للمحترفين.',
    descriptionEn: 'Clean private room in a shared villa. Great for professionals.',
    price: 150,
    bedrooms: 1,
    bathrooms: 1,
    area: 25,
    district: 'حي الملقا',
    lat: 24.7785,
    lng: 46.6483,
    ownerIdx: 0,
    coverImageUrl: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80',
    bookingType: 'daily',
    dailyRate: 150,
    minimumStay: 1,
    maxGuests: 1,
    checkInTime: '16:00',
    checkOutTime: '11:00',
    cancellationPolicy: 'flexible',
    instantBook: true,
    houseRules: 'Respect shared spaces. No overnight guests.',
    amenitiesDetailed: {
      wifi: true, ac: true, parking: true,
    },
  },

  // -------------------- Regular Jeddah + Dammam listings for city diversity --------------------
  {
    ref: 'EAW-SEED-19',
    type: ListingType.SALE,
    propertyType: PropertyType.APARTMENT,
    title: 'شقة بإطلالة على البحر - جدة',
    titleEn: 'Sea-view Apartment - Jeddah',
    description: 'شقة عصرية بإطلالة بانورامية على البحر الأحمر، تشطيب راقٍ وموقع متميز.',
    descriptionEn: 'Modern apartment with panoramic Red Sea views, premium finishes and prime location.',
    price: 1_350_000,
    bedrooms: 3,
    bathrooms: 2,
    area: 165,
    parkingSpaces: 1,
    furnishing: ListingFurnishing.SEMI_FURNISHED,
    district: 'حي الشاطئ',
    city: 'Jeddah',
    region: 'Makkah Province',
    lat: 21.5810,
    lng: 39.1410,
    ownerIdx: 1,
    isFeatured: true,
    coverImageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
  },
  {
    ref: 'EAW-SEED-20',
    type: ListingType.SALE,
    propertyType: PropertyType.VILLA,
    title: 'فيلا واسعة في الدمام',
    titleEn: 'Spacious Villa in Dammam',
    description: 'فيلا حديثة في حي راقٍ، حديقة كبيرة وموقف خاص لأكثر من سيارة.',
    descriptionEn: 'Modern villa in an upscale neighborhood with a large garden and multi-car driveway.',
    price: 2_750_000,
    bedrooms: 5,
    bathrooms: 5,
    area: 480,
    landArea: 540,
    parkingSpaces: 3,
    hasGarden: true,
    furnishing: ListingFurnishing.UNFURNISHED,
    district: 'حي الفيصلية',
    city: 'Dammam',
    region: 'Eastern Province',
    lat: 26.4207,
    lng: 50.0888,
    ownerIdx: 2,
    coverImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  },
  {
    ref: 'EAW-SEED-21',
    type: ListingType.RENT,
    propertyType: PropertyType.APARTMENT,
    title: 'شقة مفروشة وسط الدمام',
    titleEn: 'Furnished Apartment in Central Dammam',
    description: 'شقة مفروشة بالكامل، موقع مركزي قرب الكورنيش، إيجار شهري.',
    descriptionEn: 'Fully furnished apartment in central Dammam, walking distance to the Corniche.',
    price: 5_500,
    rentPeriod: RentPeriod.MONTHLY,
    bedrooms: 2,
    bathrooms: 2,
    area: 105,
    parkingSpaces: 1,
    furnishing: ListingFurnishing.FURNISHED,
    district: 'حي الكورنيش',
    city: 'Dammam',
    region: 'Eastern Province',
    lat: 26.4400,
    lng: 50.1080,
    ownerIdx: 3,
    coverImageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
  },
];

// ------------------------------------------------------------------
// Realistic Saudi agent profiles
// ------------------------------------------------------------------

interface SeedAgentSpec {
  email: string;
  phone: string;
  firstName: string;   // English transliteration (used for initials + system fields)
  lastName: string;
  firstNameAr: string; // Native Arabic name (used for display where available)
  lastNameAr: string;
}

const SEED_AGENTS: SeedAgentSpec[] = [
  { email: 'agent1@eawlma.sa', phone: '+966500000901',
    firstName: 'Mohammed', lastName: 'Al-Otaibi',   firstNameAr: 'محمد',     lastNameAr: 'العتيبي' },
  { email: 'agent2@eawlma.sa', phone: '+966500000902',
    firstName: 'Faisal',   lastName: 'Al-Shammari', firstNameAr: 'فيصل',     lastNameAr: 'الشمري' },
  { email: 'agent3@eawlma.sa', phone: '+966500000903',
    firstName: 'Abdullah', lastName: 'Al-Qahtani',  firstNameAr: 'عبدالله',  lastNameAr: 'القحطاني' },
  { email: 'agent4@eawlma.sa', phone: '+966500000904',
    firstName: 'Sara',     lastName: 'Al-Maliki',   firstNameAr: 'سارة',     lastNameAr: 'المالكي' },
  { email: 'agent5@eawlma.sa', phone: '+966500000905',
    firstName: 'Khalid',   lastName: 'Al-Dosari',   firstNameAr: 'خالد',     lastNameAr: 'الدوسري' },
  { email: 'agent6@eawlma.sa', phone: '+966500000906',
    firstName: 'Noura',    lastName: 'Al-Subaie',   firstNameAr: 'نورة',     lastNameAr: 'السبيعي' },
];

async function upsertUser(params: {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password: string;
}): Promise<UserEntity> {
  const usersRepo = dataSource.getRepository(UserEntity);
  // Match by either email OR phone — older legacy seeds (e.g. admin@eawlma.sa)
  // own the same phone number under a different email, so we want to claim
  // and rename that row rather than try to INSERT a duplicate.
  const existing =
    (await usersRepo.findOne({ where: { email: params.email } })) ??
    (await usersRepo.findOne({ where: { phone: params.phone } }));
  if (existing) {
    existing.email = params.email;
    existing.phone = params.phone;
    existing.role = params.role;
    existing.status = UserStatus.ACTIVE;
    existing.firstName = params.firstName;
    existing.lastName = params.lastName;
    existing.passwordHash = await argon2.hash(params.password, ARGON_OPTIONS);
    existing.emailVerified = true;
    existing.phoneVerified = true;
    return usersRepo.save(existing);
  }
  const created = usersRepo.create({
    email: params.email,
    phone: params.phone,
    firstName: params.firstName,
    lastName: params.lastName,
    passwordHash: await argon2.hash(params.password, ARGON_OPTIONS),
    role: params.role,
    status: UserStatus.ACTIVE,
    preferredLocale: 'ar',
    emailVerified: true,
    phoneVerified: true,
  });
  return usersRepo.save(created);
}

async function upsertListing(spec: SeedListingSpec, ownerId: string): Promise<ListingEntity> {
  const listingsRepo = dataSource.getRepository(ListingEntity);
  const mediaRepo = dataSource.getRepository(ListingMediaEntity);
  const translationsRepo = dataSource.getRepository(ListingTranslationEntity);
  const now = new Date();

  let listing = await listingsRepo.findOne({ where: { referenceCode: spec.ref } });
  if (!listing) {
    listing = listingsRepo.create({ referenceCode: spec.ref });
  }

  const region = spec.region ?? spec.city ?? 'الرياض';
  const city = spec.city ?? 'الرياض';
  const lat = spec.lat ?? RIYADH.lat + (spec.latOffset ?? 0);
  const lng = spec.lng ?? RIYADH.lng + (spec.lngOffset ?? 0);

  listing.type = spec.type;
  listing.propertyType = spec.propertyType;
  listing.status = ListingStatus.ACTIVE;
  listing.sourceLocale = 'ar';
  listing.title = spec.title;
  listing.description = spec.description;
  listing.price = spec.price;
  listing.currency = 'SAR';
  listing.rentPeriod = spec.rentPeriod ?? null;
  listing.isNegotiable = false;
  listing.bedrooms = spec.bedrooms ?? null;
  listing.bathrooms = spec.bathrooms ?? null;
  listing.area = spec.area ?? null;
  listing.landArea = spec.landArea ?? null;
  listing.parkingSpaces = spec.parkingSpaces ?? null;
  listing.floors = null;
  listing.floorNumber = null;
  listing.yearBuilt = null;
  listing.furnishing = spec.furnishing ?? null;
  listing.hasElevator = false;
  listing.hasPool = spec.hasPool ?? false;
  listing.hasGarden = spec.hasGarden ?? false;
  listing.hasGym = spec.hasGym ?? false;
  listing.hasMaidRoom = false;
  listing.hasDriverRoom = false;
  listing.hasCentralAC = false;
  listing.hasKitchenAppliances = false;
  listing.hasSecurity = false;
  listing.isCornerUnit = false;
  listing.country = 'SA';
  listing.region = region;
  listing.city = city;
  listing.district = spec.district;
  listing.address = {
    country: 'SA',
    region,
    city,
    district: spec.district,
  };
  listing.lat = lat;
  listing.lng = lng;
  listing.ownerId = ownerId;
  listing.agencyId = null;
  listing.isFeatured = spec.isFeatured ?? false;
  listing.featuredUntil = spec.isFeatured
    ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;
  listing.viewCount = 0;
  listing.inquiryCount = 0;
  listing.saveCount = 0;
  listing.publishedAt = now;
  listing.expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  listing.rejectionReason = null;

  // Short-term / hospitality
  listing.bookingType = spec.bookingType ?? 'long_term';
  listing.dailyRate = spec.dailyRate ?? null;
  listing.weeklyRate = spec.weeklyRate ?? null;
  listing.minimumStay = spec.minimumStay ?? 1;
  listing.maxGuests = spec.maxGuests ?? null;
  listing.checkInTime = spec.checkInTime ?? '15:00';
  listing.checkOutTime = spec.checkOutTime ?? '11:00';
  listing.cancellationPolicy = spec.cancellationPolicy ?? null;
  listing.instantBook = !!spec.instantBook;
  listing.houseRules = spec.houseRules ?? null;
  listing.amenitiesDetailed = spec.amenitiesDetailed ?? null;
  listing.hotelName = spec.hotelName ?? null;
  listing.hotelStarRating = spec.hotelStarRating ?? null;

  const saved = await listingsRepo.save(listing);

  // Always overwrite cover media so re-seeds pick up curated Unsplash URLs
  // even after we've already inserted the (older) picsum placeholders.
  const cover = spec.coverImageUrl ?? pickCoverImage(spec.propertyType, spec.ref);
  await mediaRepo.delete({ listingId: saved.id, position: 0 });
  await mediaRepo.save(
    mediaRepo.create({
      listingId: saved.id,
      type: MediaType.IMAGE,
      url: cover,
      thumbnailUrl: cover,
      caption: spec.title,
      position: 0,
      width: 800,
      height: 600,
      durationSeconds: null,
    }),
  );

  // Upsert English translation when supplied. Source row already carries the
  // Arabic copy; the translations table mirrors the rest of the locales.
  if (spec.titleEn || spec.descriptionEn) {
    const existingEn = await translationsRepo.findOne({
      where: { listingId: saved.id, locale: 'en' },
    });
    if (existingEn) {
      if (spec.titleEn) existingEn.title = spec.titleEn;
      if (spec.descriptionEn) existingEn.description = spec.descriptionEn;
      await translationsRepo.save(existingEn);
    } else {
      await translationsRepo.save(
        translationsRepo.create({
          listingId: saved.id,
          locale: 'en',
          title: spec.titleEn ?? saved.title,
          description: spec.descriptionEn ?? saved.description,
          isMachineTranslated: false,
        }),
      );
    }
  }

  return saved;
}

async function main(): Promise<void> {
  await dataSource.initialize();
  // eslint-disable-next-line no-console
  console.log('Seeding…');

  const admin = await upsertUser({
    email: 'admin@eawlma.sa',
    phone: '+966500000900',
    firstName: 'Admin',
    lastName: 'Eawlma',
    role: UserRole.ADMIN,
    password: 'Admin123!',
  });
  // eslint-disable-next-line no-console
  console.log(`✓ admin user  → ${admin.email}`);

  const agents: UserEntity[] = [];
  for (const a of SEED_AGENTS) {
    const u = await upsertUser({
      email: a.email,
      phone: a.phone,
      firstName: a.firstName,
      lastName: a.lastName,
      role: UserRole.AGENT,
      password: 'Agent123!',
    });
    agents.push(u);
    // eslint-disable-next-line no-console
    console.log(`✓ agent → ${u.firstName} ${u.lastName}  (${u.email})`);
  }

  for (const spec of LISTING_SPECS) {
    const owner = agents[spec.ownerIdx % agents.length];
    const l = await upsertListing(spec, owner.id);
    // eslint-disable-next-line no-console
    console.log(`✓ listing ${l.referenceCode}  ${l.propertyType.padEnd(11)} ${l.price.toString().padStart(10)} SAR  → ${owner.firstName}`);
  }

  // ---- Buyers + reviews ----------------------------------------------------
  const buyerSpecs: Array<{ email: string; phone: string; firstName: string; lastName: string }> = [
    { email: 'buyer1@eawlma.sa', phone: '+966500000910', firstName: 'Hala',    lastName: 'Al-Ghamdi' },
    { email: 'buyer2@eawlma.sa', phone: '+966500000911', firstName: 'Nasser',  lastName: 'Al-Harbi'  },
    { email: 'buyer3@eawlma.sa', phone: '+966500000912', firstName: 'Reem',    lastName: 'Al-Anazi'  },
    { email: 'buyer4@eawlma.sa', phone: '+966500000913', firstName: 'Sultan',  lastName: 'Al-Zahrani'},
    { email: 'buyer5@eawlma.sa', phone: '+966500000914', firstName: 'Lina',    lastName: 'Al-Mansour'},
  ];
  const buyers: UserEntity[] = [];
  for (const b of buyerSpecs) {
    const u = await upsertUser({
      email: b.email,
      phone: b.phone,
      firstName: b.firstName,
      lastName: b.lastName,
      role: UserRole.USER,
      password: 'Buyer123!',
    });
    buyers.push(u);
    // eslint-disable-next-line no-console
    console.log(`✓ buyer → ${u.firstName} ${u.lastName}  (${u.email})`);
  }

  const reviewsRepo = dataSource.getRepository(ReviewEntity);
  const REVIEW_TEMPLATES = [
    { rating: 5, comment: 'Mohammed responded within minutes and walked us through three listings the same week. Highly professional, totally bilingual, and never pushy.' },
    { rating: 5, comment: 'فيصل ساعدنا في شراء فيلتنا الجديدة بكل احترافية، صبور جداً وقدّم لنا تحليل سعري مفصّل قبل التفاوض.' },
    { rating: 4, comment: 'Solid experience overall — excellent communication and detailed photos. Knocked one star off because of a small scheduling mix-up that was quickly resolved.' },
    { rating: 5, comment: 'Excellent service from start to close. Negotiated a great deal on the apartment and explained every contract clause clearly.' },
    { rating: 5, comment: 'سارة محترفة جداً، تتابع كل تفاصيل العقار وتفهم احتياجات العميل، أنصح بها بشدة.' },
    { rating: 4, comment: 'Khalid was knowledgeable about the area and pricing trends. Would have liked faster follow-up after the first viewing but otherwise great.' },
    { rating: 5, comment: 'Noura made the leasing process effortless. She handled the paperwork, building visits, and even helped coordinate the move-in date.' },
    { rating: 5, comment: 'تجربة ممتازة من البداية للنهاية. عبدالله وسيط شفاف وصادق، ولم يضغط علينا في أي مرحلة.' },
  ];

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    // 4 reviews per agent — pick reviewer/template deterministically.
    for (let j = 0; j < 4; j++) {
      const reviewer = buyers[(i + j) % buyers.length];
      const tpl = REVIEW_TEMPLATES[(i * 4 + j) % REVIEW_TEMPLATES.length];
      const existing = await reviewsRepo.findOne({
        where: { agentId: agent.id, reviewerId: reviewer.id },
      });
      if (existing) {
        existing.rating = tpl.rating;
        existing.comment = tpl.comment;
        await reviewsRepo.save(existing);
      } else {
        await reviewsRepo.save(
          reviewsRepo.create({
            agentId: agent.id,
            reviewerId: reviewer.id,
            listingId: null,
            rating: tpl.rating,
            comment: tpl.comment,
            reply: null,
            repliedAt: null,
          }),
        );
      }
    }
    // eslint-disable-next-line no-console
    console.log(`✓ reviews → 4 reviews seeded for ${agent.firstName} ${agent.lastName}`);
  }

  await dataSource.destroy();
  // eslint-disable-next-line no-console
  console.log('Seed complete.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
