import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, Length, Matches } from 'class-validator';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationStatus } from '@eawlma/shared-types';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserEntity } from '../users/entities/user.entity';
import { AuthenticaClient } from './authentica.client';

class AuthenticaInitDto {
  /** Saudi national ID or Iqama (10 digits). */
  @IsString()
  @Length(10, 10, { message: 'nationalId must be 10 digits' })
  @Matches(/^\d{10}$/)
  nationalId: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/)
  phone: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  callbackUrl?: string;
}

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

@ApiTags('auth')
@Controller({ path: 'auth/authentica', version: '1' })
export class AuthenticaController {
  private readonly logger = new Logger(AuthenticaController.name);

  constructor(
    private readonly authentica: AuthenticaClient,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('init')
  @ApiOperation({
    summary:
      'Begin a Saudi national-ID + phone OTP verification. Returns a verification ID and (optionally) a redirect URL the user must visit. Falls back to a stub when AUTHENTICA_API_KEY is missing.',
  })
  @ApiOkResponse()
  async init(
    @CurrentUser('id') userId: string,
    @Body() dto: AuthenticaInitDto,
  ) {
    const result = await this.authentica.init({
      userId,
      nationalId: dto.nationalId,
      phone: dto.phone,
      callbackUrl: dto.callbackUrl,
    });

    // Mark the user's identity verification as PENDING immediately so the UI
    // can reflect it without waiting for the webhook.
    await this.users.update(
      { id: userId },
      { identityVerificationStatus: VerificationStatus.PENDING, nationalId: dto.nationalId },
    );

    return {
      verificationId: result.verificationId,
      status: result.status,
      redirectUrl: result.redirectUrl,
      live: result.live,
    };
  }

  /**
   * Webhook endpoint Authentica.sa calls after the user completes verification.
   *
   * The expected payload shape is documented in the merchant onboarding kit
   * — left as a TODO. We accept anything matching `{ user_id, status }` plus
   * an `x-authentica-signature` HMAC header.
   */
  @Public()
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authentica.sa webhook (HMAC-verified).' })
  async callback(
    @Headers('x-authentica-signature') signature: string | undefined,
    @Req() req: RequestWithRawBody,
    @Body() body: { user_id?: string; userId?: string; status?: string },
  ) {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(body), 'utf-8');
    const ok = this.authentica.verifyWebhookSignature(raw, signature);
    if (!ok) {
      this.logger.warn('Authentica webhook signature failed verification');
      return { ok: false };
    }
    const userId = body.user_id ?? body.userId;
    if (!userId) {
      this.logger.warn('Authentica webhook missing user_id');
      return { ok: false };
    }
    const status = mapAuthenticaStatus(body.status);
    await this.users.update({ id: userId }, { identityVerificationStatus: status });
    this.logger.log(`Authentica → user ${userId} status=${status}`);
    return { ok: true };
  }
}

function mapAuthenticaStatus(remote: string | undefined): VerificationStatus {
  switch ((remote ?? '').toLowerCase()) {
    case 'verified':
    case 'approved':
    case 'success':
      return VerificationStatus.VERIFIED;
    case 'rejected':
    case 'failed':
      return VerificationStatus.REJECTED;
    case 'pending':
    case 'in_review':
    default:
      return VerificationStatus.PENDING;
  }
}
