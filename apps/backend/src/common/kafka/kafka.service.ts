import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, logLevel, Producer, SASLOptions } from 'kafkajs';

export interface PublishOptions<T> {
  topic: string;
  key?: string;
  value: T;
  headers?: Record<string, string>;
}

/**
 * Application-wide Kafka producer.
 *
 * Connects lazily on first publish; if connection fails (broker missing in dev)
 * we log the event and continue — events for the day are reconstructable from
 * the database where source-of-truth lives.
 */
@Injectable()
export class KafkaService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private connected = false;
  private connecting: Promise<void> | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (process.env.KAFKA_ENABLED === 'false') {
      this.logger.log('KAFKA_ENABLED=false — producer disabled');
      return;
    }
    const brokers = this.config.get<string[]>('kafka.brokers') ?? ['192.168.1.125:9094'];
    const clientId = this.config.get<string>('kafka.clientId', 'eawlma-backend');
    const ssl = this.config.get<boolean>('kafka.ssl', false);
    const sasl = this.config.get<SASLOptions | undefined>('kafka.sasl');
    this.kafka = new Kafka({
      brokers,
      clientId,
      ssl,
      sasl,
      logLevel: logLevel.WARN,
      retry: { retries: 3, initialRetryTime: 300, maxRetryTime: 5_000 },
      connectionTimeout: 5_000,
    });
    this.producer = this.kafka.producer({ allowAutoTopicCreation: true });
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.producer && this.connected) {
      try {
        await this.producer.disconnect();
      } catch (err) {
        this.logger.warn(`Producer disconnect failed: ${(err as Error).message}`);
      }
    }
  }

  /** Publishes a JSON event. Failures are logged, not thrown. */
  async publish<T>(opts: PublishOptions<T>): Promise<void> {
    if (!this.producer) return;
    try {
      await this.ensureConnected();
      await this.producer.send({
        topic: opts.topic,
        messages: [
          {
            key: opts.key,
            value: JSON.stringify(opts.value),
            headers: opts.headers,
          },
        ],
      });
    } catch (err) {
      this.logger.error(
        `Kafka publish failed (topic=${opts.topic}): ${(err as Error).message}`,
      );
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected || !this.producer) return;
    if (this.connecting) return this.connecting;
    this.connecting = this.producer
      .connect()
      .then(() => {
        this.connected = true;
        this.logger.log('Kafka producer connected');
      })
      .catch((err) => {
        this.logger.warn(`Kafka producer connection failed: ${err.message}`);
        throw err;
      })
      .finally(() => {
        this.connecting = null;
      });
    return this.connecting;
  }
}
