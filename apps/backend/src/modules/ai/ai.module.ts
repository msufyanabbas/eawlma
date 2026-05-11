import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingEntity } from '../listings/entities/listing.entity';
import { ListingTranslationEntity } from '../listings/entities/listing-translation.entity';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiTranslationConsumer } from './ai.consumer';
import { OpenAiService } from './openai.service';
import { AIPricingService } from './ai-pricing.service';
import { AIPricingController } from './ai-pricing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ListingEntity, ListingTranslationEntity])],
  providers: [OpenAiService, AiService, AiTranslationConsumer, AIPricingService],
  controllers: [AiController, AIPricingController],
  exports: [OpenAiService, AiService, AIPricingService],
})
export class AiModule {}
