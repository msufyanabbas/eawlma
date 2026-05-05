import { PropertyType } from '@eawlma/shared-types';

// Curated Unsplash fallbacks per property type — used when a listing has no
// uploaded media (common in the seed dataset and for fresh listings).
const FALLBACK_BY_TYPE: Record<string, string> = {
  apartment: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
  villa: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80',
  office: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  land: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
};

const DEFAULT_FALLBACK =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';

export function fallbackImageForPropertyType(propertyType: PropertyType | string | null | undefined): string {
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
