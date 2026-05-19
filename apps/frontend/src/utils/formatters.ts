import i18n from '@/i18n';

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Resolve the active language without crashing if i18n hasn't finished
 * its async `init()` yet. The fallback order is:
 *
 *   1. `i18n.language` once it's a populated string
 *   2. the value the language detector persisted to localStorage
 *   3. `'ar'` — the canonical default for Eawlma
 *
 * Going through the i18next singleton is preferred (it's the source of
 * truth once initialized), but a formatter called between bundle eval and
 * the first init() tick would otherwise see `undefined` and route to the
 * Latin branch by accident.
 */
function getActiveLanguage(): string {
  if (i18n && typeof i18n.language === 'string' && i18n.language.length > 0) {
    return i18n.language;
  }
  try {
    return localStorage.getItem('eawlma.locale') ?? 'ar';
  } catch {
    return 'ar';
  }
}

function toLocaleDigits(str: string, digits: string[]): string {
  return str.replace(/[0-9]/g, (d) => digits[parseInt(d, 10)]);
}

// Returns `num` with digit-shape rewritten for the active locale. Arabic
// readers see Eastern-Arabic digits (٠–٩); Persian readers see their own
// variant; every other locale keeps the original Western digits.
export function formatNumber(num: number | string, locale?: string): string {
  const lang = locale || getActiveLanguage();
  const str = String(num);
  if (lang === 'ar') return toLocaleDigits(str, ARABIC_DIGITS);
  if (lang === 'fa') return toLocaleDigits(str, PERSIAN_DIGITS);
  return str;
}

// Always groups with the en-US comma format (1,234,567) — Arabic readers are
// accustomed to Western grouping in property prices — then rewrites digits.
export function formatPrice(price: number | string, locale?: string): string {
  const lang = locale || getActiveLanguage();
  const n = typeof price === 'string' ? Number(price) : price;
  if (!Number.isFinite(n)) return String(price);
  const grouped = n.toLocaleString('en-US');
  if (lang === 'ar') return toLocaleDigits(grouped, ARABIC_DIGITS);
  if (lang === 'fa') return toLocaleDigits(grouped, PERSIAN_DIGITS);
  return grouped;
}
