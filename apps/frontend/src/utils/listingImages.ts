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
