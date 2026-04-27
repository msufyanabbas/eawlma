/**
 * Seed script — creates a deterministic dev/demo dataset:
 *   • 1 admin (admin@aqarat.sa / Admin123!)
 *   • 1 agent (agent@aqarat.sa / Agent123!)
 *   • 10 ACTIVE listings in Riyadh, mixed property types and prices
 *
 * Run with:  npm run seed   (alias for ts-node + tsconfig-paths)
 *
 * Idempotent: re-running upserts users by email and re-uses the same listing
 * reference codes (AQR-SEED-NN) instead of bumping the production sequence.
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
} from '@aqarat/shared-types';

import dataSource from './data-source';
import { UserEntity } from '../modules/users/entities/user.entity';
import { ListingEntity } from '../modules/listings/entities/listing.entity';
import { ListingMediaEntity } from '../modules/listings/entities/listing-media.entity';

const ARGON_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

const RIYADH = { lat: 24.7136, lng: 46.6753 };

interface SeedListingSpec {
  ref: string;
  type: ListingType;
  propertyType: PropertyType;
  title: string;
  description: string;
  price: number;
  rentPeriod?: RentPeriod;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  landArea?: number;
  parkingSpaces?: number;
  furnishing?: ListingFurnishing;
  district: string;
  latOffset: number;
  lngOffset: number;
  hasPool?: boolean;
  hasGym?: boolean;
  hasGarden?: boolean;
}

const LISTING_SPECS: SeedListingSpec[] = [
  {
    ref: 'AQR-SEED-01',
    type: ListingType.SALE,
    propertyType: PropertyType.APARTMENT,
    title: 'فيلا فاخرة في حي الياسمين',
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
  },
  {
    ref: 'AQR-SEED-02',
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
  },
  {
    ref: 'AQR-SEED-03',
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
  },
  {
    ref: 'AQR-SEED-04',
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
  },
  {
    ref: 'AQR-SEED-05',
    type: ListingType.SALE,
    propertyType: PropertyType.LAND,
    title: 'أرض سكنية في حي النرجس',
    description: 'أرض في موقع مميز جاهزة للبناء، صك إلكتروني، شارعين.',
    price: 1_800_000,
    landArea: 750,
    district: 'حي النرجس',
    latOffset: 0.024,
    lngOffset: 0.011,
  },
  {
    ref: 'AQR-SEED-06',
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
  },
  {
    ref: 'AQR-SEED-07',
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
  },
  {
    ref: 'AQR-SEED-08',
    type: ListingType.RENT,
    propertyType: PropertyType.COMMERCIAL,
    title: 'محل تجاري في طريق العروبة',
    description: 'محل بواجهة زجاجية على شارع رئيسي بحركة عالية.',
    price: 95_000,
    rentPeriod: RentPeriod.YEARLY,
    area: 80,
    district: 'حي العروبة',
    latOffset: -0.008,
    lngOffset: 0.017,
  },
  {
    ref: 'AQR-SEED-09',
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
  },
  {
    ref: 'AQR-SEED-10',
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
  },
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
  const existing = await usersRepo.findOne({ where: { email: params.email } });
  if (existing) {
    existing.role = params.role;
    existing.status = UserStatus.ACTIVE;
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
  const now = new Date();

  let listing = await listingsRepo.findOne({ where: { referenceCode: spec.ref } });
  if (!listing) {
    listing = listingsRepo.create({ referenceCode: spec.ref });
  }

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
  listing.region = 'الرياض';
  listing.city = 'الرياض';
  listing.district = spec.district;
  listing.address = {
    country: 'SA',
    region: 'الرياض',
    city: 'الرياض',
    district: spec.district,
  };
  listing.lat = RIYADH.lat + spec.latOffset;
  listing.lng = RIYADH.lng + spec.lngOffset;
  listing.ownerId = ownerId;
  listing.agencyId = null;
  listing.isFeatured = false;
  listing.featuredUntil = null;
  listing.viewCount = 0;
  listing.inquiryCount = 0;
  listing.saveCount = 0;
  listing.publishedAt = now;
  listing.expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  listing.rejectionReason = null;

  const saved = await listingsRepo.save(listing);

  const mediaCount = await mediaRepo.count({ where: { listingId: saved.id } });
  if (mediaCount === 0) {
    await mediaRepo.save(
      mediaRepo.create({
        listingId: saved.id,
        type: MediaType.IMAGE,
        url: `https://picsum.photos/seed/${saved.referenceCode}/1600/1200`,
        thumbnailUrl: `https://picsum.photos/seed/${saved.referenceCode}/400/300`,
        caption: spec.title,
        position: 0,
        width: 1600,
        height: 1200,
        durationSeconds: null,
      }),
    );
  }

  return saved;
}

async function main(): Promise<void> {
  await dataSource.initialize();
  // eslint-disable-next-line no-console
  console.log('Seeding…');

  const admin = await upsertUser({
    email: 'admin@aqarat.sa',
    phone: '+966500000900',
    firstName: 'Admin',
    lastName: 'Aqarat',
    role: UserRole.ADMIN,
    password: 'Admin123!',
  });
  // eslint-disable-next-line no-console
  console.log(`✓ admin user  → ${admin.email}`);

  const agent = await upsertUser({
    email: 'agent@aqarat.sa',
    phone: '+966500000901',
    firstName: 'Agent',
    lastName: 'Aqarat',
    role: UserRole.AGENT,
    password: 'Agent123!',
  });
  // eslint-disable-next-line no-console
  console.log(`✓ agent user  → ${agent.email}`);

  for (const spec of LISTING_SPECS) {
    const l = await upsertListing(spec, agent.id);
    // eslint-disable-next-line no-console
    console.log(`✓ listing ${l.referenceCode}  ${l.propertyType.padEnd(11)} ${l.price.toString().padStart(10)} SAR`);
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
