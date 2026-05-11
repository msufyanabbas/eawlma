import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ListingEntity } from '../listings/entities/listing.entity';
import { ListingsModule } from '../listings/listings.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PromoCodeEntity } from '../promos/entities/promo-code.entity';
import { PromoUsageEntity } from '../promos/entities/promo-usage.entity';
import { PromosModule } from '../promos/promos.module';
import { EmailModule } from '../../common/email/email.module';
import { UserEntity } from '../users/entities/user.entity';

import { BookingEntity } from './entities/booking.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      ListingEntity,
      PromoCodeEntity,
      PromoUsageEntity,
      UserEntity,
    ]),
    ListingsModule,
    PaymentsModule,
    NotificationsModule,
    PromosModule,
    EmailModule,
  ],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
