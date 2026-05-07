import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InquiryEntity } from './entities/inquiry.entity';
import { ListingEntity } from '../listings/entities/listing.entity';
import { UserEntity } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { InquiriesService } from './inquiries.service';
import { InquiriesController } from './inquiries.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([InquiryEntity, ListingEntity, UserEntity]),
    NotificationsModule,
    // Close-deal flow auto-creates a Commission row, so the InquiriesService
    // depends on CommissionsService. Imported here rather than re-exported
    // through a shared abstraction since it's the only consumer outside the
    // commissions module itself.
    CommissionsModule,
  ],
  providers: [InquiriesService],
  controllers: [InquiriesController],
  exports: [InquiriesService],
})
export class InquiriesModule {}
