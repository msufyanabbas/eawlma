import type { Listing } from '@eawlma/shared-types';

/**
 * Builds a wa.me deep-link with a localised, listing-aware prefilled message.
 * Use this everywhere instead of hand-rolling `wa.me?text=…` so the message
 * shape stays consistent across the app.
 *
 * Phone is sanitised (digits only) — wa.me requires the bare international
 * number without `+` or spaces.
 */
export function whatsappListingUrl(
  phone: string | null | undefined,
  listing: Pick<Listing, 'title' | 'price'> & { id?: string },
  options: { locale?: string; absoluteUrl?: string } = {},
): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const locale = options.locale ?? 'ar';
  const price = Number(listing.price ?? 0);
  const url =
    options.absoluteUrl ??
    (typeof window !== 'undefined' ? window.location.href : '');

  const lines =
    locale === 'ar'
      ? [
          'السلام عليكم، أنا مهتم بالعقار:',
          listing.title,
          `${price.toLocaleString('ar')} ريال`,
          url,
        ]
      : [
          'Hi, I am interested in this property:',
          listing.title,
          `${price.toLocaleString('en')} SAR`,
          url,
        ];
  const text = encodeURIComponent(lines.filter(Boolean).join('\n'));
  return `https://wa.me/${digits}?text=${text}`;
}
