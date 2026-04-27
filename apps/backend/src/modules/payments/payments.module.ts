import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentEntity } from './entities/payment.entity';
import { ListingEntity } from '../listings/entities/listing.entity';
import { UserEntity } from '../users/entities/user.entity';

import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MoyasarClient } from './moyasar.client';
import { InvoiceService } from './invoice.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity, ListingEntity, UserEntity]),
    SubscriptionsModule,
    NotificationsModule,
  ],
  providers: [PaymentsService, MoyasarClient, InvoiceService],
  controllers: [PaymentsController],
  exports: [PaymentsService, MoyasarClient],
})
export class PaymentsModule {}
