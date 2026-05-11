import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';

import { trackPageView } from '@/utils/analytics';

/** Fires a GA4 `page_view` on every route change. Mounted once at the router
 *  root so we don't need to remember to add it per-page. */
export function PageviewTracker(): null {
  const location = useLocation();
  useEffect(() => {
    // Defer to next frame so React Helmet has time to update `document.title`.
    const id = window.requestAnimationFrame(() => {
      trackPageView(location.pathname + location.search, document.title);
    });
    return () => window.cancelAnimationFrame(id);
  }, [location.pathname, location.search]);
  return null;
}
