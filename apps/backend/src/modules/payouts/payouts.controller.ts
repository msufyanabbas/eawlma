import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserRole } from '@eawlma/shared-types';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

import { PayoutsService } from './payouts.service';
import { MoyasarDisbursementService } from './moyasar-disbursement.service';
import {
  PayoutResponseDto,
  PayoutSummaryDto,
  RejectPayoutDto,
  RequestPayoutDto,
} from './dto/payout.dto';
import { PayoutStatus } from './entities/payout-request.entity';

@ApiTags('payouts')
@Controller({ path: 'payouts', version: '1' })
export class PayoutsController {
  constructor(
    private readonly payouts: PayoutsService,
    private readonly moyasar: MoyasarDisbursementService,
  ) {}

  // ---------------------------------------------------------------------------
  // Agent
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.AGENCY_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Post('request')
  @ApiOperation({ summary: 'Agent requests a payout to their bank account.' })
  async request(
    @CurrentUser() user: RequestUser,
    @Body() dto: RequestPayoutDto,
  ): Promise<PayoutResponseDto> {
    const payout = await this.payouts.requestPayout(user.id, dto);
    return PayoutResponseDto.fromEntity(payout);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.AGENCY_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Get('my')
  @ApiOperation({ summary: 'List the current agent\'s payout requests.' })
  async my(@CurrentUser() user: RequestUser): Promise<PayoutResponseDto[]> {
    return this.payouts.listForAgent(user.id);
  }

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin')
  @ApiOperation({ summary: 'All payout requests (admin).' })
  async listAll(
    @Query('status') status?: PayoutStatus,
  ): Promise<PayoutResponseDto[]> {
    return this.payouts.listAll(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin/summary')
  @ApiOperation({ summary: 'Aggregate payout totals + per-status counts (admin).' })
  async summary(): Promise<PayoutSummaryDto> {
    return this.payouts.summary();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Manually reject a pending/processing payout (admin). Refunds the wallet.' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectPayoutDto,
  ): Promise<PayoutResponseDto> {
    const payout = await this.payouts.adminReject(id, dto);
    return PayoutResponseDto.fromEntity(payout);
  }

  // ---------------------------------------------------------------------------
  // Moyasar webhook
  // ---------------------------------------------------------------------------

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Moyasar disbursement webhook. Called by Moyasar to push status updates (paid/failed). Verified via X-Moyasar-Signature.',
  })
  async webhook(
    @Body() payload: Record<string, unknown>,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    const signature =
      (req.headers['x-moyasar-signature'] as string | undefined) ??
      (req.headers['X-Moyasar-Signature'] as string | undefined);
    // The Moyasar SDK ships the raw JSON body which we re-stringify for HMAC
    // comparison. With the current global parser the request body is already
    // an object — verify against the canonical JSON shape.
    const raw = (req as Request & { rawBody?: Buffer }).rawBody ?? JSON.stringify(payload);
    if (this.moyasar.isLive && !this.moyasar.verifyWebhookSignature(raw, signature)) {
      throw new ForbiddenException('Invalid Moyasar webhook signature');
    }
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Empty webhook payload');
    }
    await this.payouts.handleMoyasarWebhook(payload);
    return { ok: true };
  }
}
