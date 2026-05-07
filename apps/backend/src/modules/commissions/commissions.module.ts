import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ListingEntity } from '../listings/entities/listing.entity';
import { UserEntity } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommissionEntity } from './entities/commission.entity';
import { CommitmentOathEntity } from './entities/commitment-oath.entity';
import { CommissionsService } from './commissions.service';
import { CommissionsController } from './commissions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommissionEntity,
      CommitmentOathEntity,
      ListingEntity,
      UserEntity,
    ]),
    NotificationsModule,
  ],
  providers: [CommissionsService],
  controllers: [CommissionsController],
  exports: [CommissionsService],
})
export class CommissionsModule {}
