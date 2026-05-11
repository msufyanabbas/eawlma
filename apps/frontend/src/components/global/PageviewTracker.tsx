import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';

import { trackPageView } from '@/utils/analytics';

/** Fires a GA4 `page_view` on every route change. Mounted once at the router
 *  root so we don't need to remember to add it per-page. */
/** Stringifies Tanstack Router's parsed `search` object into a `?a=1&b=2`
 *  fragment. Skips entries whose value can't be coerced to a useful string. */
function searchToString(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.startsWith('?') ? raw : raw ? `?${raw}` : '';
  if (typeof raw !== 'object') return '';
  try {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (value == null) continue;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        params.set(key, String(value));
      }
    }
    const out = params.toString();
    return out ? `?${out}` : '';
  } catch {
    return '';
  }
}

export function PageviewTracker(): null {
  const location = useLocation();
  useEffect(() => {
    // Defer to the next frame so React Helmet has time to update
    // `document.title`, then call into analytics inside try/catch so a
    // misbehaving `gtag`/cookie consent shim can never bubble up and break
    // the app.
    const id = window.requestAnimationFrame(() => {
      try {
        const path = location?.pathname ?? '/';
        trackPageView(path + searchToString(location?.search), document.title);
      } catch {
        // analytics failures are never fatal
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [location?.pathname, location?.search]);
  return null;
}
