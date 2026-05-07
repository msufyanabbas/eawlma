import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from '../users/entities/user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { PayoutRequestEntity } from './entities/payout-request.entity';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import { MoyasarDisbursementService } from './moyasar-disbursement.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayoutRequestEntity, UserEntity]),
    WalletModule,
    NotificationsModule,
  ],
  providers: [PayoutsService, MoyasarDisbursementService],
  controllers: [PayoutsController],
  exports: [PayoutsService],
})
export class PayoutsModule {}
