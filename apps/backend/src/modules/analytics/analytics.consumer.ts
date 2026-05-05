import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka, logLevel, SASLOptions } from 'kafkajs';
import { AnalyticsService } from './analytics.service';

/**
 * Subscribes to listing.events + analytics.events topics and folds each
 * incoming event into the daily metrics aggregator.
 */
@Injectable()
export class AnalyticsConsumer implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(AnalyticsConsumer.name);
  private kafka!: Kafka;
  private consumer: Consumer | null = null;
  private connected = false;

  constructor(
    private readonly config: ConfigService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokers = this.config.get<string[]>('kafka.brokers') ?? ['localhost:9094'];
    const clientId = this.config.get<string>('kafka.clientId', 'eawlma-backend') + '-analytics';
    const groupId = this.config.get<string>('kafka.groupId', 'eawlma-backend-group') + '-analytics';
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
    const analyticsTopic =
      this.config.get<string>('kafka.topics.analyticsEvents') ?? 'eawlma.analytics.events';

    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: listingTopic, fromBeginning: false });
      await this.consumer.subscribe({ topic: analyticsTopic, fromBeginning: false });
      this.connected = true;
      this.logger.log(
        `Analytics consumer subscribed (group=${groupId}, topics=${listingTopic}, ${analyticsTopic})`,
      );

      void this.consumer.run({
        eachMessage: async ({ topic, message }) => {
          try {
            const value = message.value ? message.value.toString('utf-8') : null;
            if (!value) return;
            const payload = JSON.parse(value) as Record<string, unknown>;
            const eventType = (payload.eventType as string | undefined) ?? topic;
            await this.dispatch(eventType, payload);
          } catch (err) {
            this.logger.warn(`Failed to process message: ${(err as Error).message}`);
          }
        },
      });
    } catch (err) {
      this.logger.warn(
        `Analytics consumer could not connect — events will be dropped until the broker is reachable: ${(err as Error).message}`,
      );
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.consumer && this.connected) {
      try {
        await this.consumer.disconnect();
      } catch (err) {
        this.logger.warn(`Consumer disconnect failed: ${(err as Error).message}`);
      }
    }
  }

  private async dispatch(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    switch (eventType) {
      case 'listing.viewed': {
        const listingId = payload.listingId as string | undefined;
        if (!listingId) return;
        await this.analyticsService.bump({
          listingId,
          field: 'detailViews',
          source: payload.source as string | undefined,
          device: payload.device as string | undefined,
        });
        await this.analyticsService.bump({
          listingId,
          field: 'impressions',
          source: payload.source as string | undefined,
          device: payload.device as string | undefined,
        });
        return;
      }
      case 'inquiry.created': {
        const listingId = payload.listingId as string | undefined;
        if (!listingId) return;
        await this.analyticsService.bump({ listingId, field: 'inquiries' });
        return;
      }
      case 'search.performed': {
        const listingIds = (payload.matchedListingIds as string[] | undefined) ?? [];
        for (const id of listingIds) {
          await this.analyticsService.bump({
            listingId: id,
            field: 'impressions',
            source: 'search',
          });
        }
        return;
      }
      default:
      // Unknown event types are ignored so newer producers don't crash old
      // consumers — see the schema-evolution guide.
    }
  }
}
