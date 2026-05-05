import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka, logLevel, SASLOptions } from 'kafkajs';
import { AiService } from './ai.service';

/**
 * Auto-translation pipeline.
 *
 * Subscribes to listing.events and triggers a fan-out translation when a
 * listing is published or its title/description changes. Each event is
 * processed best-effort: errors are logged but do not stop the consumer.
 */
@Injectable()
export class AiTranslationConsumer implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(AiTranslationConsumer.name);
  private kafka!: Kafka;
  private consumer: Consumer | null = null;
  private connected = false;

  constructor(
    private readonly config: ConfigService,
    private readonly aiService: AiService,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokers = this.config.get<string[]>('kafka.brokers') ?? ['localhost:9094'];
    const clientId =
      (this.config.get<string>('kafka.clientId') ?? 'eawlma-backend') + '-ai';
    const groupId =
      (this.config.get<string>('kafka.groupId') ?? 'eawlma-backend-group') + '-ai';
    const ssl = this.config.get<boolean>('kafka.ssl', false);
    const sasl = this.config.get<SASLOptions | undefined>('kafka.sasl');

    this.kafka = new Kafka({
      brokers,
      clientId,
      ssl,
      sasl,
      logLevel: logLevel.WARN,
      retry: { retries: 3 },
      connectionTimeout: 5_000,
    });
    this.consumer = this.kafka.consumer({ groupId });

    const listingTopic =
      this.config.get<string>('kafka.topics.listingEvents') ?? 'eawlma.listing.events';

    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: listingTopic, fromBeginning: false });
      this.connected = true;
      this.logger.log(
        `AI translation consumer subscribed (group=${groupId}, topic=${listingTopic})`,
      );

      void this.consumer.run({
        eachMessage: async ({ message }) => {
          try {
            const value = message.value?.toString('utf-8');
            if (!value) return;
            const payload = JSON.parse(value) as Record<string, unknown>;
            await this.handle(payload);
          } catch (err) {
            this.logger.warn(`Failed to process AI translation event: ${(err as Error).message}`);
          }
        },
      });
    } catch (err) {
      this.logger.warn(
        `AI translation consumer could not connect — auto-translation paused until broker is reachable: ${(err as Error).message}`,
      );
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.consumer && this.connected) {
      try {
        await this.consumer.disconnect();
      } catch (err) {
        this.logger.warn(`AI consumer disconnect failed: ${(err as Error).message}`);
      }
    }
  }

  private async handle(payload: Record<string, unknown>): Promise<void> {
    const eventType = payload.eventType as string | undefined;
    if (eventType !== 'listing.published' && eventType !== 'listing.updated') return;

    const listingId = payload.listingId as string | undefined;
    if (!listingId) return;

    // For updates we only re-translate when title or description changed.
    if (eventType === 'listing.updated') {
      const changedFields = (payload.changedFields as string[] | undefined) ?? [];
      const textRelevant = changedFields.some((f) => f === 'title' || f === 'description');
      if (!textRelevant) return;
    }

    try {
      const items = await this.aiService.translateListing(listingId);
      this.logger.log(
        `Auto-translated listing ${listingId} into ${items.length} locales (event=${eventType})`,
      );
    } catch (err) {
      this.logger.warn(
        `Auto-translation failed for ${listingId}: ${(err as Error).message}`,
      );
    }
  }
}
