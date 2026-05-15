import i18n from '../i18n';

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toLocaleDigits(str: string, digits: string[]): string {
  return str.replace(/[0-9]/g, (d) => digits[parseInt(d, 10)]);
}

// Render the raw value as-is for LTR locales; rewrite ASCII digits to
// Arabic-Indic / Persian numerals when the active language is ar / fa. Pass
// `locale` to override the active i18n language (useful in pure functions
// outside React).
export function formatNumber(num: number | string, locale?: string): string {
  const lang = locale || i18n.language || 'en';
  const str = String(num);
  if (lang === 'ar') return toLocaleDigits(str, ARABIC_DIGITS);
  if (lang === 'fa') return toLocaleDigits(str, PERSIAN_DIGITS);
  return str;
}

// Number with thousands grouping in the viewer's locale, then digit rewrite.
// We always use the en-US grouping (1,234,567) so the comma placement is
// predictable — Arabic readers are accustomed to Western grouping in prices.
export function formatPrice(price: number | string, locale?: string): string {
  const lang = locale || i18n.language || 'en';
  const num = typeof price === 'string' ? Number(price) : price;
  if (!Number.isFinite(num)) return String(price);
  const grouped = num.toLocaleString('en-US');
  if (lang === 'ar') return toLocaleDigits(grouped, ARABIC_DIGITS);
  if (lang === 'fa') return toLocaleDigits(grouped, PERSIAN_DIGITS);
  return grouped;
}

export function formatBedrooms(count: number, locale?: string): string {
  return formatNumber(count, locale);
}
