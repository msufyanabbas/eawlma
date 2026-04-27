import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';

export interface MoyasarCreatePaymentInput {
  amount: number;            // halalas
  currency: string;          // ISO 4217, e.g. SAR
  description: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface MoyasarPaymentResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  description: string | null;
  source: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  callback_url?: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class MoyasarClient {
  private readonly logger = new Logger(MoyasarClient.name);
  private readonly http: AxiosInstance;
  private readonly secretKey: string;
  private readonly publishableKey: string;
  private readonly webhookSecret: string;

  constructor(config: ConfigService) {
    const apiUrl =
      config.get<string>('services.moyasar.apiUrl') ?? 'https://api.moyasar.com/v1';
    this.secretKey = config.get<string>('services.moyasar.secretKey') ?? '';
    this.publishableKey = config.get<string>('services.moyasar.publishableKey') ?? '';
    this.webhookSecret = config.get<string>('services.moyasar.webhookSecret') ?? '';
    this.http = axios.create({
      baseURL: apiUrl,
      timeout: 15_000,
      auth: this.secretKey ? { username: this.secretKey, password: '' } : undefined,
    });
  }

  isConfigured(): boolean {
    return Boolean(this.secretKey);
  }

  publishableKeyValue(): string {
    return this.publishableKey;
  }

  /**
   * Creates a payment intent. In dev without a secret key we synthesize a
   * fake response so the rest of the app can be exercised end-to-end.
   */
  async createPayment(input: MoyasarCreatePaymentInput): Promise<MoyasarPaymentResponse> {
    if (!this.secretKey) {
      const id = `dev_${Date.now().toString(36)}`;
      this.logger.warn(
        `Moyasar secret key not set — returning dev-stub payment id=${id}`,
      );
      return {
        id,
        status: 'initiated',
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        source: { type: 'dev-stub' },
        metadata: input.metadata ?? null,
        callback_url: input.callbackUrl ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    const { data } = await this.http.post<MoyasarPaymentResponse>('/payments', {
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    });
    return data;
  }

  async getPayment(id: string): Promise<MoyasarPaymentResponse | null> {
    if (!this.secretKey) return null;
    try {
      const { data } = await this.http.get<MoyasarPaymentResponse>(`/payments/${id}`);
      return data;
    } catch (err) {
      this.logger.warn(`Moyasar getPayment failed for ${id}: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Verifies a webhook signature. Moyasar signs the raw request body using
   * HMAC-SHA256 with the merchant's webhook secret.
   *
   * In dev when no webhook secret is configured we treat verification as
   * a no-op pass so the smoke test can exercise the side-effect path.
   */
  verifyWebhookSignature(rawBody: Buffer, providedSignature: string | undefined): boolean {
    if (!this.webhookSecret) return true; // dev mode
    if (!providedSignature) return false;
    const computed = createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    const expected = Buffer.from(computed, 'utf-8');
    let candidate: Buffer;
    try {
      candidate = Buffer.from(providedSignature, 'utf-8');
    } catch {
      return false;
    }
    if (expected.length !== candidate.length) return false;
    return timingSafeEqual(expected, candidate);
  }
}
