import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  type: 'postgres' as const,
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  username: process.env.POSTGRES_USER ?? 'eawlma',
  password: process.env.POSTGRES_PASSWORD ?? 'eawlma_dev_password',
  database: process.env.POSTGRES_DB ?? 'eawlma',
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
  migrationsRun: false,
}));
