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
}

@Injectable()
export class MoyasarDisbursementService {
  private readonly logger = new Logger(MoyasarDisbursementService.name);
  private readonly baseUrl = 'https://api.moyasar.com/v1';
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly isConfigured: boolean;

  constructor(private readonly config: ConfigService) {
    this.secretKey =
      this.config.get<string>('MOYASAR_SECRET_KEY') ??
      this.config.get<string>('services.moyasar.secretKey') ??
      '';
    this.webhookSecret =
      this.config.get<string>('MOYASAR_WEBHOOK_SECRET') ??
      this.config.get<string>('services.moyasar.webhookSecret') ??
      '';
    this.isConfigured = Boolean(this.secretKey);
    if (!this.isConfigured) {
      this.logger.warn(
        'MOYASAR_SECRET_KEY is not set — disbursement calls will run in mock mode',
      );
    }
  }

  /** True when a real Moyasar key is configured — used by the webhook
   *  controller to decide whether to enforce signature verification. */
  isLive(): boolean {
    return this.isConfigured;
  }

  async createDisbursement(params: {
    amount: number; // in SAR (whole units — converted to halalas internally)
    ibanNumber: string;
    beneficiaryName: string;
    description: string;
    reference: string;
  }): Promise<MoyasarDisbursement> {
    if (!this.isConfigured) {
      // Mock mode — used in dev/test where no Moyasar key is configured.
      // Returns an immediately-paid disbursement so the happy path still
      // exercises the wallet debit + agent notification end-to-end.
      this.logger.warn(
        `[mock] disbursement of ${params.amount} SAR to ${params.ibanNumber} (ref ${params.reference})`,
      );
      return {
        id: `mock_disb_${Date.now()}`,
        status: 'paid',
        amount: Math.round(params.amount * 100),
        currency: 'SAR',
        reference: params.reference,
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
    if (!this.isConfigured) {
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
