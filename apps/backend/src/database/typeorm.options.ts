import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export const typeOrmOptionsFactory = (config: ConfigService): TypeOrmModuleOptions => {
  const isProduction = config.get<string>('app.nodeEnv') === 'production';
  const db = config.get<{
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl: false | { rejectUnauthorized: boolean };
    logging: boolean;
  }>('database');

  if (!db) {
    throw new Error('Database configuration is missing');
  }

  return {
    type: 'postgres',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    ssl: db.ssl,
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: false,
    logging: db.logging,
    namingStrategy: undefined,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    extra: {
      max: parseInt(process.env.PG_POOL_MAX ?? '20', 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    },
    poolErrorHandler: (err) => {
      // eslint-disable-next-line no-console
      console.error('PG pool error', err);
    },
    retryAttempts: isProduction ? 10 : 3,
    retryDelay: 3000,
  };
};
