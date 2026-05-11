import { PropertyType } from '@eawlma/shared-types';

// Curated Unsplash fallbacks per property type — used when a listing has no
// uploaded media (common in the seed dataset and for fresh listings).
//
// Direct map (no hashing) so the same property type always renders the same
// image. Kept in sync with apps/backend/src/database/seed.ts so seeded data
// and runtime fallback look identical.
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

const DEFAULT_FALLBACK =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';

export function fallbackImageForPropertyType(
  propertyType: PropertyType | string | null | undefined,
): string {
  if (!propertyType) return DEFAULT_FALLBACK;
  return FALLBACK_BY_TYPE[String(propertyType).toLowerCase()] ?? DEFAULT_FALLBACK;
}

/** Returns the listing's first image URL or a property-type-aware Unsplash fallback. */
export function listingCoverUrl(listing: {
  propertyType: PropertyType | string;
  media?: Array<{ url: string; thumbnailUrl?: string | null }> | null;
}): string {
  const first = listing.media?.[0];
  if (first?.thumbnailUrl) return first.thumbnailUrl;
  if (first?.url) return first.url;
  return fallbackImageForPropertyType(listing.propertyType);
}

/**
 * Curated extra Unsplash photos used to pad the gallery when a listing has
 * fewer than ~10 uploaded images. Real-estate-y interior + exterior shots so
 * the Airbnb-style grid always renders a full preview even on demo data.
 */
const EXTRA_GALLERY_PHOTOS: string[] = [
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80',
  'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80',
  'https://images.unsplash.com/photo-1583845112203-29329902332e?w=1200&q=80',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
  'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1200&q=80',
];

/**
 * Returns *at least* `minLength` photo URLs for the gallery — uploaded media
 * first, then the property-type cover as a tiebreaker, then a curated pool of
 * Unsplash filler shots. Always deduplicates.
 */
export function listingGalleryUrls(
  listing: {
    propertyType: PropertyType | string;
    media?: Array<{ url: string; thumbnailUrl?: string | null }> | null;
  },
  minLength = 10,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (url: string | null | undefined) => {
    if (!url) return;
    if (seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };

  for (const m of listing.media ?? []) push(m.url);
  push(fallbackImageForPropertyType(listing.propertyType));
  for (const u of EXTRA_GALLERY_PHOTOS) {
    if (out.length >= minLength) break;
    push(u);
  }
  return out;
}
