import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PropertyRequestEntity } from './entities/property-request.entity';
import { PropertyRequestsService } from './property-requests.service';
import { PropertyRequestsController } from './property-requests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyRequestEntity])],
  providers: [PropertyRequestsService],
  controllers: [PropertyRequestsController],
  exports: [PropertyRequestsService],
})
export class PropertyRequestsModule {}
