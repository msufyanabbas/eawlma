import type { Listing } from '@eawlma/shared-types';
import { SAUDI_CITIES } from '@/data/saudi-locations';

// Backend ships machine-translation stubs that prepend "[xx] " to the source
// string when no real translation exists yet. Treat them as missing.
const STUB_PREFIX_RE = /^\s*\[[a-z][a-zA-Z-]+\]\s/;
const HAS_REPLACEMENT_CHARS_RE = /[?�]{2,}/;

function isUsable(value: string | null | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (STUB_PREFIX_RE.test(trimmed)) return false;
  // Strings full of "?" or U+FFFD glyphs are mojibake artifacts of a previous
  // encoding-corrupted seed — never render them.
  if (HAS_REPLACEMENT_CHARS_RE.test(trimmed)) return false;
  return true;
}

/** Pick the best translation in the active locale, preferring real text. */
function pickInLocale(listing: Pick<Listing, 'title' | 'translations' | 'sourceLocale'>, locale: string) {
  const tr = listing.translations?.find((t) => t.locale === locale);
  if (isUsable(tr?.title)) return tr!.title;
  return undefined;
}

/**
 * Returns a guaranteed-usable, never-corrupted listing title.
 *
 *   1. Server-side machine translation (`titleTranslated`) — populated by
 *      the listings/search controllers when the viewer's Accept-Language
 *      differs from the listing's source locale. This is the freshest copy
 *      for the active locale, so it wins over the stored translation rows.
 *   2. Active-locale translation row (if non-empty + non-stub + non-mojibake)
 *   3. Source-locale title (if usable)
 *   4. Any other usable translation we can find
 *   5. The reference code as a last-resort label
 */
export function getListingTitle(
  listing: Pick<Listing, 'title' | 'translations' | 'sourceLocale' | 'referenceCode'> & {
    titleTranslated?: string | null;
  },
  locale: string,
): string {
  // 1. Server-side translated copy
  if (isUsable(listing.titleTranslated)) return listing.titleTranslated as string;

  // 2. Active-locale translation row
  const active = pickInLocale(listing, locale);
  if (active) return active;

  // 3. Source title
  if (isUsable(listing.title)) return listing.title;

  // 4. Any other usable translation
  const usable = listing.translations?.find((t) => isUsable(t.title));
  if (usable) return usable.title;

  // 5. Reference code
  return listing.referenceCode ?? 'Property listing';
}

/** Same fallback chain but for the description. Returns '' if everything fails. */
export function getListingDescription(
  listing: Pick<Listing, 'description' | 'translations' | 'sourceLocale'> & {
    descriptionTranslated?: string | null;
  },
  locale: string,
): string {
  if (isUsable(listing.descriptionTranslated)) return listing.descriptionTranslated as string;
  const tr = listing.translations?.find((t) => t.locale === locale);
  if (isUsable(tr?.description)) return tr!.description;
  if (isUsable(listing.description)) return listing.description;
  const usable = listing.translations?.find((t) => isUsable(t.description));
  return usable?.description ?? '';
}

/** Resolve a city value (English name, Arabic name, or id) to the active locale. */
export function getCityName(cityValue: string | null | undefined, locale: string): string {
  if (!cityValue) return '';
  const isAr = locale === 'ar';
  const city = SAUDI_CITIES.find(
    (c) => c.nameEn === cityValue || c.nameAr === cityValue || c.id === String(cityValue).toLowerCase(),
  );
  if (!city) return cityValue;
  return isAr ? city.nameAr : city.nameEn;
}

/** Resolve a region/province value to the active locale. */
export function getRegionName(regionValue: string | null | undefined, locale: string): string {
  if (!regionValue) return '';
  const isAr = locale === 'ar';
  for (const c of SAUDI_CITIES) {
    const r = c.regions.find(
      (r) => r.nameEn === regionValue || r.nameAr === regionValue || r.id === String(regionValue).toLowerCase(),
    );
    if (r) return isAr ? r.nameAr : r.nameEn;
  }
  return regionValue;
}

/**
 * Build the address line, dropping any field that contains mojibake.
 *
 * When a `locale` is supplied the city is routed through `getCityName` so the
 * card reads fully in the active language instead of bleeding the raw English
 * (or Arabic) source value.
 */
export function getListingLocation(
  listing: Pick<Listing, 'district' | 'city'>,
  locale?: string,
): string {
  const district = isUsable(listing.district) ? listing.district : undefined;
  const rawCity = isUsable(listing.city) ? listing.city : undefined;
  const city = rawCity && locale ? getCityName(rawCity, locale) : rawCity;
  if (district && city) return `${district}, ${city}`;
  return city ?? district ?? '';
}
