import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { randomInt } from 'crypto';

import { EmailService } from '../../common/email/email.service';
import { EmailOtpEntity } from './entities/email-otp.entity';

/** How long a freshly-issued code stays valid. */
const OTP_TTL_MS = 10 * 60 * 1000;
/** Wrong-guess budget before a code is dead even if still within its TTL. */
const MAX_ATTEMPTS = 3;

/**
 * Issues and verifies short-lived email login codes.
 *
 * `sendOtp` clears prior codes for the address so only the newest one works;
 * `verifyOtp` consumes a code on success and burns an attempt on a mismatch.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(EmailOtpEntity)
    private readonly otpRepo: Repository<EmailOtpEntity>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Cryptographically-secure 6-digit code. Uses `crypto.randomInt` rather
   * than `Math.random()` so the code isn't predictable from prior outputs.
   */
  generateOtp(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  async sendOtp(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();

    // One live code per address — drop any earlier rows for this email.
    await this.otpRepo.delete({ email: normalized });

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await this.otpRepo.save(
      this.otpRepo.create({ email: normalized, otp, expiresAt }),
    );

    await this.emailService.sendOtpEmail(normalized, otp);
    this.logger.debug(`OTP issued for ${normalized}`);
  }

  /**
   * Validate a code against the newest unused row for the address.
   * Returns false for unknown / expired / attempt-exhausted / mismatched
   * codes — a mismatch additionally burns one attempt. On success the code
   * is marked used so it cannot be replayed.
   */
  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const record = await this.otpRepo.findOne({
      where: { email: normalized, usedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!record) return false;
    if (record.expiresAt < new Date()) return false;
    if (record.attempts >= MAX_ATTEMPTS) return false;
    if (record.otp !== otp.trim()) {
      await this.otpRepo.increment({ id: record.id }, 'attempts', 1);
      return false;
    }

    await this.otpRepo.update(record.id, { usedAt: new Date() });
    return true;
  }

  /** Periodic cleanup hook — removes expired codes. */
  async pruneExpired(): Promise<number> {
    const result = await this.otpRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }
}
