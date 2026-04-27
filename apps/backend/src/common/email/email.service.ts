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
  private fromEmail = 'no-reply@aqarat.sa';
  private replyTo = 'support@aqarat.sa';

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
