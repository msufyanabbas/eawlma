import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  CreateTicketDto,
  SupportMessageResponseDto,
  SupportTicketResponseDto,
} from './dto/support.dto';
import { SupportMessageEntity } from './entities/support-message.entity';
import {
  SupportTicketCategory,
  SupportTicketEntity,
  SupportTicketStatus,
} from './entities/support-ticket.entity';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectRepository(SupportTicketEntity)
    private readonly tickets: Repository<SupportTicketEntity>,
    @InjectRepository(SupportMessageEntity)
    private readonly messages: Repository<SupportMessageEntity>,
  ) {}

  // ---------------------------------------------------------------------------
  // Ticket lifecycle
  // ---------------------------------------------------------------------------

  async createTicket(userId: string, dto: CreateTicketDto): Promise<SupportTicketEntity> {
    // Pull the next ticket number from the sequence we created in the
    // migration. nextval is atomic so two concurrent creates can't collide.
    const seqRow = await this.tickets.query(`SELECT nextval('ticket_number_seq') AS num`);
    const ticketNumber = `TKT-${seqRow[0].num}`;

    const entity = this.tickets.create({
      userId,
      subject: dto.subject.trim(),
      description: dto.description.trim(),
      category: dto.category ?? 'general',
      priority: dto.priority ?? 'medium',
      status: 'open',
      ticketNumber,
    });
    const saved = await this.tickets.save(entity);
    this.logger.log(`Support ticket ${saved.ticketNumber} created by user ${userId}`);
    return saved;
  }

  async listForUser(userId: string): Promise<SupportTicketEntity[]> {
    return this.tickets.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Look up a single ticket, enforcing access: the requesting user can read
   * their own tickets, admins can read anything. Throwing 404 vs 403 leaks
   * existence; we use 404 for cross-user reads on purpose.
   */
  async getTicket(
    ticketId: string,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<SupportTicketEntity> {
    const ticket = await this.tickets.findOne({
      where: { id: ticketId },
      relations: isAdmin ? ['user'] : [],
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!isAdmin && ticket.userId !== requesterId) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  async listAll(filters: {
    status?: SupportTicketStatus;
    category?: SupportTicketCategory;
  }): Promise<SupportTicketEntity[]> {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    return this.tickets.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(
    ticketId: string,
    status: SupportTicketStatus,
    resolution?: string,
  ): Promise<SupportTicketEntity> {
    const ticket = await this.tickets.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    ticket.status = status;
    if (status === 'resolved') {
      ticket.resolvedAt = new Date();
      if (resolution !== undefined) ticket.resolution = resolution;
    } else if (status === 'closed' && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }
    return this.tickets.save(ticket);
  }

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------

  async listMessages(
    ticketId: string,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<SupportMessageEntity[]> {
    // Re-use the access check from getTicket — staff replies and user
    // replies share the same authz, so doing it once at the message-list
    // level avoids duplicating the rule.
    await this.getTicket(ticketId, requesterId, isAdmin);
    return this.messages.find({
      where: { ticketId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }

  async addMessage(
    ticketId: string,
    senderId: string,
    message: string,
    isStaff: boolean,
    isAdmin: boolean,
  ): Promise<SupportMessageEntity> {
    const ticket = await this.getTicket(ticketId, senderId, isAdmin);
    if (ticket.status === 'closed') {
      // Closed tickets are read-only — reopen via updateStatus first.
      throw new ForbiddenException('Cannot reply to a closed ticket');
    }
    const entity = this.messages.create({
      ticketId,
      senderId,
      message: message.trim(),
      isStaff,
    });
    const saved = await this.messages.save(entity);

    // Auto-transition open → in_progress on the first staff reply so the
    // queue view surfaces "actively being worked" tickets distinctly.
    if (isStaff && ticket.status === 'open') {
      ticket.status = 'in_progress';
      await this.tickets.save(ticket);
    }

    return saved;
  }

  // ---------------------------------------------------------------------------
  // Mappers
  // ---------------------------------------------------------------------------

  toTicketDto(entity: SupportTicketEntity): SupportTicketResponseDto {
    return SupportTicketResponseDto.fromEntity(entity);
  }

  toMessageDto(entity: SupportMessageEntity): SupportMessageResponseDto {
    return SupportMessageResponseDto.fromEntity(entity);
  }
}
