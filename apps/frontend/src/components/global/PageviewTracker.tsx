import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';

import { trackPageView } from '@/utils/analytics';

/** Fires a GA4 `page_view` on every route change. Mounted once at the router
 *  root so we don't need to remember to add it per-page. */
export function PageviewTracker(): null {
  const location = useLocation();
  useEffect(() => {
    // Tanstack Router's `location.search` is the *parsed* search object — not a
    // query string. Concatenating it directly with `+` triggers
    // "Cannot convert object to primitive value". Stringify it instead.
    const searchStr = (() => {
      const s = location.search as unknown;
      if (s == null) return '';
      if (typeof s === 'string') return s;
      try {
        const params = new URLSearchParams(s as Record<string, string>).toString();
        return params ? `?${params}` : '';
      } catch {
        return '';
      }
    })();
    // Defer to next frame so React Helmet has time to update `document.title`.
    const id = window.requestAnimationFrame(() => {
      trackPageView(location.pathname + searchStr, document.title);
    });
    return () => window.cancelAnimationFrame(id);
  }, [location.pathname, location.search]);
  return null;
}
