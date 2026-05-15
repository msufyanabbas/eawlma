import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  name: process.env.APP_NAME ?? 'eawlma',
  port: parseInt(process.env.BACKEND_PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  appUrl: process.env.APP_URL ?? 'http://192.168.1.125:5173',
  apiUrl: process.env.API_URL ?? 'http://192.168.1.125:3000',
  corsOrigins: (process.env.CORS_ORIGINS ?? process.env.APP_URL ?? 'http://192.168.1.125:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  defaultLocale: process.env.DEFAULT_LOCALE ?? 'ar',
  supportedLocales: (process.env.SUPPORTED_LOCALES ?? 'ar,en').split(',').map((s) => s.trim()),
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
}));

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'staging', 'production').default('development'),
  BACKEND_PORT: Joi.number().integer().min(1).max(65535).default(3000),

  // Postgres
  POSTGRES_HOST: Joi.string().default('192.168.1.125'),
  POSTGRES_PORT: Joi.number().integer().default(5432),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_SSL: Joi.boolean().default(false),

  // Redis
  REDIS_HOST: Joi.string().default('192.168.1.125'),
  REDIS_PORT: Joi.number().integer().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().integer().default(0),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Kafka
  KAFKA_BROKERS: Joi.string().default('192.168.1.125:9092'),
  KAFKA_CLIENT_ID: Joi.string().default('eawlma-backend'),
  KAFKA_GROUP_ID: Joi.string().default('eawlma-backend-group'),

  // External services (optional in dev)
  AWS_REGION: Joi.string().optional(),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  SES_FROM_EMAIL: Joi.string().email().optional(),
  SES_REPLY_TO: Joi.string().email().optional(),

  OPENAI_API_KEY: Joi.string().allow('').optional(),
  OPENAI_MODEL: Joi.string().default('gpt-4o'),

  AUTHENTICA_API_KEY: Joi.string().allow('').optional(),
  AUTHENTICA_BASE_URL: Joi.string().uri().optional(),

  MOYASAR_SECRET_KEY: Joi.string().allow('').optional(),
  MOYASAR_PUBLISHABLE_KEY: Joi.string().allow('').optional(),
  MOYASAR_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  GOOGLE_MAPS_API_KEY: Joi.string().allow('').optional(),
  GOOGLE_GEOCODING_API_KEY: Joi.string().allow('').optional(),
});
