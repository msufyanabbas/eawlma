import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  InquiryStatus,
  ListingStatus,
  NotificationType,
  UserRole,
} from '@eawlma/shared-types';

import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { EmailService } from '../../common/email/email.service';
import { KafkaService } from '../../common/kafka/kafka.service';

import { InquiryEntity } from './entities/inquiry.entity';
import { ListingEntity } from '../listings/entities/listing.entity';
import { UserEntity } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { CloseDealDto } from './dto/close-deal.dto';
import { CommissionsService } from '../commissions/commissions.service';

interface ClientContext {
  ip?: string | null;
  userAgent?: string | null;
}

const VALID_TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
  [InquiryStatus.NEW]: [
    InquiryStatus.CONTACTED,
    InquiryStatus.QUALIFIED,
    InquiryStatus.UNQUALIFIED,
    InquiryStatus.CLOSED,
  ],
  [InquiryStatus.CONTACTED]: [
    InquiryStatus.QUALIFIED,
    InquiryStatus.UNQUALIFIED,
    InquiryStatus.CLOSED,
  ],
  [InquiryStatus.QUALIFIED]: [InquiryStatus.UNQUALIFIED, InquiryStatus.CLOSED],
  [InquiryStatus.UNQUALIFIED]: [InquiryStatus.CLOSED, InquiryStatus.QUALIFIED],
  [InquiryStatus.CLOSED]: [], // terminal
};

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);
  private readonly inquiryEventsTopic: string;

  constructor(
    @InjectRepository(InquiryEntity)
    private readonly inquiries: Repository<InquiryEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly kafkaService: KafkaService,
    private readonly config: ConfigService,
    private readonly commissionsService: CommissionsService,
  ) {
    this.inquiryEventsTopic =
      this.config.get<string>('kafka.topics.listingEvents') ?? 'eawlma.listing.events';
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  async create(
    dto: CreateInquiryDto,
    sender: RequestUser | undefined,
    ctx: ClientContext,
  ): Promise<InquiryEntity> {
    const listing = await this.listings.findOne({
      where: { id: dto.listingId },
      select: ['id', 'ownerId', 'status', 'title', 'referenceCode'],
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Inquiries can only be sent on active listings');
    }
    if (sender && sender.id === listing.ownerId) {
      throw new BadRequestException('You cannot inquire on your own listing');
    }

    if (!sender) {
      if (!dto.guestName || !dto.guestEmail || !dto.guestPhone) {
        throw new BadRequestException(
          'guestName, guestEmail and guestPhone are required for unauthenticated inquiries',
        );
      }
    }

    const buyer = sender ? await this.users.findOne({ where: { id: sender.id } }) : null;

    const inquiry = this.inquiries.create({
      listingId: listing.id,
      agentId: listing.ownerId,
      userId: sender?.id ?? null,
      guestName: dto.guestName ?? buyer?.fullName ?? null,
      guestEmail: dto.guestEmail ?? buyer?.email ?? null,
      guestPhone: dto.guestPhone ?? buyer?.phone ?? null,
      preferredContactMethod: dto.preferredContactMethod ?? null,
      message: dto.message.trim(),
      status: InquiryStatus.NEW,
      sourceIp: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });

    const saved = await this.inquiries.save(inquiry);

    // Bump the listing inquiry counter (best-effort)
    void this.listings
      .increment({ id: listing.id }, 'inquiryCount', 1)
      .catch((err: Error) =>
        this.logger.warn(`failed to increment inquiryCount: ${err.message}`),
      );

    // Side-effects — fire-and-forget so failures don't block lead capture
    void this.runSideEffects(saved, listing, buyer).catch((err: Error) =>
      this.logger.error(`Inquiry side-effects failed for ${saved.id}: ${err.message}`),
    );

    return saved;
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  async findByIdForActor(id: string, actor: RequestUser): Promise<InquiryEntity> {
    const inquiry = await this.inquiries.findOne({ where: { id } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    this.assertCanView(inquiry, actor);
    return inquiry;
  }

  async listForAgent(
    actor: RequestUser,
    page: number,
    limit: number,
    statusFilter?: InquiryStatus,
  ): Promise<PaginatedResultDto<InquiryEntity>> {
    const isPrivileged =
      actor.role === UserRole.ADMIN || actor.role === UserRole.MODERATOR;

    const qb = this.inquiries
      .createQueryBuilder('i')
      .leftJoin('i.listing', 'listing')
      .addSelect(['listing.id', 'listing.title', 'listing.referenceCode']);

    if (!isPrivileged) {
      qb.where('i.agent_id = :agentId', { agentId: actor.id });
    }
    if (statusFilter) {
      qb.andWhere('i.status = :status', { status: statusFilter });
    }
    qb.orderBy('i.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResultDto(data, total, page, limit);
  }

  async listForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResultDto<InquiryEntity>> {
    const [data, total] = await this.inquiries.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return new PaginatedResultDto(data, total, page, limit);
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  async update(id: string, actor: RequestUser, dto: UpdateInquiryDto): Promise<InquiryEntity> {
    const inquiry = await this.findByIdForActor(id, actor);
    this.assertCanModify(inquiry, actor);

    if (dto.status && dto.status !== inquiry.status) {
      const allowed = VALID_TRANSITIONS[inquiry.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot transition inquiry from ${inquiry.status} to ${dto.status}`,
        );
      }
      inquiry.status = dto.status;
      if (dto.status === InquiryStatus.CONTACTED && !inquiry.respondedAt) {
        inquiry.respondedAt = new Date();
      }
    }

    if (dto.agentNotes !== undefined) inquiry.agentNotes = dto.agentNotes || null;
    if (dto.nextAction !== undefined) inquiry.nextAction = dto.nextAction || null;
    if (dto.nextActionAt !== undefined) inquiry.nextActionAt = dto.nextActionAt;

    return this.inquiries.save(inquiry);
  }

  // ---------------------------------------------------------------------------
  // Close deal — agent records the transaction value, but a commission is NOT
  // created yet. The deal sits in `pending_confirmation` until the buyer
  // confirms (commission created) or either party raises a dispute (admin
  // resolves). The agent's CRM inquiry transitions to CLOSED for filtering
  // purposes; the new `dealStatus` field carries the real lifecycle state.
  // ---------------------------------------------------------------------------

  async closeDeal(
    id: string,
    actor: RequestUser,
    dto: CloseDealDto,
  ): Promise<InquiryEntity> {
    const inquiry = await this.findByIdForActor(id, actor);
    // Only the listing's agent (or admin/moderator) can close. `assertCanModify`
    // rejects anyone else with 403.
    this.assertCanModify(inquiry, actor);

    if (inquiry.dealClosedByAgent) {
      throw new BadRequestException('Deal close already submitted for this inquiry');
    }
    if (dto.transactionValue <= 0) {
      throw new BadRequestException('transactionValue must be positive');
    }

    inquiry.status = InquiryStatus.CLOSED;
    inquiry.transactionValue = dto.transactionValue.toFixed(2);
    inquiry.closedAt = dto.closedAt ?? new Date();
    inquiry.dealClosedByAgent = true;
    inquiry.dealStatus = 'pending_confirmation';
    if (dto.notes) {
      inquiry.agentNotes = [inquiry.agentNotes, dto.notes].filter(Boolean).join('\n\n');
    }

    const saved = await this.inquiries.save(inquiry);

    const listing = await this.listings.findOne({
      where: { id: saved.listingId },
      select: ['id', 'title', 'referenceCode'],
    });
    const listingLabel = listing?.title ?? saved.listingId;
    const valueLabel = `${dto.transactionValue.toLocaleString('en-US')} SAR`;

    // Notify the buyer to confirm or dispute. If we don't have a buyer userId
    // (anonymous inquiry) there's no one to notify — agent will follow up via
    // email/phone and the deal will be confirmed manually by an admin.
    if (saved.userId) {
      try {
        await this.notificationsService.create({
          userId: saved.userId,
          type: NotificationType.INQUIRY_RECEIVED,
          title: 'Agent marked your deal as closed',
          body: `Agent has marked your deal on ${listingLabel} as closed for ${valueLabel}. Please confirm or dispute within 48 hours.`,
          data: {
            inquiryId: saved.id,
            listingId: saved.listingId,
            transactionValue: dto.transactionValue,
            dealStatus: saved.dealStatus,
          },
        });
      } catch (err) {
        this.logger.error(`Buyer close-deal notification failed: ${(err as Error).message}`);
      }
    }

    return saved;
  }

  // ---------------------------------------------------------------------------
  // Confirm deal — buyer accepts the close, triggering commission creation
  // and notifying the agent + admins.
  // ---------------------------------------------------------------------------

  async confirmDeal(id: string, actor: RequestUser): Promise<InquiryEntity> {
    const inquiry = await this.inquiries.findOne({ where: { id } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');

    if (!inquiry.userId || inquiry.userId !== actor.id) {
      throw new ForbiddenException('Only the buyer on this inquiry can confirm the deal');
    }
    if (!inquiry.dealClosedByAgent) {
      throw new BadRequestException('Agent has not closed this deal yet');
    }
    if (inquiry.dealStatus !== 'pending_confirmation') {
      throw new BadRequestException(`Cannot confirm a deal in status ${inquiry.dealStatus}`);
    }
    if (inquiry.transactionValue === null) {
      throw new BadRequestException('Deal has no transaction value to confirm');
    }

    inquiry.dealConfirmedByBuyer = true;
    inquiry.dealStatus = 'confirmed';
    const saved = await this.inquiries.save(inquiry);

    const transactionValue = Number(saved.transactionValue);
    const commission = await this.commissionsService.create({
      listingId: saved.listingId,
      agentId: saved.agentId,
      buyerId: saved.userId ?? undefined,
      transactionValue,
      notes: 'Created after buyer confirmation',
    });

    const listing = await this.listings.findOne({
      where: { id: saved.listingId },
      select: ['id', 'title', 'referenceCode'],
    });
    const listingLabel = listing?.title ?? saved.listingId;
    const valueLabel = `${transactionValue.toLocaleString('en-US')} SAR`;

    // Notify the agent
    try {
      await this.notificationsService.create({
        userId: saved.agentId,
        type: NotificationType.INQUIRY_RECEIVED,
        title: 'Buyer confirmed the deal!',
        body: `Buyer confirmed your deal on ${listingLabel}. Commission has been created.`,
        data: {
          inquiryId: saved.id,
          listingId: saved.listingId,
          commissionId: commission.id,
          transactionValue,
        },
      });
    } catch (err) {
      this.logger.error(`Agent confirm-deal notification failed: ${(err as Error).message}`);
    }

    // Notify admins
    try {
      const admins = await this.users.find({
        where: { role: UserRole.ADMIN },
        select: ['id'],
      });
      await Promise.all(
        admins.map((admin) =>
          this.notificationsService.create({
            userId: admin.id,
            type: NotificationType.INQUIRY_RECEIVED,
            title: 'New confirmed deal',
            body: `${listingLabel} — ${valueLabel}. Commission ${commission.id} awaiting confirmation.`,
            data: {
              inquiryId: saved.id,
              listingId: saved.listingId,
              commissionId: commission.id,
              transactionValue,
            },
          }),
        ),
      );
    } catch (err) {
      this.logger.error(`Admin confirm-deal notifications failed: ${(err as Error).message}`);
    }

    return saved;
  }

  // ---------------------------------------------------------------------------
  // Raise dispute — either party (buyer OR agent) can dispute a pending deal.
  // Admin then resolves via `adminResolveDispute`.
  // ---------------------------------------------------------------------------

  async raiseDispute(
    id: string,
    actor: RequestUser,
    reason: string,
  ): Promise<InquiryEntity> {
    const inquiry = await this.inquiries.findOne({ where: { id } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');

    const isBuyer = inquiry.userId !== null && inquiry.userId === actor.id;
    const isAgent = inquiry.agentId === actor.id;
    if (!isBuyer && !isAgent && !this.isPrivileged(actor)) {
      throw new ForbiddenException('Only the buyer or agent on this deal can raise a dispute');
    }
    if (!inquiry.dealClosedByAgent) {
      throw new BadRequestException('Agent has not closed this deal yet — nothing to dispute');
    }
    if (inquiry.dealStatus !== 'pending_confirmation') {
      throw new BadRequestException(`Cannot dispute a deal in status ${inquiry.dealStatus}`);
    }
    const trimmed = reason.trim();
    if (!trimmed) {
      throw new BadRequestException('Dispute reason is required');
    }

    inquiry.dealStatus = 'disputed';
    inquiry.disputeReason = trimmed;
    inquiry.disputeRaisedBy = actor.id;
    inquiry.disputeRaisedAt = new Date();
    const saved = await this.inquiries.save(inquiry);

    const listing = await this.listings.findOne({
      where: { id: saved.listingId },
      select: ['id', 'title', 'referenceCode'],
    });
    const listingLabel = listing?.title ?? saved.listingId;

    // Notify admins
    try {
      const admins = await this.users.find({
        where: { role: UserRole.ADMIN },
        select: ['id'],
      });
      await Promise.all(
        admins.map((admin) =>
          this.notificationsService.create({
            userId: admin.id,
            type: NotificationType.INQUIRY_RECEIVED,
            title: 'Deal dispute raised',
            body: `Deal dispute raised on ${listingLabel}. Reason: ${trimmed}. Please review.`,
            data: {
              inquiryId: saved.id,
              listingId: saved.listingId,
              disputeReason: trimmed,
              disputeRaisedBy: actor.id,
            },
          }),
        ),
      );
    } catch (err) {
      this.logger.error(`Admin raise-dispute notifications failed: ${(err as Error).message}`);
    }

    // Notify the *other* party so they know admin will step in.
    const otherPartyId = isBuyer ? saved.agentId : saved.userId;
    if (otherPartyId) {
      try {
        await this.notificationsService.create({
          userId: otherPartyId,
          type: NotificationType.INQUIRY_RECEIVED,
          title: 'A dispute has been raised on your deal',
          body: `A dispute has been raised on your deal for ${listingLabel}. Admin will review shortly.`,
          data: {
            inquiryId: saved.id,
            listingId: saved.listingId,
            disputeRaisedBy: actor.id,
          },
        });
      } catch (err) {
        this.logger.error(`Other-party raise-dispute notification failed: ${(err as Error).message}`);
      }
    }

    return saved;
  }

  // ---------------------------------------------------------------------------
  // Admin resolves a dispute. Depending on favor:
  //   `agent`     → creates the commission as if the buyer had confirmed
  //   `buyer`     → cancels the deal (no commission created)
  //   `cancelled` → marks the deal as cancelled without favoring either side
  // ---------------------------------------------------------------------------

  async adminResolveDispute(
    id: string,
    actor: RequestUser,
    resolution: string,
    favor: 'agent' | 'buyer' | 'cancelled',
  ): Promise<InquiryEntity> {
    if (!this.isPrivileged(actor)) {
      throw new ForbiddenException('Only admins can resolve disputes');
    }
    const inquiry = await this.inquiries.findOne({ where: { id } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    if (inquiry.dealStatus !== 'disputed') {
      throw new BadRequestException(`Cannot resolve a deal in status ${inquiry.dealStatus}`);
    }
    const trimmed = resolution.trim();
    if (!trimmed) {
      throw new BadRequestException('Resolution notes are required');
    }

    inquiry.dealStatus = 'resolved';
    inquiry.adminResolution = trimmed;
    inquiry.adminResolvedBy = actor.id;
    inquiry.adminResolvedAt = new Date();
    const saved = await this.inquiries.save(inquiry);

    const listing = await this.listings.findOne({
      where: { id: saved.listingId },
      select: ['id', 'title', 'referenceCode'],
    });
    const listingLabel = listing?.title ?? saved.listingId;

    let outcomeBody: string;
    if (favor === 'agent') {
      const transactionValue = Number(saved.transactionValue ?? 0);
      if (transactionValue > 0) {
        try {
          const commission = await this.commissionsService.create({
            listingId: saved.listingId,
            agentId: saved.agentId,
            buyerId: saved.userId ?? undefined,
            transactionValue,
            notes: `Created after admin resolved dispute in favor of agent. ${trimmed}`,
          });
          outcomeBody = `Admin resolved the dispute in favor of the agent. Commission ${commission.id} has been created.`;
        } catch (err) {
          this.logger.error(`Commission creation on dispute resolution failed: ${(err as Error).message}`);
          outcomeBody = 'Admin resolved the dispute in favor of the agent.';
        }
      } else {
        outcomeBody = 'Admin resolved the dispute in favor of the agent.';
      }
    } else if (favor === 'buyer') {
      outcomeBody = 'Admin resolved the dispute in favor of the buyer. The deal has been cancelled and no commission was created.';
    } else {
      outcomeBody = 'Admin cancelled the deal. No commission was created.';
    }

    // Notify both parties
    const recipients = [saved.agentId, saved.userId].filter((u): u is string => Boolean(u));
    for (const userId of recipients) {
      try {
        await this.notificationsService.create({
          userId,
          type: NotificationType.INQUIRY_RECEIVED,
          title: 'Dispute resolved',
          body: `${outcomeBody} Listing: ${listingLabel}. Notes: ${trimmed}`,
          data: {
            inquiryId: saved.id,
            listingId: saved.listingId,
            favor,
            adminResolution: trimmed,
          },
        });
      } catch (err) {
        this.logger.error(`Resolve-dispute notification failed: ${(err as Error).message}`);
      }
    }

    return saved;
  }

  // ---------------------------------------------------------------------------
  // Admin: list all disputed inquiries
  // ---------------------------------------------------------------------------

  async listDisputes(actor: RequestUser): Promise<InquiryEntity[]> {
    if (!this.isPrivileged(actor)) {
      throw new ForbiddenException('Only admins can view the dispute queue');
    }
    return this.inquiries.find({
      where: { dealStatus: 'disputed' },
      order: { disputeRaisedAt: 'DESC' },
    });
  }

  async countOpenDisputes(actor: RequestUser): Promise<number> {
    if (!this.isPrivileged(actor)) {
      throw new ForbiddenException('Only admins can view dispute counts');
    }
    return this.inquiries.count({ where: { dealStatus: 'disputed' } });
  }

  // ---------------------------------------------------------------------------
  // Side-effects
  // ---------------------------------------------------------------------------

  private async runSideEffects(
    inquiry: InquiryEntity,
    listing: Pick<ListingEntity, 'id' | 'ownerId' | 'title' | 'referenceCode'>,
    buyer: UserEntity | null,
  ): Promise<void> {
    const agent = await this.users.findOne({ where: { id: inquiry.agentId } });

    // 1. In-app notification for the agent
    if (agent) {
      void this.notificationsService
        .create({
          userId: agent.id,
          type: NotificationType.INQUIRY_RECEIVED,
          title: 'New inquiry on your listing',
          body: `${inquiry.guestName ?? 'A buyer'} sent you a message about ${listing.title}`,
          data: {
            inquiryId: inquiry.id,
            listingId: listing.id,
            referenceCode: listing.referenceCode,
            buyerName: inquiry.guestName,
            buyerEmail: inquiry.guestEmail,
            buyerPhone: inquiry.guestPhone,
          },
        })
        .catch((err: Error) =>
          this.logger.error(`Failed to create notification: ${err.message}`),
        );
    }

    // 2. SES — email to the agent
    if (agent?.email) {
      const buyerLabel = inquiry.guestName ?? buyer?.fullName ?? 'Anonymous lead';
      const messagePreview = inquiry.message.slice(0, 500);
      void this.emailService.send({
        to: agent.email,
        subject: `New inquiry on ${listing.referenceCode}`,
        locale: (agent.preferredLocale === 'ar' ? 'ar' : 'en'),
        html: `
          <h2>You've received a new inquiry</h2>
          <p><strong>Listing:</strong> ${escapeHtml(listing.title)} (${listing.referenceCode})</p>
          <p><strong>Lead:</strong> ${escapeHtml(buyerLabel)}</p>
          <p><strong>Email:</strong> ${escapeHtml(inquiry.guestEmail ?? '—')}</p>
          <p><strong>Phone:</strong> ${escapeHtml(inquiry.guestPhone ?? '—')}</p>
          <p><strong>Preferred contact:</strong> ${inquiry.preferredContactMethod ?? '—'}</p>
          <hr/>
          <p>${escapeHtml(messagePreview)}</p>
          <p><a href="${this.config.get<string>('app.appUrl', '')}/agent/inquiries/${inquiry.id}">View inquiry</a></p>
        `,
        text: `New inquiry on ${listing.referenceCode}\nLead: ${buyerLabel}\nEmail: ${inquiry.guestEmail}\nPhone: ${inquiry.guestPhone}\nMessage:\n${messagePreview}`,
      });
    }

    // 3. SES — confirmation to the buyer
    if (inquiry.guestEmail) {
      const greetingName = inquiry.guestName ?? 'there';
      void this.emailService.send({
        to: inquiry.guestEmail,
        subject: 'We received your inquiry',
        locale: 'en',
        html: `
          <h2>Thank you for your inquiry, ${escapeHtml(greetingName)}!</h2>
          <p>We've passed your message to the listing's agent and they will be in touch soon.</p>
          <p><strong>Listing reference:</strong> ${listing.referenceCode}</p>
          <hr/>
          <p><em>Your message:</em></p>
          <blockquote>${escapeHtml(inquiry.message)}</blockquote>
        `,
        text: `Thank you for your inquiry. The agent will be in touch soon.\nListing reference: ${listing.referenceCode}\n\nYour message:\n${inquiry.message}`,
      });
    }

    // 4. Kafka event
    await this.kafkaService.publish({
      topic: this.inquiryEventsTopic,
      key: inquiry.listingId,
      value: {
        eventType: 'inquiry.created',
        eventId: inquiry.id,
        occurredAt: inquiry.createdAt.toISOString(),
        listingId: inquiry.listingId,
        referenceCode: listing.referenceCode,
        agentId: inquiry.agentId,
        userId: inquiry.userId,
        guestEmail: inquiry.guestEmail,
        preferredContactMethod: inquiry.preferredContactMethod,
      },
      headers: { 'x-event-type': 'inquiry.created' },
    });
  }

  // ---------------------------------------------------------------------------
  // Authorization helpers
  // ---------------------------------------------------------------------------

  private assertCanView(inquiry: InquiryEntity, actor: RequestUser): void {
    if (this.isPrivileged(actor)) return;
    if (inquiry.agentId === actor.id) return;
    if (inquiry.userId && inquiry.userId === actor.id) return;
    throw new ForbiddenException('You do not have access to this inquiry');
  }

  private assertCanModify(inquiry: InquiryEntity, actor: RequestUser): void {
    if (this.isPrivileged(actor)) return;
    if (inquiry.agentId === actor.id) return;
    throw new ForbiddenException('Only the assigned agent can update this inquiry');
  }

  private isPrivileged(actor: RequestUser): boolean {
    return (
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.MODERATOR ||
      actor.role === UserRole.AGENCY_ADMIN
    );
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
