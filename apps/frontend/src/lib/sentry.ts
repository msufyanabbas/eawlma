import * as Sentry from '@sentry/react';

/**
 * One-shot Sentry init. Called from main.tsx before the React root renders so
 * any throw during render is captured. When `VITE_SENTRY_DSN` is unset (dev,
 * CI, or a self-hosted build that opts out) we skip silently so no extra
 * requests fire and dev logs stay clean.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    // Avoid a noisy log every page load — dev environments routinely
    // run without a DSN and this is expected, not an error.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info('[Sentry] No DSN set, skipping initialization');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    enabled: import.meta.env.PROD,
    beforeSend(event) {
      // Drop events from localhost so accidental "open the prod build on
      // your laptop" sessions don't pollute Sentry with developer noise.
      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        return null;
      }
      return event;
    },
  });
}

export { Sentry };
