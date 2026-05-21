// Backend listings expose images through `media[]` only — there is no
// `coverImageUrl` field on the DTO. Ported from
// apps/frontend/src/utils/listingImages.ts so the mobile placeholder logic
// matches the web app exactly.

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
  propertyType: string | null | undefined,
): string {
  if (!propertyType) return DEFAULT_FALLBACK;
  return FALLBACK_BY_TYPE[String(propertyType).toLowerCase()] ?? DEFAULT_FALLBACK;
}

/** First media URL on the listing, else a property-type Unsplash fallback. */
export function listingCoverUrl(listing: any): string | null {
  if (!listing) return null;
  const first = listing.media?.[0];
  if (first?.thumbnailUrl) return first.thumbnailUrl;
  if (first?.url) return first.url;
  if (listing.coverImageUrl) return listing.coverImageUrl; // legacy shape
  return fallbackImageForPropertyType(listing.propertyType);
}

/**
 * Every image URL the listing owns, in order. Falls back to a single
 * property-type Unsplash image when the listing has no uploaded media — so
 * callers can always render at least one photo.
 */
export function listingImageUrls(listing: any): string[] {
  const media: any[] = Array.isArray(listing?.media) ? listing.media : [];
  const urls = media
    // Keep image media only — videos / 360 tours are handled elsewhere. Rows
    // with no `type` are treated as images (legacy shape).
    .filter((m) => !m?.type || String(m.type).toLowerCase() === 'image')
    .map((m) => m?.url || m?.thumbnailUrl)
    .filter((u: unknown): u is string => typeof u === 'string' && u.length > 0);
  if (urls.length > 0) return urls;
  if (listing?.coverImageUrl) return [listing.coverImageUrl];
  return [fallbackImageForPropertyType(listing?.propertyType)];
}
