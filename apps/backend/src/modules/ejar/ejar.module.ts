import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ListingEntity } from '../listings/entities/listing.entity';

import { RentalContractEntity } from './entities/rental-contract.entity';
import { EjarService } from './ejar.service';
import { EjarController } from './ejar.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RentalContractEntity, ListingEntity])],
  providers: [EjarService],
  controllers: [EjarController],
  exports: [EjarService],
})
export class EjarModule {}
