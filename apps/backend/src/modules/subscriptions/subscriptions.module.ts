import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanEntity } from './entities/plan.entity';
import { SubscriptionEntity } from './entities/subscription.entity';
import { ListingEntity } from '../listings/entities/listing.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlanEntity, SubscriptionEntity, ListingEntity])],
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService, TypeOrmModule],
})
export class SubscriptionsModule {}

// `forwardRef` is exported for ListingsModule which depends back on this
// module for the quota guard — preserves the import-cycle guard.
export { forwardRef };
