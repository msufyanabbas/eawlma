import {
  BadRequestException,
  Controller,
  Get,
  Ip,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { Public } from '../../../common/decorators/public.decorator';

import { NafathService } from './nafath.service';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../auth.service';

@ApiTags('auth')
@Controller({ path: 'auth/nafath', version: '1' })
export class NafathController {
  constructor(
    private readonly nafath: NafathService,
    private readonly users: UsersService,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Step 1 — Frontend hits this endpoint, we redirect the browser to Nafath.
   * In dev (no client ID configured) we redirect to the mock-callback so the
   * round-trip still completes locally.
   */
  @Public()
  @Get('authorize')
  @ApiOperation({ summary: 'Begin Nafath OAuth flow — redirects to Absher.' })
  authorize(@Res() res: Response): void {
    const url = this.nafath.getAuthorizationUrl();
    res.redirect(url);
  }

  /**
   * Step 2 — Nafath redirects back here with an `?code`. We exchange it for a
   * profile, find or create the local user, then bounce the browser to the
   * frontend callback page with tokens in the URL.
   */
  @Public()
  @Get('callback')
  @ApiOperation({
    summary: 'Nafath OAuth callback — exchanges the code and issues JWTs.',
  })
  async callback(
    @Query('code') code: string | undefined,
    @Ip() ip: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!code) throw new BadRequestException('Missing authorization code');
    await this.completeLogin(code, ip, req.headers['user-agent'] ?? null, res);
  }

  /**
   * Dev-only endpoint — only registered when Nafath is unconfigured. Returns
   * the mock profile via the same code path so dev environments can exercise
   * the full SSO flow without real Nafath credentials.
   */
  @Public()
  @Get('mock-callback')
  @ApiOperation({ summary: 'Dev-only Nafath mock callback.' })
  async mockCallback(
    @Ip() ip: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (this.nafath.isConfigured) {
      throw new BadRequestException('Mock callback disabled when Nafath is configured');
    }
    await this.completeLogin('mock-code', ip, req.headers['user-agent'] ?? null, res);
  }

  private async completeLogin(
    code: string,
    ip: string | null,
    userAgent: string | null,
    res: Response,
  ): Promise<void> {
    const profile = await this.nafath.handleCallback(code);

    let user =
      (profile.nationalId
        ? await this.users.findByNafathNationalId(profile.nationalId)
        : null) ??
      (profile.phone ? await this.users.findByPhone(profile.phone) : null);

    if (!user) {
      user = await this.users.createFromNafath(profile);
    } else if (!user.isNafathVerified || user.nafathNationalId !== profile.nationalId) {
      await this.users.markNafathVerified(user.id, profile.nationalId);
      user.nafathNationalId = profile.nationalId;
      user.isNafathVerified = true;
    }

    const tokens = await this.auth.loginExternalUser(user, { ip, userAgent });

    const frontend = this.config.get<string>('appUrl', 'http://localhost:5173');
    const target =
      `${frontend}/auth/nafath-callback` +
      `?accessToken=${encodeURIComponent(tokens.tokens.accessToken)}` +
      `&refreshToken=${encodeURIComponent(tokens.tokens.refreshToken)}`;
    res.redirect(target);
  }
}
