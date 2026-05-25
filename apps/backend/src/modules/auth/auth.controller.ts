import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
} from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user account',
    description:
      'When a password is supplied the response is the standard auth payload (user + tokens). ' +
      'Email-only signups instead return `{ requiresVerification: true, email }` — the client ' +
      'should prompt for the OTP that was just emailed.',
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  register(
    @Body() dto: RegisterDto,
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<AuthResponseDto | { requiresVerification: true; email: string; message: string }> {
    return this.authService.register(dto, {
      ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with email + password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.login(dto, {
      ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email a 6-digit login code to the given address' })
  @ApiOkResponse({
    schema: {
      properties: {
        message: { type: 'string' },
        expiresIn: { type: 'number', description: 'Code lifetime in seconds' },
      },
    },
  })
  async sendOtp(
    @Body() dto: SendOtpDto,
  ): Promise<{ message: string; expiresIn: number }> {
    await this.authService.sendLoginOtp(dto.email);
    return { message: 'OTP sent', expiresIn: 600 };
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify an email code — logs the user in, or signals registration is needed',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired code' })
  verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<AuthResponseDto | { needsRegistration: true; email: string }> {
    return this.authService.verifyOtpAndLogin(dto.email, dto.otp, {
      ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate access + refresh tokens using a valid refresh token' })
  @ApiOkResponse({ type: AuthResponseDto })
  refresh(
    @Body() _dto: RefreshTokenDto,
    @CurrentUser() user: { id: string; jti: string; refreshToken: string },
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.refresh(user, {
      ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token (sign out this device)' })
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Public()
  @Throttle({ default: { ttl: 3_600_000, limit: 3 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Begin password-reset flow (always returns ok to prevent user enumeration)',
  })
  @ApiOkResponse({ schema: { properties: { ok: { type: 'boolean' } } } })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ ok: true }> {
    await this.authService.beginPasswordReset(dto.email);
    return { ok: true };
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke ALL refresh tokens for the current user (sign out everywhere)' })
  async logoutAll(@CurrentUser('id') userId: string): Promise<void> {
    await this.authService.logoutAll(userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change the current user password (revokes all other sessions)' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }
}
