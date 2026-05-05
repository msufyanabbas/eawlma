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

const ARGON_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

const RIYADH = { lat: 24.7136, lng: 46.6753 };

// ------------------------------------------------------------------
// Property-type → curated Unsplash cover image rotation
// ------------------------------------------------------------------

const COVER_IMAGES_BY_TYPE: Record<string, string[]> = {
  apartment: [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
  ],
  villa: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  ],
  office: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80',
  ],
  land: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  ],
  townhouse: [
    'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
  ],
  studio: [
    'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80',
  ],
  commercial: [
    'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80',
  ],
};

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';

function pickCoverImage(propertyType: PropertyType, refCode: string): string {
  const pool = COVER_IMAGES_BY_TYPE[propertyType] ?? [];
  if (pool.length === 0) return DEFAULT_COVER;
  // Hash the ref code so re-seeds always pick the same image per listing.
  let h = 0;
  for (let i = 0; i < refCode.length; i++) h = (h * 31 + refCode.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

// ------------------------------------------------------------------
// Listing specs
// ------------------------------------------------------------------

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
  isFeatured?: boolean;
  /** Index into the SEED_AGENTS array — distributes listings across owners. */
  ownerIdx: number;
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
    propertyType: PropertyType.COMMERCIAL,
    title: 'محل تجاري في طريق العروبة',
    description: 'محل بواجهة زجاجية على شارع رئيسي بحركة عالية.',
    price: 95_000,
    rentPeriod: RentPeriod.YEARLY,
    area: 80,
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
  // Match by either email OR phone — older legacy seeds (e.g. admin@aqarat.sa)
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

  const saved = await listingsRepo.save(listing);

  // Always overwrite cover media so re-seeds pick up curated Unsplash URLs
  // even after we've already inserted the (older) picsum placeholders.
  const cover = pickCoverImage(spec.propertyType, spec.ref);
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
    lastName: 'eawlma',
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

  await dataSource.destroy();
  // eslint-disable-next-line no-console
  console.log('Seed complete.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
