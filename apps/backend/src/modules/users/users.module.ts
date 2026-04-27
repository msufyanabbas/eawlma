import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { ListingEntity } from '../listings/entities/listing.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AgentsController } from './agents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, ListingEntity])],
  providers: [UsersService],
  controllers: [UsersController, AgentsController],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
