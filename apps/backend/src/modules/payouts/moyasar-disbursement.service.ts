import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';

export interface MoyasarDisbursement {
  id: string;
  status: string;
  amount?: number;
  currency?: string;
  reference?: string;
  failure_reason?: string;
  created_at?: string;
}

export interface MoyasarDisbursementCreateParams {
  amount: number; // in SAR (whole units — converted to halalas internally)
  ibanNumber: string;
  beneficiaryName: string;
  description: string;
  reference: string;
}

@Injectable()
export class MoyasarDisbursementService {
  private readonly logger = new Logger(MoyasarDisbursementService.name);
  private readonly baseUrl = 'https://api.moyasar.com/v1';
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly nodeEnv: string;

  constructor(private readonly config: ConfigService) {
    this.secretKey =
      this.config.get<string>('MOYASAR_SECRET_KEY') ??
      this.config.get<string>('services.moyasar.secretKey') ??
      '';
    this.webhookSecret =
      this.config.get<string>('MOYASAR_WEBHOOK_SECRET') ??
      this.config.get<string>('services.moyasar.webhookSecret') ??
      '';
    this.nodeEnv =
      this.config.get<string>('NODE_ENV') ??
      this.config.get<string>('app.nodeEnv') ??
      'development';
    if (!this.isLive) {
      this.logger.log(
        `Moyasar disbursements running in MOCK mode (nodeEnv=${this.nodeEnv}, secretKey=${this.secretKey ? 'set' : 'unset'})`,
      );
    }
  }

  /**
   * Live mode requires *both* a real secret key and `NODE_ENV=production`.
   * Anything else (dev, staging, test, missing key) falls through to the
   * mock so we never blow up on a Moyasar account that doesn't have
   * disbursements enabled — the API returns "Resource not found" for
   * accounts without the disbursements add-on, and we don't want to
   * surface that to the agent in dev.
   */
  get isLive(): boolean {
    return Boolean(this.secretKey) && this.nodeEnv === 'production';
  }

  async createDisbursement(
    params: MoyasarDisbursementCreateParams,
  ): Promise<MoyasarDisbursement> {
    if (!this.isLive) {
      this.logger.log(
        `Dev mode: mocking disbursement as paid (${params.amount} SAR → ${params.ibanNumber}, ref ${params.reference})`,
      );
      return {
        id: `mock_disb_${Date.now()}`,
        status: 'paid',
        amount: Math.round(params.amount * 100),
        currency: 'SAR',
        reference: params.reference,
        created_at: new Date().toISOString(),
      };
    }

    try {
      const response = await axios.post<MoyasarDisbursement>(
        `${this.baseUrl}/disbursements`,
        {
          amount: Math.round(params.amount * 100), // halalas
          currency: 'SAR',
          description: params.description,
          reference: params.reference,
          beneficiary: {
            name: params.beneficiaryName,
            iban: params.ibanNumber,
          },
        },
        {
          auth: { username: this.secretKey, password: '' },
          headers: { 'Content-Type': 'application/json' },
          timeout: 15_000,
        },
      );
      return response.data;
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const msg =
        axiosErr.response?.data?.message ?? axiosErr.message ?? 'Disbursement failed';
      this.logger.error(`Moyasar disbursement failed: ${msg}`);
      throw new Error(msg);
    }
  }

  async getDisbursement(disbursementId: string): Promise<MoyasarDisbursement> {
    if (!this.isLive) {
      return { id: disbursementId, status: 'paid' };
    }
    const response = await axios.get<MoyasarDisbursement>(
      `${this.baseUrl}/disbursements/${disbursementId}`,
      {
        auth: { username: this.secretKey, password: '' },
        timeout: 15_000,
      },
    );
    return response.data;
  }

  /**
   * Verify the X-Moyasar-Signature header against a shared HMAC secret. When
   * the webhook secret is not configured we accept all webhooks (dev mode);
   * production must always set MOYASAR_WEBHOOK_SECRET.
   */
  verifyWebhookSignature(rawBody: Buffer | string, signature: string | undefined): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('MOYASAR_WEBHOOK_SECRET not set — accepting webhook without verification');
      return true;
    }
    if (!signature) return false;
    const computed = createHmac('sha256', this.webhookSecret)
      .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
      .digest('hex');
    try {
      return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}
