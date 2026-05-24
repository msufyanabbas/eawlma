import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * One-shot Sentry init for the Nest process. Must be called before
 * `NestFactory.create(...)` so the SDK can patch HTTP / DB integrations
 * before any module wires up. Silently no-ops when `SENTRY_DSN` is unset
 * (dev / preview environments) so local runs stay quiet.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // eslint-disable-next-line no-console
    console.info('[Sentry] No DSN set, skipping initialization');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 0.1,
  });

  // eslint-disable-next-line no-console
  console.info('[Sentry] Initialized for backend');
}

export { Sentry };
