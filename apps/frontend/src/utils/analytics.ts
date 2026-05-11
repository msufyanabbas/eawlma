/**
 * Google Analytics 4 helpers.
 *
 * Loads gtag dynamically only when `VITE_GA_MEASUREMENT_ID` is configured —
 * in dev (no measurement id) every public function becomes a no-op, so the
 * rest of the app can call into it without guards.
 */

type GtagArgs = (string | number | boolean | Record<string, unknown> | Date | null | undefined)[];

const GA_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID ?? '').trim();
let initialised = false;

function isEnabled(): boolean {
  return Boolean(GA_ID) && GA_ID !== 'undefined' && GA_ID !== '%VITE_GA_MEASUREMENT_ID%';
}

/** Inject the gtag <script> + base `config` call. Idempotent. Called once
 *  from main.tsx so client code never has to think about it. */
export function initGA(): void {
  if (!isEnabled() || initialised) return;
  initialised = true;

  const tag = document.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(tag);

  window.dataLayer = window.dataLayer || [];
  // gtag is defined to forward into the dataLayer — the GA snippet's standard
  // pattern. Use `function` (not arrow) so `arguments` is preserved.
  function gtag(...args: GtagArgs) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag as Window['gtag'];
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    page_title: document.title,
    page_location: window.location.href,
    send_page_view: false,
  });
}

export function trackPageView(path: string, title?: string): void {
  if (!isEnabled() || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title ?? document.title,
    page_location: window.location.href,
  });
}

export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number,
  extra?: Record<string, unknown>,
): void {
  if (!isEnabled() || !window.gtag) return;
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value,
    ...(extra ?? {}),
  });
}

/** Real-estate-specific event surface used by feature code. Keeps the GA
 *  vocabulary (`view_item`, `purchase`, …) consistent and discoverable. */
export const GA = {
  viewListing: (listingId: string, title: string, price: number) =>
    trackEvent('view_item', 'listing', title, price, { listing_id: listingId }),

  saveListing: (listingId: string) =>
    trackEvent('add_to_wishlist', 'listing', listingId),

  sendInquiry: (listingId: string) =>
    trackEvent('generate_lead', 'inquiry', listingId),

  beginBooking: (listingId: string, nights: number, amount: number) =>
    trackEvent('begin_checkout', 'booking', listingId, amount, { nights }),

  completeBooking: (bookingId: string, amount: number) =>
    trackEvent('purchase', 'booking', bookingId, amount),

  search: (query: string, resultsCount: number) =>
    trackEvent('search', 'listings', query, resultsCount),

  register: (role: string) => trackEvent('sign_up', 'auth', role),

  login: (method: string) => trackEvent('login', 'auth', method),
};
