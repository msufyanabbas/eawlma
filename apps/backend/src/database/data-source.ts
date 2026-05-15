import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

// Load .env from app root and repo root (repo root is fallback)
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../../../../.env') });

const sslEnv = process.env.POSTGRES_SSL === 'true';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? '192.168.1.125',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  username: process.env.POSTGRES_USER ?? 'eawlma',
  password: process.env.POSTGRES_PASSWORD ?? 'eawlma_dev_password',
  database: process.env.POSTGRES_DB ?? 'eawlma',
  ssl: sslEnv ? { rejectUnauthorized: false } : false,
  entities: [join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
