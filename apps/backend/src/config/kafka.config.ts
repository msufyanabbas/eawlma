import { registerAs } from '@nestjs/config';

export const kafkaConfig = registerAs('kafka', () => ({
  brokers: (process.env.KAFKA_BROKERS ?? '192.168.1.125:9092').split(',').map((s) => s.trim()),
  clientId: process.env.KAFKA_CLIENT_ID ?? 'eawlma-backend',
  groupId: process.env.KAFKA_GROUP_ID ?? 'eawlma-backend-group',
  ssl: process.env.KAFKA_SSL === 'true',
  sasl:
    process.env.KAFKA_SASL_USERNAME && process.env.KAFKA_SASL_PASSWORD
      ? {
          mechanism: (process.env.KAFKA_SASL_MECHANISM ?? 'plain') as 'plain' | 'scram-sha-256' | 'scram-sha-512',
          username: process.env.KAFKA_SASL_USERNAME,
          password: process.env.KAFKA_SASL_PASSWORD,
        }
      : undefined,
  topics: {
    listingEvents: process.env.KAFKA_TOPIC_LISTING_EVENTS ?? 'eawlma.listing.events',
    translationJobs: process.env.KAFKA_TOPIC_TRANSLATION_JOBS ?? 'eawlma.translation.jobs',
    analyticsEvents: process.env.KAFKA_TOPIC_ANALYTICS ?? 'eawlma.analytics.events',
    notifications: process.env.KAFKA_TOPIC_NOTIFICATIONS ?? 'eawlma.notifications.fanout',
  },
}));
