import { DataSource } from 'typeorm';
import {
  ListingStatus,
  ListingType,
  MediaType,
  PropertyType,
  UserRole,
} from '@eawlma/shared-types';

import { ListingEntity } from '../../modules/listings/entities/listing.entity';
import { ListingMediaEntity } from '../../modules/listings/entities/listing-media.entity';
import { ListingTranslationEntity } from '../../modules/listings/entities/listing-translation.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';

/**
 * Seeds a handful of demo listings that ship a real 360° virtual tour.
 *
 * Schema notes (this differs from a "flat" listing row):
 *  - The listing carries the Arabic copy in `title` / `description`
 *    (`sourceLocale = 'ar'`); the English copy lives in a separate
 *    `listing_translations` row.
 *  - There is **no** `virtualTourUrl` column. A 360° tour is a media row with
 *    `type = MediaType.TOUR_360` — that's exactly what the listing-detail VR
 *    section looks for. We also add a normal cover IMAGE so cards render.
 */

// Real, publicly available equirectangular 360° panoramas — free to use.
// Pannellum demo assets + a Wikimedia Commons panorama; the previous
// marzipano.net URL 404'd, so the VR section showed a broken tour.
const REAL_360_URLS = [
  'https://pannellum.org/images/cerro-toco-0.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Interior_de_la_Capilla_Sixtina%2C_Roma%2C_Italia%2C_2022-09-17%2C_DD_03-06_HDR.jpg/2560px-Interior_de_la_Capilla_Sixtina%2C_Roma%2C_Italia%2C_2022-09-17%2C_DD_03-06_HDR.jpg',
  'https://pannellum.org/images/alma.jpg',
];

// Property-type cover photos (Unsplash) so the listing cards have a normal
// preview image alongside the 360° tour.
const COVER_IMAGES: Record<string, string> = {
  villa: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
  apartment: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
  penthouse: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
};

interface VrListingSpec {
  referenceCode: string;
  propertyType: PropertyType;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: number;
  city: string;
  region: string;
  district: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  lat: number;
  lng: number;
  tour360Url: string;
}

const VR_LISTINGS: VrListingSpec[] = [
  {
    referenceCode: 'VR-0001',
    propertyType: PropertyType.VILLA,
    titleEn: 'Luxury Villa with VR Tour - Al Nakheel Riyadh',
    titleAr: 'فيلا فاخرة بجولة افتراضية - النخيل الرياض',
    descriptionEn:
      'Experience this stunning luxury villa through our immersive 360° virtual tour. 5 bedrooms, private pool, smart home system.',
    descriptionAr:
      'استمتع بتجربة هذه الفيلا الفاخرة من خلال جولتنا الافتراضية ثلاثية الأبعاد. 5 غرف نوم، مسبح خاص، نظام المنزل الذكي.',
    price: 3_500_000,
    city: 'Riyadh',
    region: 'Riyadh',
    district: 'Al Nakheel',
    bedrooms: 5,
    bathrooms: 4,
    area: 450,
    lat: 24.7136,
    lng: 46.6753,
    tour360Url: REAL_360_URLS[0],
  },
  {
    referenceCode: 'VR-0002',
    propertyType: PropertyType.APARTMENT,
    titleEn: 'Modern Apartment VR Experience - Jeddah Corniche',
    titleAr: 'شقة عصرية بتجربة افتراضية - كورنيش جدة',
    descriptionEn:
      'Take a virtual tour of this sea-view apartment on Jeddah Corniche. 3 bedrooms with panoramic ocean views.',
    descriptionAr:
      'قم بجولة افتراضية في هذه الشقة المطلة على البحر في كورنيش جدة. 3 غرف نوم مع إطلالات بانورامية.',
    price: 1_800_000,
    city: 'Jeddah',
    region: 'Makkah',
    district: 'Al Corniche',
    bedrooms: 3,
    bathrooms: 2,
    area: 220,
    lat: 21.4858,
    lng: 39.1925,
    tour360Url: REAL_360_URLS[1],
  },
  {
    referenceCode: 'VR-0003',
    propertyType: PropertyType.PENTHOUSE,
    titleEn: 'Premium Penthouse - VR Tour Available - NEOM Area',
    titleAr: 'بنتهاوس مميز - جولة افتراضية متاحة - منطقة نيوم',
    descriptionEn:
      'Explore this exclusive penthouse in the NEOM area with our 360° virtual tour. Rooftop terrace, infinity pool.',
    descriptionAr:
      'استكشف هذه الشقة العلوية الحصرية في منطقة نيوم مع جولتنا الافتراضية 360°. تراس على السطح، مسبح لانهائي.',
    price: 8_500_000,
    city: 'Tabuk',
    region: 'Tabuk',
    district: 'NEOM',
    bedrooms: 4,
    bathrooms: 3,
    area: 380,
    lat: 27.5219,
    lng: 36.706,
    tour360Url: REAL_360_URLS[2],
  },
];

export async function seedVRListings(dataSource: DataSource): Promise<void> {
  const listingRepo = dataSource.getRepository(ListingEntity);
  const mediaRepo = dataSource.getRepository(ListingMediaEntity);
  const translationRepo = dataSource.getRepository(ListingTranslationEntity);
  const userRepo = dataSource.getRepository(UserEntity);

  // Any agent owns the demo listings — run the main seed first if there is none.
  const agent = await userRepo.findOne({ where: { role: UserRole.AGENT } });
  if (!agent) {
    console.log('No agent user found — run `npm run seed` first. Skipping VR seed.');
    return;
  }

  for (const spec of VR_LISTINGS) {
    const exists = await listingRepo.findOne({
      where: { referenceCode: spec.referenceCode },
    });
    if (exists) {
      console.log(`↩︎  ${spec.referenceCode} already exists — skipping`);
      continue;
    }

    const now = new Date();
    const listing = listingRepo.create({
      referenceCode: spec.referenceCode,
      type: ListingType.SALE,
      propertyType: spec.propertyType,
      status: ListingStatus.ACTIVE,
      sourceLocale: 'ar',
      title: spec.titleAr,
      description: spec.descriptionAr,
      price: spec.price,
      currency: 'SAR',
      bedrooms: spec.bedrooms,
      bathrooms: spec.bathrooms,
      area: spec.area,
      country: 'SA',
      region: spec.region,
      city: spec.city,
      district: spec.district,
      address: {
        country: 'SA',
        region: spec.region,
        city: spec.city,
        district: spec.district,
      },
      lat: spec.lat,
      lng: spec.lng,
      ownerId: agent.id,
      isFeatured: true,
      publishedAt: now,
      expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
    });
    const saved = await listingRepo.save(listing);

    // English translation row (the listing itself carries the Arabic copy).
    await translationRepo.save(
      translationRepo.create({
        listingId: saved.id,
        locale: 'en',
        title: spec.titleEn,
        description: spec.descriptionEn,
        isMachineTranslated: false,
      }),
    );

    // Cover photo — a normal image so cards/galleries have a preview.
    await mediaRepo.save(
      mediaRepo.create({
        listingId: saved.id,
        type: MediaType.IMAGE,
        url: COVER_IMAGES[spec.propertyType] ?? COVER_IMAGES.villa,
        thumbnailUrl: COVER_IMAGES[spec.propertyType] ?? COVER_IMAGES.villa,
        caption: spec.titleEn,
        position: 0,
        width: 1200,
        height: 800,
      }),
    );

    // 360° equirectangular panorama — stored as TOUR_360 so the listing-detail
    // VR section renders the virtual tour.
    await mediaRepo.save(
      mediaRepo.create({
        listingId: saved.id,
        type: MediaType.TOUR_360,
        url: spec.tour360Url,
        caption: '360° virtual tour',
        position: 1,
      }),
    );

    console.log(`✅ Created VR listing: ${spec.referenceCode} — ${spec.titleEn}`);
  }

  console.log('🎉 VR listings seeded!');
}
