import PostHog from 'posthog-react-native';

let client: PostHog | null = null;

export function initPostHog() {
  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!key) {
    console.log('[PostHog Mobile] No key set, skipping');
    return;
  }
  client = new PostHog(key, {
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com',
  });
  console.log('[PostHog Mobile] Initialized');
}

export function capture(event: string, properties?: Record<string, any>) {
  client?.capture(event, properties);
}

export function identify(userId: string, properties?: Record<string, any>) {
  client?.identify(userId, properties);
}

export function screen(name: string, properties?: Record<string, any>) {
  client?.screen(name, properties);
}
