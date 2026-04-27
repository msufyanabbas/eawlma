import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ListingEntity } from '../listings/entities/listing.entity';
import { UserEntity } from '../users/entities/user.entity';

import { ListingsModule } from '../listings/listings.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

import { ModerationService } from './moderation.service';
import { AdminListingsController } from './admin-listings.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ListingEntity, UserEntity]),
    ListingsModule,
    UsersModule,
    NotificationsModule,
    AuditModule,
  ],
  providers: [ModerationService],
  controllers: [AdminListingsController, AdminUsersController],
  exports: [ModerationService],
})
export class AdminModule {}
