import posthog from 'posthog-js';

/**
 * Initialise PostHog product analytics. No-op when `VITE_POSTHOG_KEY` is
 * unset (dev without analytics) or when running outside the browser, so the
 * rest of the app can call `posthog.capture(...)` unconditionally.
 *
 * `capture_pageview` is disabled — pageviews are fired manually on route
 * change from `PageviewTracker` so they line up with TanStack Router.
 */
export function initPostHog() {
  if (typeof window === 'undefined') return;
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
    capture_pageview: true,
    loaded: (_ph) => {
      // Opted in for all environments (including local dev).
      console.log('[PostHog] Loaded and capturing');
    },
  });
}

export { posthog };
