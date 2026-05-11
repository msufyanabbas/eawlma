import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface WhatsAppResult {
  success: boolean;
  mock?: boolean;
  messageId?: string;
}

/**
 * Lightweight wrapper around the 360dialog WhatsApp Business API — the
 * most common BSP in Saudi Arabia. When no API key is configured (dev
 * environments) every method becomes a no-op that logs the payload, so
 * the rest of the app can call into it without guards.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiKey: string;
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.apiKey =
      this.config.get<string>('services.whatsapp.apiKey') ??
      process.env.WHATSAPP_API_KEY ??
      '';
    const baseURL =
      this.config.get<string>('services.whatsapp.apiUrl') ??
      'https://waba.360dialog.io/v1';
    this.http = axios.create({
      baseURL,
      timeout: 15_000,
      headers: this.apiKey ? { 'D360-API-KEY': this.apiKey } : undefined,
    });
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private frontendUrl(): string {
    return (
      this.config.get<string>('app.frontendUrl') ??
      process.env.FRONTEND_URL ??
      'https://eawlma.sa'
    );
  }

  /** Sends a raw text message. Phone digits are sanitised here so callers
   *  don't have to. */
  async sendMessage(to: string, message: string): Promise<WhatsAppResult> {
    const digits = (to ?? '').replace(/\D/g, '');
    if (!digits) return { success: false };
    if (!this.isConfigured()) {
      this.logger.log(`[whatsapp-stub] to=+${digits} message="${message.slice(0, 80)}…"`);
      return { success: true, mock: true };
    }
    try {
      const { data } = await this.http.post<{ messages?: Array<{ id: string }> }>(
        '/messages',
        {
          to: digits,
          type: 'text',
          text: { body: message },
        },
      );
      return {
        success: true,
        messageId: data?.messages?.[0]?.id,
      };
    } catch (err) {
      this.logger.warn(
        `WhatsApp send failed for +${digits}: ${(err as Error).message}`,
      );
      return { success: false };
    }
  }

  async sendBookingConfirmation(params: {
    phone: string;
    guestName: string;
    listingTitle: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
  }): Promise<WhatsAppResult> {
    const message =
      `✅ *Booking confirmed!*\n\n` +
      `Hello ${params.guestName},\n` +
      `Your booking is confirmed:\n\n` +
      `🏠 *${params.listingTitle}*\n` +
      `📅 Check-in: ${params.checkIn}\n` +
      `📅 Check-out: ${params.checkOut}\n` +
      `💰 Total: ${params.totalAmount.toLocaleString('en')} SAR\n\n` +
      `View your booking: ${this.frontendUrl()}/dashboard/bookings`;
    return this.sendMessage(params.phone, message);
  }

  async sendInquiryAlert(params: {
    agentPhone: string;
    buyerName: string;
    listingTitle: string;
    message: string;
  }): Promise<WhatsAppResult> {
    const body =
      `🔔 *New inquiry on Eawlma*\n\n` +
      `From: ${params.buyerName}\n` +
      `Property: ${params.listingTitle}\n` +
      `Message: ${params.message.slice(0, 500)}\n\n` +
      `Reply at: ${this.frontendUrl()}/dashboard/inquiries`;
    return this.sendMessage(params.agentPhone, body);
  }

  async sendPaymentReceived(params: {
    agentPhone: string;
    amount: number;
    listingTitle: string;
  }): Promise<WhatsAppResult> {
    const body =
      `💰 *Payment received!*\n\n` +
      `Amount: ${params.amount.toLocaleString('en')} SAR\n` +
      `Property: ${params.listingTitle}\n` +
      `Wallet: ${this.frontendUrl()}/dashboard/wallet`;
    return this.sendMessage(params.agentPhone, body);
  }
}
