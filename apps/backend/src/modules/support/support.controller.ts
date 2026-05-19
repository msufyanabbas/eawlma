import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@eawlma/shared-types';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import {
  CreateTicketDto,
  SendMessageDto,
  SupportMessageResponseDto,
  SupportTicketResponseDto,
  UpdateStatusDto,
} from './dto/support.dto';
import {
  SupportTicketCategory,
  SupportTicketStatus,
} from './entities/support-ticket.entity';
import { SupportService } from './support.service';

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.MODERATOR];

@ApiTags('support')
@ApiBearerAuth('access-token')
@Controller({ path: 'support', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  constructor(private readonly service: SupportService) {}

  // ---------- User endpoints ---------------------------------------------

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a support ticket.' })
  async create(
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateTicketDto,
  ): Promise<SupportTicketResponseDto> {
    const t = await this.service.createTicket(actor.id, dto);
    return this.service.toTicketDto(t);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List the current user\'s support tickets.' })
  async mine(@CurrentUser() actor: RequestUser): Promise<SupportTicketResponseDto[]> {
    const tickets = await this.service.listForUser(actor.id);
    return tickets.map((t) => this.service.toTicketDto(t));
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get a single ticket (owner or admin).' })
  async getOne(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SupportTicketResponseDto> {
    const isAdmin = ADMIN_ROLES.includes(actor.role);
    const t = await this.service.getTicket(id, actor.id, isAdmin);
    return this.service.toTicketDto(t);
  }

  @Get('tickets/:id/messages')
  @ApiOperation({ summary: 'List all messages on a ticket.' })
  async messages(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SupportMessageResponseDto[]> {
    const isAdmin = ADMIN_ROLES.includes(actor.role);
    const list = await this.service.listMessages(id, actor.id, isAdmin);
    return list.map((m) => this.service.toMessageDto(m));
  }

  @Post('tickets/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reply to a ticket. Admins are auto-flagged as staff.' })
  async reply(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ): Promise<SupportMessageResponseDto> {
    const isAdmin = ADMIN_ROLES.includes(actor.role);
    const m = await this.service.addMessage(id, actor.id, dto.message, isAdmin, isAdmin);
    return this.service.toMessageDto(m);
  }

  // ---------- Admin endpoints --------------------------------------------

  @Get('admin/tickets')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'List all support tickets (admin/moderator).' })
  async listAll(
    @Query('status') status?: SupportTicketStatus,
    @Query('category') category?: SupportTicketCategory,
  ): Promise<SupportTicketResponseDto[]> {
    const tickets = await this.service.listAll({ status, category });
    return tickets.map((t) => this.service.toTicketDto(t));
  }

  @Patch('admin/tickets/:id/status')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update a ticket status (admin/moderator).' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
  ): Promise<SupportTicketResponseDto> {
    const t = await this.service.updateStatus(id, dto.status, dto.resolution);
    return this.service.toTicketDto(t);
  }
}
