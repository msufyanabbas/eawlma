import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TerminusModule } from '@nestjs/terminus';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';

import { appConfig, configValidationSchema } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { jwtConfig } from './config/jwt.config';
import { kafkaConfig } from './config/kafka.config';
import { servicesConfig } from './config/services.config';
import { winstonOptionsFactory } from './config/winston.config';
import { typeOrmOptionsFactory } from './database/typeorm.options';

import { HealthController } from './common/health/health.controller';
import { RedisModule } from './common/redis/redis.module';
import { EmailModule } from './common/email/email.module';
import { KafkaModule } from './common/kafka/kafka.module';
import { RequestContextModule } from './common/context/request-context.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ListingsModule } from './modules/listings/listings.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { AuditModule } from './modules/audit/audit.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { StorageModule } from './modules/storage/storage.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, kafkaConfig, servicesConfig],
      validationSchema: configValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
      envFilePath: ['.env', '../../.env'],
    }),

    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: winstonOptionsFactory,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: typeOrmOptionsFactory,
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('app.throttle.ttl', 60) * 1000,
          limit: config.get<number>('app.throttle.limit', 100),
        },
      ],
    }),

    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({ wildcard: true, maxListeners: 32 }),
    TerminusModule,

    RedisModule,
    EmailModule,
    KafkaModule,
    RequestContextModule,
    AuthModule,
    UsersModule,
    ListingsModule,
    SearchModule,
    NotificationsModule,
    InquiriesModule,
    MessagingModule,
    AuditModule,
    SubscriptionsModule,
    PaymentsModule,
    AnalyticsModule,
    AiModule,
    StorageModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
