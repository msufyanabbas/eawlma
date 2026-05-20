import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** ISO-639-1 language tag for the rendered template ('ar' or 'en'). */
  locale?: 'ar' | 'en';
}

/**
 * Wrapper around AWS SES.
 *
 * In development without AWS credentials this becomes a no-op that logs the
 * email payload — that lets the rest of the app keep working without a live
 * SES setup. In production it sends via the real SES API.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private client: SESClient | null = null;
  private fromEmail = 'no-reply@eawlma.sa';
  private replyTo = 'support@eawlma.sa';

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const region = this.config.get<string>('services.aws.region', 'me-south-1');
    const accessKeyId = this.config.get<string>('services.aws.accessKeyId') ?? '';
    const secretAccessKey = this.config.get<string>('services.aws.secretAccessKey') ?? '';
    this.fromEmail = this.config.get<string>('services.ses.fromEmail', this.fromEmail);
    this.replyTo = this.config.get<string>('services.ses.replyTo', this.replyTo);

    if (accessKeyId && secretAccessKey) {
      this.client = new SESClient({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log(`SES client initialised (region=${region})`);
    } else {
      this.logger.warn(
        'AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY not set — EmailService will log instead of send',
      );
    }
  }

  private frontendUrl(): string {
    return (
      this.config.get<string>('app.frontendUrl') ??
      process.env.FRONTEND_URL ??
      'https://eawlma.sa'
    );
  }

  // ----- Template helpers ---------------------------------------------------

  async sendWelcomeEmail(user: { email: string; firstName: string }): Promise<void> {
    await this.send({
      to: user.email,
      subject: 'Welcome to Eawlma! 🏠 / مرحباً بك في عولمة',
      html: this.welcomeTemplate(user.firstName),
    });
  }

  async sendInquiryNotification(params: {
    agentEmail: string;
    buyerName: string;
    listingTitle: string;
    message: string;
    listingUrl: string;
  }): Promise<void> {
    await this.send({
      to: params.agentEmail,
      subject: `New inquiry — ${params.listingTitle}`,
      html: this.inquiryTemplate(params),
    });
  }

  async sendBookingConfirmation(params: {
    guestEmail: string;
    guestName: string;
    listingTitle: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalAmount: number;
    bookingId: string;
  }): Promise<void> {
    await this.send({
      to: params.guestEmail,
      subject: `Booking confirmed — ${params.listingTitle} ✅`,
      html: this.bookingConfirmationTemplate(params),
    });
  }

  async sendPasswordReset(params: {
    email: string;
    firstName: string;
    resetUrl: string;
  }): Promise<void> {
    await this.send({
      to: params.email,
      subject: 'Reset your Eawlma password / إعادة تعيين كلمة المرور',
      html: this.passwordResetTemplate(params),
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Your Eawlma verification code',
      html: this.otpTemplate(otp),
      text:
        `Your verification code is: ${otp}\n` +
        'This code expires in 10 minutes.\n' +
        'Do not share this code with anyone.',
    });
  }

  async sendContactFormEmail(params: {
    name: string;
    email: string;
    message: string;
  }): Promise<void> {
    const adminEmail =
      this.config.get<string>('services.ses.adminEmail') ??
      process.env.ADMIN_EMAIL ??
      'admin@eawlma.sa';
    await this.send({
      to: adminEmail,
      subject: `Contact form — ${params.name}`,
      html: `<h2>New contact form submission</h2>
        <p><strong>Name:</strong> ${escape(params.name)}</p>
        <p><strong>Email:</strong> ${escape(params.email)}</p>
        <p><strong>Message:</strong></p>
        <pre style="white-space:pre-wrap;font-family:inherit">${escape(params.message)}</pre>`,
      replyTo: params.email,
    });
  }

  // ----- HTML templates -----------------------------------------------------

  private brandHeader(): string {
    return `<div style="background:linear-gradient(135deg,#6C63A6,#4A4080);padding:32px;text-align:center;color:white">
      <h1 style="margin:0;font-size:26px;font-weight:800">🏠 Eawlma / عولمة</h1>
    </div>`;
  }

  private brandFooter(): string {
    return `<div style="background:#f5f5f5;padding:16px;text-align:center;color:#666;font-size:12px">© ${new Date().getFullYear()} Eawlma — Riyadh, Saudi Arabia</div>`;
  }

  private welcomeTemplate(firstName: string): string {
    const url = this.frontendUrl();
    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;margin:0">
      ${this.brandHeader()}
      <div style="padding:32px">
        <h2>Welcome, ${escape(firstName)}! 👋</h2>
        <p>Thank you for joining Eawlma — Saudi Arabia's premier real estate platform.</p>
        <ul>
          <li>Browse thousands of properties</li>
          <li>Connect with verified agents</li>
          <li>Book chalets and short stays</li>
        </ul>
        <a href="${url}" style="display:inline-block;padding:14px 28px;background:#6C63A6;color:white;text-decoration:none;border-radius:8px;font-weight:700;margin-top:16px">Start exploring →</a>
      </div>
      ${this.brandFooter()}
    </body></html>`;
  }

  private inquiryTemplate(params: {
    buyerName: string;
    listingTitle: string;
    message: string;
    listingUrl: string;
  }): string {
    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;margin:0">
      ${this.brandHeader()}
      <div style="padding:32px">
        <h2>New inquiry from ${escape(params.buyerName)}</h2>
        <div style="border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin:16px 0">
          <p><strong>Listing:</strong> ${escape(params.listingTitle)}</p>
          <p><strong>Message:</strong></p>
          <pre style="white-space:pre-wrap;font-family:inherit">${escape(params.message)}</pre>
        </div>
        <a href="${params.listingUrl}" style="display:inline-block;padding:12px 24px;background:#6C63A6;color:white;text-decoration:none;border-radius:6px">View inquiry →</a>
      </div>
      ${this.brandFooter()}
    </body></html>`;
  }

  private bookingConfirmationTemplate(params: {
    guestName: string;
    listingTitle: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalAmount: number;
  }): string {
    const url = `${this.frontendUrl()}/dashboard/bookings`;
    const row = (k: string, v: string) =>
      `<tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>${escape(k)}</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${escape(v)}</td></tr>`;
    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;margin:0">
      ${this.brandHeader()}
      <div style="padding:32px">
        <h2>✅ Booking confirmed</h2>
        <p>Hi ${escape(params.guestName)}, your booking is confirmed:</p>
        <table style="width:100%;background:#f9f9f9;border-radius:8px;padding:16px;border-collapse:separate">
          ${row('Property', params.listingTitle)}
          ${row('Check-in', params.checkIn)}
          ${row('Check-out', params.checkOut)}
          ${row('Nights', String(params.nights))}
          ${row('Total', `${params.totalAmount.toLocaleString('en')} SAR`)}
        </table>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#6C63A6;color:white;text-decoration:none;border-radius:6px;margin-top:16px">View booking →</a>
      </div>
      ${this.brandFooter()}
    </body></html>`;
  }

  private passwordResetTemplate(params: { firstName: string; resetUrl: string }): string {
    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;margin:0;padding:32px">
      <h2>Reset your password</h2>
      <p>Hi ${escape(params.firstName)},</p>
      <p>Click below to reset your password. This link expires in 1 hour.</p>
      <a href="${params.resetUrl}" style="display:inline-block;padding:14px 28px;background:#6C63A6;color:white;text-decoration:none;border-radius:8px;font-weight:700">Reset password →</a>
      <p style="color:#999;margin-top:20px;font-size:12px">If you didn't request this, ignore this email.</p>
    </body></html>`;
  }

  private otpTemplate(otp: string): string {
    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;margin:0">
      ${this.brandHeader()}
      <div style="padding:32px;text-align:center">
        <h2 style="margin-top:0">Your verification code</h2>
        <p style="color:#555">Use the code below to sign in to Eawlma.</p>
        <div style="font-size:38px;font-weight:800;letter-spacing:12px;color:#6C63A6;background:#f4f3fa;border-radius:12px;padding:20px 12px;margin:24px 0">${escape(otp)}</div>
        <p style="color:#999;font-size:13px">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
      ${this.brandFooter()}
    </body></html>`;
  }

  async send(params: SendEmailParams): Promise<{ delivered: boolean; messageId?: string }> {
    const recipients = Array.isArray(params.to) ? params.to : [params.to];

    if (!this.client) {
      this.logger.log(
        `[email-stub] to=${recipients.join(',')} subject="${params.subject}" locale=${params.locale ?? 'en'}`,
      );
      return { delivered: false };
    }

    try {
      const cmd = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: { ToAddresses: recipients },
        ReplyToAddresses: [params.replyTo ?? this.replyTo],
        Message: {
          Subject: { Charset: 'UTF-8', Data: params.subject },
          Body: {
            Html: { Charset: 'UTF-8', Data: params.html },
            ...(params.text
              ? { Text: { Charset: 'UTF-8', Data: params.text } }
              : {}),
          },
        },
      });
      const result = await this.client.send(cmd);
      return { delivered: true, messageId: result.MessageId };
    } catch (err) {
      this.logger.error(
        `Failed to send email to ${recipients.join(',')}: ${(err as Error).message}`,
      );
      return { delivered: false };
    }
  }
}

/** Minimal HTML-entity escape so user-supplied content doesn't break our
 *  templates or open XSS holes in clients that render the HTML body. */
function escape(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
