import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

export interface AuthenticaInitInput {
  userId: string;
  nationalId: string;
  phone: string;
  callbackUrl?: string;
}

export interface AuthenticaInitResult {
  verificationId: string;
  status: 'pending' | 'verified' | 'rejected';
  redirectUrl: string | null;
  /** True when this came from the live Authentica API; false in dev-stub mode. */
  live: boolean;
}

/**
 * Thin client for Authentica.sa identity-verification (Saudi national-ID + Iqama).
 *
 * IMPORTANT — STUB IMPLEMENTATION:
 * The exact Authentica REST contract isn't documented in this repo and depends
 * on the merchant's onboarding kit. The shape below mirrors common KYC vendors:
 *
 *   POST  https://api.authentica.sa/v1/verifications
 *         Headers: Authorization: Bearer ${AUTHENTICA_API_KEY}
 *         Body:    { national_id, phone, callback_url, metadata: { user_id } }
 *         Returns: { verification_id, status, redirect_url }
 *
 *   Webhook: POST {AUTHENTICA_WEBHOOK_URL}  (signed via x-authentica-signature)
 *         Body: { verification_id, status, user_id }
 *
 * Replace the body shape + URL paths below once you have the real Authentica
 * portal credentials. The graceful-fallback path (no API key configured →
 * deterministic stub) lets us E2E-test the front-end "Verify Identity" flow.
 */
@Injectable()
export class AuthenticaClient {
  private readonly logger = new Logger(AuthenticaClient.name);
  private readonly http: AxiosInstance;
  private readonly apiKey: string;
  private readonly webhookSecret: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('services.authentica.apiKey') ?? '';
    this.webhookSecret = config.get<string>('services.authentica.webhookSecret', '');
    this.http = axios.create({
      baseURL: config.get<string>('services.authentica.baseUrl') ?? 'https://api.authentica.sa',
      timeout: 15_000,
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined,
    });
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async init(input: AuthenticaInitInput): Promise<AuthenticaInitResult> {
    if (!this.apiKey) {
      const verificationId = `dev_${randomUUID()}`;
      this.logger.warn(
        `AUTHENTICA_API_KEY not set — returning dev-stub verification id=${verificationId}`,
      );
      return {
        verificationId,
        status: 'pending',
        redirectUrl: null,
        live: false,
      };
    }
    try {
      // TODO: confirm exact path + body shape against your Authentica portal docs.
      const { data } = await this.http.post<{
        verification_id: string;
        status: string;
        redirect_url?: string;
      }>('/v1/verifications', {
        national_id: input.nationalId,
        phone: input.phone,
        callback_url: input.callbackUrl,
        metadata: { user_id: input.userId },
      });
      return {
        verificationId: data.verification_id,
        status: (data.status as 'pending' | 'verified' | 'rejected') ?? 'pending',
        redirectUrl: data.redirect_url ?? null,
        live: true,
      };
    } catch (err) {
      this.logger.error(`Authentica init failed: ${(err as Error).message}`);
      throw err;
    }
  }

  /** Verifies the HMAC signature on incoming webhook calls. */
  verifyWebhookSignature(rawBody: Buffer, providedSignature: string | undefined): boolean {
    if (!this.webhookSecret) return true; // dev mode
    if (!providedSignature) return false;
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const a = Buffer.from(expected, 'utf-8');
    const b = Buffer.from(providedSignature, 'utf-8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}
