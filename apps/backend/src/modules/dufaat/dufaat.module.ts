import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RentalContractEntity } from '../ejar/entities/rental-contract.entity';

import { DufaatPlanEntity } from './entities/dufaat-plan.entity';
import { DufaatInstallmentEntity } from './entities/dufaat-installment.entity';
import { DufaatService } from './dufaat.service';
import { DufaatController } from './dufaat.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DufaatPlanEntity,
      DufaatInstallmentEntity,
      RentalContractEntity,
    ]),
  ],
  providers: [DufaatService],
  controllers: [DufaatController],
  exports: [DufaatService],
})
export class DufaatModule {}
