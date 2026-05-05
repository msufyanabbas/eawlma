import type { Listing } from '@eawlma/shared-types';

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
 *   1. Active-locale translation (if non-empty + non-stub + non-mojibake)
 *   2. Source-locale title (if usable)
 *   3. Any other usable translation we can find
 *   4. The English translation specifically (extra safety net)
 *   5. The reference code as a last-resort label
 */
export function getListingTitle(
  listing: Pick<Listing, 'title' | 'translations' | 'sourceLocale' | 'referenceCode'>,
  locale: string,
): string {
  // 1. Active locale
  const active = pickInLocale(listing, locale);
  if (active) return active;

  // 2. Source title
  if (isUsable(listing.title)) return listing.title;

  // 3. Any other usable translation
  const usable = listing.translations?.find((t) => isUsable(t.title));
  if (usable) return usable.title;

  // 4. Reference code
  return listing.referenceCode ?? 'Property listing';
}

/** Same fallback chain but for the description. Returns '' if everything fails. */
export function getListingDescription(
  listing: Pick<Listing, 'description' | 'translations' | 'sourceLocale'>,
  locale: string,
): string {
  const tr = listing.translations?.find((t) => t.locale === locale);
  if (isUsable(tr?.description)) return tr!.description;
  if (isUsable(listing.description)) return listing.description;
  const usable = listing.translations?.find((t) => isUsable(t.description));
  return usable?.description ?? '';
}

/** Build the address line, dropping any field that contains mojibake. */
export function getListingLocation(listing: Pick<Listing, 'district' | 'city'>): string {
  const district = isUsable(listing.district) ? listing.district : undefined;
  const city = isUsable(listing.city) ? listing.city : undefined;
  if (district && city) return `${district}, ${city}`;
  return city ?? district ?? '';
}
