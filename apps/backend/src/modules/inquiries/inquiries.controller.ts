import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { InquiryStatus } from '@eawlma/shared-types';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { InquiryResponseDto } from './dto/inquiry-response.dto';
import { CloseDealDto } from './dto/close-deal.dto';
import { RaiseDisputeDto } from './dto/raise-dispute.dto';
import { AdminResolveDisputeDto } from './dto/admin-resolve-dispute.dto';

@ApiTags('inquiries')
@Controller({ path: 'inquiries', version: '1' })
@UseGuards(JwtAuthGuard)
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create an inquiry on an active listing. Public — anonymous senders must include guestName/guestEmail/guestPhone.',
  })
  @ApiCreatedResponse({ type: InquiryResponseDto })
  async create(
    @Body() dto: CreateInquiryDto,
    @CurrentUser() sender: RequestUser | undefined,
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<InquiryResponseDto> {
    const inquiry = await this.inquiriesService.create(dto, sender, {
      ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return InquiryResponseDto.fromEntity(inquiry);
  }

  @ApiBearerAuth('access-token')
  @Get('mine')
  @ApiOperation({ summary: 'List inquiries on listings owned by the current agent' })
  async mineAsAgent(
    @CurrentUser() actor: RequestUser,
    @Query() pagination: PaginationQueryDto,
    @Query('status') status?: InquiryStatus,
  ) {
    const result = await this.inquiriesService.listForAgent(
      actor,
      pagination.page ?? 1,
      pagination.limit ?? 20,
      status,
    );
    return {
      data: result.data.map(InquiryResponseDto.fromEntity),
      meta: result.meta,
    };
  }

  @ApiBearerAuth('access-token')
  @Get('sent')
  @ApiOperation({ summary: 'List inquiries sent by the current authenticated user' })
  async mySent(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    const result = await this.inquiriesService.listForUser(
      userId,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
    return {
      data: result.data.map(InquiryResponseDto.fromEntity),
      meta: result.meta,
    };
  }

  @ApiBearerAuth('access-token')
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific inquiry (agent on listing, sender, or admin)' })
  @ApiOkResponse({ type: InquiryResponseDto })
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<InquiryResponseDto> {
    const inquiry = await this.inquiriesService.findByIdForActor(id, actor);
    return InquiryResponseDto.fromEntity(inquiry);
  }

  @ApiBearerAuth('access-token')
  @Patch(':id')
  @ApiOperation({ summary: 'Update inquiry status / notes / next action (agent only)' })
  @ApiOkResponse({ type: InquiryResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: UpdateInquiryDto,
  ): Promise<InquiryResponseDto> {
    const updated = await this.inquiriesService.update(id, actor, dto);
    return InquiryResponseDto.fromEntity(updated);
  }

  @ApiBearerAuth('access-token')
  @Post(':id/close-deal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Agent records the transaction value and flags the deal as pending buyer confirmation. No commission is created until the buyer confirms.',
  })
  @ApiOkResponse({ type: InquiryResponseDto })
  async closeDeal(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: CloseDealDto,
  ): Promise<InquiryResponseDto> {
    const closed = await this.inquiriesService.closeDeal(id, actor, dto);
    return InquiryResponseDto.fromEntity(closed);
  }

  @ApiBearerAuth('access-token')
  @Post(':id/confirm-deal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Buyer confirms a deal the agent marked as closed. Creates the commission and notifies the agent and admins.',
  })
  @ApiOkResponse({ type: InquiryResponseDto })
  async confirmDeal(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<InquiryResponseDto> {
    const confirmed = await this.inquiriesService.confirmDeal(id, actor);
    return InquiryResponseDto.fromEntity(confirmed);
  }

  @ApiBearerAuth('access-token')
  @Post(':id/raise-dispute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Buyer OR agent disputes a pending deal. Admin will review via /admin/disputes.',
  })
  @ApiOkResponse({ type: InquiryResponseDto })
  async raiseDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: RaiseDisputeDto,
  ): Promise<InquiryResponseDto> {
    const disputed = await this.inquiriesService.raiseDispute(id, actor, dto.reason);
    return InquiryResponseDto.fromEntity(disputed);
  }

  @ApiBearerAuth('access-token')
  @Get('admin/disputes')
  @ApiOperation({ summary: 'Admin: list all disputed inquiries.' })
  async listDisputes(@CurrentUser() actor: RequestUser) {
    const data = await this.inquiriesService.listDisputes(actor);
    return { data: data.map(InquiryResponseDto.fromEntity) };
  }

  @ApiBearerAuth('access-token')
  @Get('admin/disputes/count')
  @ApiOperation({ summary: 'Admin: open-dispute count, used for sidebar badge.' })
  async countDisputes(@CurrentUser() actor: RequestUser) {
    const count = await this.inquiriesService.countOpenDisputes(actor);
    return { count };
  }

  @ApiBearerAuth('access-token')
  @Post(':id/admin-resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin resolves a disputed deal in favor of agent / buyer / cancelled.' })
  @ApiOkResponse({ type: InquiryResponseDto })
  async adminResolveDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: AdminResolveDisputeDto,
  ): Promise<InquiryResponseDto> {
    const resolved = await this.inquiriesService.adminResolveDispute(
      id,
      actor,
      dto.resolution,
      dto.favor,
    );
    return InquiryResponseDto.fromEntity(resolved);
  }
}
