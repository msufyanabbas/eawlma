import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { ListingEntity } from '../listings/entities/listing.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AgentsController } from './agents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, ListingEntity, BookingEntity, ReviewEntity])],
  providers: [UsersService],
  controllers: [UsersController, AgentsController],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
