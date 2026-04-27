import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingEntity } from '../listings/entities/listing.entity';
import { ListingTranslationEntity } from '../listings/entities/listing-translation.entity';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiTranslationConsumer } from './ai.consumer';
import { OpenAiService } from './openai.service';

@Module({
  imports: [TypeOrmModule.forFeature([ListingEntity, ListingTranslationEntity])],
  providers: [OpenAiService, AiService, AiTranslationConsumer],
  controllers: [AiController],
  exports: [OpenAiService, AiService],
})
export class AiModule {}
