import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ListingEntity } from '../listings/entities/listing.entity';
import { UserEntity } from '../users/entities/user.entity';
import { InquiryEntity } from '../inquiries/entities/inquiry.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { CommissionEntity } from '../commissions/entities/commission.entity';
import { WalletTransactionEntity } from '../wallet/entities/wallet-transaction.entity';

import { ListingsModule } from '../listings/listings.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

import { ModerationService } from './moderation.service';
import { AdminStatsService } from './admin-stats.service';
import { AdminListingsController } from './admin-listings.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminStatsController } from './admin-stats.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ListingEntity,
      UserEntity,
      InquiryEntity,
      BookingEntity,
      CommissionEntity,
      WalletTransactionEntity,
    ]),
    ListingsModule,
    UsersModule,
    NotificationsModule,
    AuditModule,
  ],
  providers: [ModerationService, AdminStatsService],
  controllers: [AdminListingsController, AdminUsersController, AdminStatsController],
  exports: [ModerationService, AdminStatsService],
})
export class AdminModule {}
