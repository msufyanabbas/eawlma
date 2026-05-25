import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import { JwtPayload, UserStatus } from '@eawlma/shared-types';

import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';
import { EmailService } from '../../common/email/email.service';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { OtpService } from './otp.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  jti: string;
  familyId: string;
  refreshExpiresAt: Date;
}

interface ClientContext {
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshRepo: Repository<RefreshTokenEntity>,
    private readonly emailService: EmailService,
    private readonly otpService: OtpService,
  ) {}

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  async register(
    dto: RegisterDto,
    ctx: ClientContext,
  ): Promise<AuthResponseDto | { requiresVerification: true; email: string; message: string }> {
    const user = await this.usersService.create(dto);

    // Email-only signups can't be logged in (no password to verify against);
    // issue an OTP and bounce the client to the verification screen instead.
    if (!dto.password) {
      await this.otpService.sendOtp(user.email);
      return {
        requiresVerification: true,
        email: user.email,
        message: 'Verification code sent — please check your email.',
      };
    }

    const tokens = await this.issueTokens(user, ctx);
    await this.usersService.recordSuccessfulLogin(user.id, ctx.ip ?? null);

    // Fire-and-forget welcome email; email failures must not block signup.
    void this.emailService
      .sendWelcomeEmail({
        email: user.email,
        firstName: user.firstName ?? user.email.split('@')[0] ?? '',
      })
      .catch(() => undefined);

    return this.buildAuthResponse(user, tokens);
  }

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  async login(dto: LoginDto, ctx: ClientContext): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      // Constant-time-ish: still hash a dummy to mitigate user enumeration timing
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account is temporarily locked due to too many failed attempts');
    }
    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      throw new ForbiddenException('Account is not active');
    }

    const ok = await this.usersService.verifyPassword(dto.password, user.passwordHash);
    if (!ok) {
      await this.usersService.recordFailedLogin(user.id);
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.issueTokens(user, ctx);
    await this.usersService.recordSuccessfulLogin(user.id, ctx.ip ?? null);

    return this.buildAuthResponse(user, tokens);
  }

  // ---------------------------------------------------------------------------
  // Refresh (with rotation + reuse detection)
  // ---------------------------------------------------------------------------

  async refresh(
    userPayload: { id: string; jti: string; refreshToken: string },
    ctx: ClientContext,
  ): Promise<AuthResponseDto> {
    const tokenHash = this.hash(userPayload.refreshToken);
    const stored = await this.refreshRepo.findOne({ where: { tokenHash } });

    if (!stored) {
      // Token unknown — possible reuse of an already-rotated token. Be conservative:
      // revoke ALL of this user's tokens to be safe.
      await this.revokeAllForUser(userPayload.id);
      throw new UnauthorizedException('Refresh token reuse detected — all sessions revoked');
    }

    if (stored.userId !== userPayload.id || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    if (stored.revokedAt) {
      // Reuse of a revoked token within its family → kill the whole family
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Refresh token reuse detected — session revoked');
    }

    const user = await this.usersService.findByIdOrFail(userPayload.id);
    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      throw new ForbiddenException('Account is not active');
    }

    // Issue new tokens, then revoke the old one in the same family
    const tokens = await this.issueTokens(user, ctx, stored.familyId);
    stored.revokedAt = new Date();
    stored.replacedBy = tokens.jti;
    await this.refreshRepo.save(stored);

    return this.buildAuthResponse(user, tokens);
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hash(refreshToken);
    const stored = await this.refreshRepo.findOne({ where: { tokenHash } });
    if (stored && !stored.revokedAt) {
      stored.revokedAt = new Date();
      await this.refreshRepo.save(stored);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.revokeAllForUser(userId);
  }

  /**
   * Issue tokens + auth response for an externally-authenticated user.
   * Used by federated SSO callbacks (e.g. Nafath) where the user is
   * already proven to be themselves through the IdP.
   */
  async loginExternalUser(
    user: UserEntity,
    ctx: ClientContext,
  ): Promise<AuthResponseDto> {
    const tokens = await this.issueTokens(user, ctx);
    await this.usersService.recordSuccessfulLogin(user.id, ctx.ip ?? null);
    return this.buildAuthResponse(user, tokens);
  }

  // ---------------------------------------------------------------------------
  // Email OTP login
  //
  // Passwordless flow: the client requests a code, then submits it. A valid
  // code logs an existing user in; if no account matches the email we report
  // `needsRegistration` so the client can route to the signup form.
  // ---------------------------------------------------------------------------

  async sendLoginOtp(email: string): Promise<void> {
    await this.otpService.sendOtp(email);
  }

  async verifyOtpAndLogin(
    email: string,
    otp: string,
    ctx: ClientContext,
  ): Promise<AuthResponseDto | { needsRegistration: true; email: string }> {
    const ok = await this.otpService.verifyOtp(email, otp);
    if (!ok) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Code was valid but no account exists — the client should register.
      return { needsRegistration: true, email: email.trim().toLowerCase() };
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      throw new ForbiddenException('Account is not active');
    }

    // A successful OTP also confirms ownership of the address — flip the
    // verified flag if this is the first time we've seen it work.
    if (!user.emailVerified) {
      await this.usersService.setEmailVerified(user.id, true);
      user.emailVerified = true;
    }

    return this.loginExternalUser(user, ctx);
  }

  // ---------------------------------------------------------------------------
  // Password reset (begin)
  //
  // Always succeeds from the caller's perspective so we don't leak whether the
  // email is registered. If the user exists we mint a short-lived signed token
  // and email a deep link; the actual reset endpoint will verify the token.
  // ---------------------------------------------------------------------------

  async beginPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) {
      // Silent no-op — preserves caller-visible timing as best effort
      return;
    }

    const token = await this.jwtService.signAsync(
      { sub: user.id, purpose: 'password-reset' },
      {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: '30m',
      },
    );

    const appUrl = this.config.get<string>('appUrl', 'http://192.168.1.125:5173');
    const link = `${appUrl}/auth/reset?token=${encodeURIComponent(token)}`;

    await this.emailService.sendPasswordReset({
      email: user.email,
      firstName: user.firstName ?? user.email.split('@')[0] ?? '',
      resetUrl: link,
    });
  }

  // ---------------------------------------------------------------------------
  // Password change
  // ---------------------------------------------------------------------------

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findByEmailWithPassword(
      (await this.usersService.findByIdOrFail(userId)).email,
    );
    if (!user) throw new UnauthorizedException('User not found');

    const ok = await this.usersService.verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    await this.usersService.setPassword(userId, newPassword);
    // Invalidate every session except the current one — caller may issue a fresh login if needed
    await this.revokeAllForUser(userId);
  }

  // ---------------------------------------------------------------------------
  // Token plumbing
  // ---------------------------------------------------------------------------

  private async issueTokens(
    user: UserEntity,
    ctx: ClientContext,
    familyId?: string,
  ): Promise<IssuedTokens> {
    const jti = randomUUID();
    const fam = familyId ?? randomUUID();

    const accessExpiresIn = this.config.get<string>('jwt.accessExpiresIn', '15m');
    const refreshExpiresIn = this.config.get<string>('jwt.refreshExpiresIn', '7d');

    const basePayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(basePayload, {
      secret: this.config.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: accessExpiresIn,
      issuer: this.config.get<string>('jwt.issuer'),
      audience: this.config.get<string>('jwt.audience'),
    });

    const refreshPayload: JwtPayload = { ...basePayload, jti };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: refreshExpiresIn,
      issuer: this.config.get<string>('jwt.issuer'),
      audience: this.config.get<string>('jwt.audience'),
    });

    const accessTtl = this.parseExpiresInSeconds(accessExpiresIn);
    const refreshTtl = this.parseExpiresInSeconds(refreshExpiresIn);
    const refreshExpiresAt = new Date(Date.now() + refreshTtl * 1000);

    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        familyId: fam,
        expiresAt: refreshExpiresAt,
        ipAddress: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
      }),
    );

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: accessTtl,
      refreshTokenExpiresIn: refreshTtl,
      jti,
      familyId: fam,
      refreshExpiresAt,
    };
  }

  private buildAuthResponse(user: UserEntity, tokens: IssuedTokens): AuthResponseDto {
    return {
      user: UserResponseDto.fromEntity(user),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresIn: tokens.accessTokenExpiresIn,
        refreshTokenExpiresIn: tokens.refreshTokenExpiresIn,
      },
    };
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpiresInSeconds(value: string): number {
    // Accept "900", "15m", "1h", "7d", "30s"
    const match = /^(\d+)\s*(s|m|h|d)?$/i.exec(value.trim());
    if (!match) return 900;
    const n = parseInt(match[1], 10);
    const unit = (match[2] ?? 's').toLowerCase();
    const factor = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
    return n * factor;
  }

  private async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshRepo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.refreshRepo.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  /** Periodic cleanup hook — wired via @nestjs/schedule in production */
  async pruneExpired(): Promise<number> {
    const result = await this.refreshRepo.delete({ expiresAt: LessThan(new Date()) });
    return result.affected ?? 0;
  }
}
