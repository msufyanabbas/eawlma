import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ListingStatus,
  NotificationType,
} from '@eawlma/shared-types';

import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { EmailService } from '../../common/email/email.service';
import { ListingEntity } from '../listings/entities/listing.entity';
import { UserEntity } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ListingsService } from '../listings/listings.service';
import { AuditService } from '../audit/audit.service';

interface ModerationActor {
  id: string;
  email: string;
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly listingsService: ListingsService,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  // ---------- Listing moderation queue ---------------------------------

  async pendingListings(
    page: number,
    limit: number,
  ): Promise<PaginatedResultDto<ListingEntity>> {
    const [data, total] = await this.listings.findAndCount({
      where: { status: ListingStatus.PENDING_REVIEW },
      relations: ['media'],
      order: { createdAt: 'ASC' }, // FIFO — oldest pending first
      take: limit,
      skip: (page - 1) * limit,
    });
    return new PaginatedResultDto(data, total, page, limit);
  }

  async approveListing(
    listingId: string,
    actor: ModerationActor,
    internalNote?: string,
  ): Promise<ListingEntity> {
    const listing = await this.listings.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status !== ListingStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Cannot approve a listing in status "${listing.status}" — only PENDING_REVIEW listings can be approved`,
      );
    }
    listing.status = ListingStatus.ACTIVE;
    listing.publishedAt = new Date();
    listing.rejectionReason = null;
    if (!listing.expiresAt) {
      // Default 60-day expiry, refreshable on republish
      listing.expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    }
    await this.listings.save(listing);

    // Side-effects: in-app notification + email to agent
    await this.notifyAgent(listing, 'approved');

    // Emit listing.published so the AI translation consumer fans out
    void this.listingsService.publishLifecycleEvent('listing.published', listing);

    // Audit trail
    await this.auditService
      .write({
        action: 'moderation.approve',
        entityType: 'listing',
        entityId: listing.id,
        changedFields: {
          status: { before: 'pending_review', after: 'active' },
          ...(internalNote ? { internalNote: { before: null, after: internalNote } } : {}),
        },
      })
      .catch((err: Error) => this.logger.warn(`audit write failed: ${err.message}`));

    return listing;
  }

  async rejectListing(
    listingId: string,
    actor: ModerationActor,
    reason: string,
    internalNote?: string,
  ): Promise<ListingEntity> {
    const listing = await this.listings.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status !== ListingStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Cannot reject a listing in status "${listing.status}" — only PENDING_REVIEW listings can be rejected`,
      );
    }
    listing.status = ListingStatus.REJECTED;
    listing.rejectionReason = reason;
    await this.listings.save(listing);

    await this.notifyAgent(listing, 'rejected', reason);

    await this.auditService
      .write({
        action: 'moderation.reject',
        entityType: 'listing',
        entityId: listing.id,
        changedFields: {
          status: { before: 'pending_review', after: 'rejected' },
          rejectionReason: { before: null, after: reason },
          ...(internalNote ? { internalNote: { before: null, after: internalNote } } : {}),
        },
      })
      .catch((err: Error) => this.logger.warn(`audit write failed: ${err.message}`));

    return listing;
  }

  // ---------- Side-effects --------------------------------------------

  private async notifyAgent(
    listing: ListingEntity,
    decision: 'approved' | 'rejected',
    reason?: string,
  ): Promise<void> {
    const agent = await this.users.findOne({ where: { id: listing.ownerId } });
    if (!agent) return;
    const isApproved = decision === 'approved';
    const title = isApproved ? 'Your listing has been approved' : 'Your listing was rejected';
    const body = isApproved
      ? `${listing.title} (${listing.referenceCode}) is now live on Eawlma.`
      : `${listing.title} (${listing.referenceCode}) was not approved. Reason: ${reason}`;

    void this.notificationsService
      .create({
        userId: agent.id,
        type: isApproved ? NotificationType.LISTING_APPROVED : NotificationType.LISTING_REJECTED,
        title,
        body,
        data: {
          listingId: listing.id,
          referenceCode: listing.referenceCode,
          ...(reason ? { reason } : {}),
        },
      })
      .catch((err: Error) =>
        this.logger.warn(`failed to write moderation notification: ${err.message}`),
      );

    const appUrl = this.config.get<string>('app.appUrl', 'https://eawlma.sa');
    const html = isApproved
      ? `
        <h2>Your listing is live ✓</h2>
        <p><strong>${escapeHtml(listing.title)}</strong> (${listing.referenceCode}) has been approved by our moderation team and is now visible to buyers.</p>
        <p><a href="${appUrl}/listings/${listing.id}">View your listing</a></p>
      `
      : `
        <h2>Your listing was not approved</h2>
        <p>Hi, our moderation team reviewed <strong>${escapeHtml(listing.title)}</strong> (${listing.referenceCode}) and could not approve it as submitted.</p>
        <p><strong>Reason from moderator:</strong></p>
        <blockquote>${escapeHtml(reason ?? '')}</blockquote>
        <p>Please address the feedback above and resubmit. <a href="${appUrl}/agent/listings/${listing.id}/edit">Edit and resubmit</a></p>
      `;

    void this.emailService
      .send({
        to: agent.email,
        subject: title,
        locale: agent.preferredLocale === 'ar' ? 'ar' : 'en',
        html,
        text: body,
      })
      .catch((err: Error) =>
        this.logger.warn(`failed to send moderation email: ${err.message}`),
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
