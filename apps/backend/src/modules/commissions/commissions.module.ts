import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommissionEntity } from './entities/commission.entity';
import { CommitmentOathEntity } from './entities/commitment-oath.entity';
import { CommissionsService } from './commissions.service';
import { CommissionsController } from './commissions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CommissionEntity, CommitmentOathEntity])],
  providers: [CommissionsService],
  controllers: [CommissionsController],
  exports: [CommissionsService],
})
export class CommissionsModule {}
