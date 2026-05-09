/**
 * Hijri date helpers — uses the Umm al-Qura calendar (`islamic-umalqura`),
 * the official calendar used by the Kingdom of Saudi Arabia.
 *
 * Backed entirely by the platform's built-in `Intl.DateTimeFormat` so we
 * don't pull in a separate calendar library.
 */
export function formatHijri(
  date: string | Date,
  locale: string = 'ar-SA',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura`, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return '';
  }
}

export function formatGregorian(
  date: string | Date,
  locale: string = 'en',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatHijriAndGregorian(
  date: string | Date,
  locale: string = 'en',
): string {
  const greg = formatGregorian(date, locale);
  const hijri = formatHijri(date, locale.startsWith('ar') ? 'ar-SA' : 'en');
  if (!hijri) return greg;
  return `${greg} (${hijri})`;
}
