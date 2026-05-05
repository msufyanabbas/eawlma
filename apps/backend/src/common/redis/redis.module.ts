import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_PUB = 'REDIS_PUB';
export const REDIS_SUB = 'REDIS_SUB';
export const REDIS_DEFAULT = 'REDIS_DEFAULT';

const buildRedis = (config: ConfigService, role: string): Redis => {
  const logger = new Logger(`Redis(${role})`);
  const client = new Redis({
    host: config.get<string>('redis.host', 'localhost'),
    port: config.get<number>('redis.port', 6379),
    password: config.get<string>('redis.password') || undefined,
    db: config.get<number>('redis.db', 0),
    keyPrefix: config.get<string>('redis.keyPrefix', 'eawlma:'),
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  client.on('connect', () => logger.log('connected'));
  client.on('error', (err) => logger.error(`error: ${err.message}`));
  client.on('end', () => logger.warn('connection ended'));
  return client;
};

@Global()
@Module({
  providers: [
    {
      provide: REDIS_DEFAULT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildRedis(config, 'default'),
    },
    {
      provide: REDIS_PUB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildRedis(config, 'pub'),
    },
    {
      provide: REDIS_SUB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildRedis(config, 'sub'),
    },
  ],
  exports: [REDIS_DEFAULT, REDIS_PUB, REDIS_SUB],
})
export class RedisModule {}
