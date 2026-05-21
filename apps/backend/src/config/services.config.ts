import { registerAs } from '@nestjs/config';

export const servicesConfig = registerAs('services', () => ({
  aws: {
    region: process.env.AWS_REGION ?? 'me-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
  ses: {
    fromEmail: process.env.SES_FROM_EMAIL ?? 'no-reply@eawlma.sa',
    replyTo: process.env.SES_REPLY_TO ?? 'support@eawlma.sa',
  },
  s3: {
    bucket: process.env.S3_BUCKET ?? '',
    region: process.env.S3_REGION ?? process.env.AWS_REGION ?? 'me-south-1',
    presignExpiresSeconds: parseInt(process.env.S3_PRESIGN_EXPIRES_SECONDS ?? '900', 10),
    cloudfrontUrl: process.env.CLOUDFRONT_URL ?? '',
  },
  bedrock: {
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
    model: process.env.BEDROCK_MODEL ?? 'anthropic.claude-3-5-haiku-20241022-v1:0',
    maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS ?? '2000', 10),
  },
  authentica: {
    apiKey: process.env.AUTHENTICA_API_KEY ?? '',
    baseUrl: process.env.AUTHENTICA_BASE_URL ?? 'https://api.authentica.sa',
  },
  moyasar: {
    secretKey: process.env.MOYASAR_SECRET_KEY ?? '',
    publishableKey: process.env.MOYASAR_PUBLISHABLE_KEY ?? '',
    webhookSecret: process.env.MOYASAR_WEBHOOK_SECRET ?? '',
    apiUrl: process.env.MOYASAR_API_URL ?? 'https://api.moyasar.com/v1',
  },
  google: {
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
    geocodingApiKey: process.env.GOOGLE_GEOCODING_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? '',
  },
}));
