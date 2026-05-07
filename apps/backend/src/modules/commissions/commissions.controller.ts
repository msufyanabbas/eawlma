import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserRole } from '@eawlma/shared-types';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { CommissionsService } from './commissions.service';
import {
  AcceptOathDto,
  CommissionResponseDto,
  CommissionSummaryDto,
  CreateCommissionDto,
  OathResponseDto,
  UpdateCommissionStatusDto,
} from './dto/commission.dto';

@ApiTags('commissions')
@Controller({ path: 'commissions', version: '1' })
export class CommissionsController {
  constructor(private readonly commissions: CommissionsService) {}

  /** Any authenticated user records their commitment oath (agents before
   *  publishing, buyers before inquiring). */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post('oath')
  @ApiOperation({ summary: 'Record commission commitment oath acceptance.' })
  async acceptOath(
    @CurrentUser() user: RequestUser,
    @Body() dto: AcceptOathDto,
    @Req() req: Request,
  ): Promise<OathResponseDto> {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      (req.socket as { remoteAddress?: string } | undefined)?.remoteAddress ??
      null;
    return this.commissions.acceptOath(user.id, dto, ip);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('oath/:oathType')
  @ApiOperation({ summary: 'Check whether the current user already accepted this oath type.' })
  async hasOath(
    @CurrentUser() user: RequestUser,
    @Param('oathType') oathType: 'agent_listing' | 'buyer_purchase',
  ): Promise<{ accepted: boolean }> {
    return { accepted: await this.commissions.hasAcceptedOath(user.id, oathType) };
  }

  /** Agent commission history for the signed-in agent. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.AGENCY_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Get('my')
  @ApiOperation({ summary: "Current agent's commission history." })
  async my(@CurrentUser() user: RequestUser): Promise<CommissionResponseDto[]> {
    return this.commissions.listForAgent(user.id);
  }

  /** Buyer-side commissions — driven by closed deals where the signed-in
   *  user is the buyer. Open to any authenticated role. */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('buyer/me')
  @ApiOperation({ summary: 'Commissions the current authenticated user owes (as buyer).' })
  async myAsBuyer(@CurrentUser() user: RequestUser): Promise<CommissionResponseDto[]> {
    return this.commissions.listForBuyer(user.id);
  }

  /** Admin endpoints. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin')
  @ApiOperation({ summary: 'All commissions (admin).' })
  async listAll(): Promise<CommissionResponseDto[]> {
    return this.commissions.listAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin/summary')
  @ApiOperation({ summary: 'Aggregate platform revenue + monthly breakdown (admin).' })
  async summary(): Promise<CommissionSummaryDto> {
    return this.commissions.summary();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Post('admin')
  @ApiOperation({ summary: 'Record a new commission row (admin).' })
  async create(@Body() dto: CreateCommissionDto): Promise<CommissionResponseDto> {
    return this.commissions.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update commission status (admin).' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommissionStatusDto,
  ): Promise<CommissionResponseDto> {
    return this.commissions.updateStatus(id, dto);
  }
}
