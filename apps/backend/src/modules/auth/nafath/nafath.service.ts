import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { randomBytes } from 'crypto';

export interface NafathProfile {
  nationalId: string;
  fullNameAr: string;
  fullNameEn: string;
  phone: string;
}

const AUTHORIZE_URL = 'https://nafath.api.absher.sa/oauth/authorize';
const TOKEN_URL = 'https://nafath.api.absher.sa/oauth/token';
const USERINFO_URL = 'https://nafath.api.absher.sa/oauth/userinfo';

/**
 * Nafath is the Saudi national digital-identity platform. We integrate via the
 * standard OAuth 2.0 authorization-code flow against the Absher endpoints. When
 * the integration secrets aren't configured (dev / preview environments) the
 * service falls back to a deterministic mock profile so the rest of the SSO
 * pipeline stays exercisable.
 */
@Injectable()
export class NafathService {
  private readonly logger = new Logger(NafathService.name);

  constructor(private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.get<string>('NAFATH_CLIENT_ID'));
  }

  getAuthorizationUrl(state?: string): string {
    if (!this.isConfigured) {
      // Dev mock — bounce to the frontend mock-Nafath page so devs see a
      // realistic Nafath approval screen instead of being silently logged in.
      // The page itself calls our `/auth/nafath/mock-callback` endpoint when
      // the user clicks "Approve".
      const frontend = this.config.get<string>('appUrl', 'http://localhost:5173');
      return `${frontend}/auth/nafath-mock`;
    }
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('NAFATH_CLIENT_ID'),
      redirect_uri: this.config.getOrThrow<string>('NAFATH_REDIRECT_URI'),
      response_type: 'code',
      scope: 'openid profile national_id phone',
      state: state ?? randomBytes(16).toString('hex'),
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<NafathProfile> {
    if (!this.isConfigured) {
      // Dev mock — return a stable test identity.
      return {
        nationalId: '1234567890',
        fullNameAr: 'محمد القحطاني',
        fullNameEn: 'Mohammed Al-Qahtani',
        phone: '+966500000000',
      };
    }

    try {
      const tokenRes = await axios.post(TOKEN_URL, {
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.getOrThrow<string>('NAFATH_REDIRECT_URI'),
        client_id: this.config.getOrThrow<string>('NAFATH_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('NAFATH_CLIENT_SECRET'),
      });

      const userRes = await axios.get(USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
      });

      const u = userRes.data;
      return {
        nationalId: u.sub ?? u.national_id ?? '',
        fullNameAr: u.name_ar ?? '',
        fullNameEn: u.name_en ?? u.name ?? '',
        phone: u.phone_number ?? '',
      };
    } catch (err) {
      this.logger.error(`Nafath callback failed: ${(err as Error).message}`);
      throw err;
    }
  }
}
