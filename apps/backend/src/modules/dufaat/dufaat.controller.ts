import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

import { DufaatService } from './dufaat.service';
import {
  CreateDufaatPlanDto,
  DufaatInstallmentDto,
  DufaatPlanResponseDto,
} from './dto/dufaat.dto';

@ApiTags('dufaat')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'dufaat', version: '1' })
export class DufaatController {
  constructor(private readonly dufaat: DufaatService) {}

  @Post('plans')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tenant applies for a Dufaat installment plan.' })
  async createPlan(
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateDufaatPlanDto,
  ): Promise<DufaatPlanResponseDto> {
    const plan = await this.dufaat.createPlan(actor, dto);
    return DufaatPlanResponseDto.fromEntity(plan);
  }

  @Get('plans/my')
  @ApiOperation({ summary: "List current tenant's Dufaat plans." })
  async myPlans(@CurrentUser() actor: RequestUser): Promise<DufaatPlanResponseDto[]> {
    const list = await this.dufaat.listForTenant(actor.id);
    return list.map(DufaatPlanResponseDto.fromEntity);
  }

  @Get('plans/landlord')
  @ApiOperation({ summary: "List current landlord's Dufaat plans." })
  async landlordPlans(
    @CurrentUser() actor: RequestUser,
  ): Promise<DufaatPlanResponseDto[]> {
    const list = await this.dufaat.listForLandlord(actor.id);
    return list.map(DufaatPlanResponseDto.fromEntity);
  }

  @Post('installments/:id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tenant pays a Dufaat installment.' })
  async pay(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<DufaatInstallmentDto> {
    const inst = await this.dufaat.payInstallment(actor, id);
    return DufaatInstallmentDto.fromEntity(inst);
  }
}
