import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { ListingAuditSubscriber } from './listing.subscriber';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [AuditService, ListingAuditSubscriber],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
