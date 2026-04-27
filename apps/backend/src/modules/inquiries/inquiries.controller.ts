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
import { InquiryStatus } from '@aqarat/shared-types';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { InquiryResponseDto } from './dto/inquiry-response.dto';

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
}
