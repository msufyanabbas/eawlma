import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ListingEntity } from '../listings/entities/listing.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';

import { PromoCodeEntity } from './entities/promo-code.entity';
import { PromoUsageEntity } from './entities/promo-usage.entity';
import { PromosService } from './promos.service';
import { AdminPromosController, PromosController } from './promos.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PromoCodeEntity,
      PromoUsageEntity,
      ListingEntity,
      BookingEntity,
    ]),
  ],
  providers: [PromosService],
  controllers: [PromosController, AdminPromosController],
  exports: [PromosService],
})
export class PromosModule {}
