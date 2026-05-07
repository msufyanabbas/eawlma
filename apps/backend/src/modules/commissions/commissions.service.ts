import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NotificationType } from '@eawlma/shared-types';

import { CommissionEntity, CommissionStatus } from './entities/commission.entity';
import { CommitmentOathEntity } from './entities/commitment-oath.entity';
import { ListingEntity } from '../listings/entities/listing.entity';
import { UserEntity } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AcceptOathDto,
  CommissionResponseDto,
  CommissionSummaryDto,
  CreateCommissionDto,
  OathResponseDto,
  UpdateCommissionStatusDto,
} from './dto/commission.dto';

const STATUS_VALUES: CommissionStatus[] = ['pending', 'confirmed', 'paid', 'disputed'];

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(
    @InjectRepository(CommissionEntity)
    private readonly commissions: Repository<CommissionEntity>,
    @InjectRepository(CommitmentOathEntity)
    private readonly oaths: Repository<CommitmentOathEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  /** Pull listing/agent/buyer names for a batch of commissions in two queries
   *  rather than N+1 — used by the admin and agent list endpoints. */
  private async enrichRows(
    rows: CommissionEntity[],
  ): Promise<CommissionResponseDto[]> {
    if (rows.length === 0) return [];
    const listingIds = Array.from(new Set(rows.map((r) => r.listingId)));
    const userIds = Array.from(
      new Set(rows.flatMap((r) => [r.agentId, r.buyerId].filter((id): id is string => Boolean(id)))),
    );

    const [listings, users] = await Promise.all([
      listingIds.length
        ? this.listings.find({
            where: { id: In(listingIds) },
            select: ['id', 'title', 'referenceCode'],
          })
        : Promise.resolve([] as ListingEntity[]),
      userIds.length
        ? this.users.find({
            where: { id: In(userIds) },
            select: ['id', 'firstName', 'lastName'],
          })
        : Promise.resolve([] as UserEntity[]),
    ]);

    const listingsById = new Map(listings.map((l) => [l.id, l]));
    const usersById = new Map(users.map((u) => [u.id, u]));
    const fullName = (u: UserEntity | undefined): string | null =>
      u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || null : null;

    return rows.map((r) => {
      const listing = listingsById.get(r.listingId);
      return CommissionResponseDto.fromEntity(r, {
        listingTitle: listing?.title ?? null,
        listingReferenceCode: listing?.referenceCode ?? null,
        agentName: fullName(usersById.get(r.agentId)),
        buyerName: r.buyerId ? fullName(usersById.get(r.buyerId)) : null,
      });
    });
  }

  private agentRate(): number {
    return Number(this.config.get<number | string>('AGENT_COMMISSION_RATE', 2.5));
  }

  private platformRate(): number {
    return Number(this.config.get<number | string>('PLATFORM_COMMISSION_RATE', 0.5));
  }

  /** Record a new commission row. Amounts are computed from the configured
   *  rates so admins can audit the breakdown without re-running the formula. */
  async create(dto: CreateCommissionDto): Promise<CommissionResponseDto> {
    const agentRate = this.agentRate();
    const platformRate = this.platformRate();
    const value = Number(dto.transactionValue);
    const agentAmount = (value * agentRate) / 100;
    const platformAmount = (value * platformRate) / 100;

    const entity = this.commissions.create({
      listingId: dto.listingId,
      agentId: dto.agentId,
      buyerId: dto.buyerId ?? null,
      transactionValue: value.toFixed(2),
      agentCommissionRate: agentRate.toFixed(2),
      platformCommissionRate: platformRate.toFixed(2),
      agentCommissionAmount: agentAmount.toFixed(2),
      platformCommissionAmount: platformAmount.toFixed(2),
      status: 'pending',
      notes: dto.notes ?? null,
    });
    const saved = await this.commissions.save(entity);
    return CommissionResponseDto.fromEntity(saved);
  }

  async listForAgent(agentId: string): Promise<CommissionResponseDto[]> {
    const rows = await this.commissions.find({
      where: { agentId },
      order: { createdAt: 'DESC' },
    });
    return this.enrichRows(rows);
  }

  /** Buyer view — commissions where the current user is the buyer. Used by
   *  the wallet "pending payments" panel. */
  async listForBuyer(buyerId: string): Promise<CommissionResponseDto[]> {
    const rows = await this.commissions.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
    return this.enrichRows(rows);
  }

  async listAll(): Promise<CommissionResponseDto[]> {
    const rows = await this.commissions.find({ order: { createdAt: 'DESC' } });
    return this.enrichRows(rows);
  }

  async updateStatus(id: string, dto: UpdateCommissionStatusDto): Promise<CommissionResponseDto> {
    const row = await this.commissions.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Commission not found');
    const previousStatus = row.status;
    row.status = dto.status;
    if (dto.notes !== undefined) row.notes = dto.notes;
    const saved = await this.commissions.save(row);

    // Transition pending|disputed → confirmed nudges the buyer to pay.
    if (
      dto.status === 'confirmed' &&
      previousStatus !== 'confirmed' &&
      saved.buyerId
    ) {
      try {
        const listing = await this.listings.findOne({
          where: { id: saved.listingId },
          select: ['id', 'title', 'referenceCode'],
        });
        const total =
          Number(saved.agentCommissionAmount) + Number(saved.platformCommissionAmount);
        await this.notifications.create({
          userId: saved.buyerId,
          type: NotificationType.INQUIRY_RECEIVED,
          title: 'Please pay commission',
          body: `Your commission for ${listing?.title ?? saved.listingId} (${total.toLocaleString('en-US')} SAR) is ready for payment.`,
          data: {
            commissionId: saved.id,
            listingId: saved.listingId,
            amount: total,
          },
        });
      } catch (err) {
        this.logger.error(`Buyer commission-confirm notification failed: ${(err as Error).message}`);
      }
    }

    const [enriched] = await this.enrichRows([saved]);
    return enriched ?? CommissionResponseDto.fromEntity(saved);
  }

  async summary(): Promise<CommissionSummaryDto> {
    const rows = await this.commissions.find();
    const byStatus = STATUS_VALUES.reduce(
      (acc, s) => {
        acc[s] = 0;
        return acc;
      },
      {} as Record<CommissionStatus, number>,
    );
    const monthBuckets = new Map<string, { platform: number; agent: number; count: number }>();
    let platform = 0;
    let agent = 0;
    for (const r of rows) {
      byStatus[r.status] += 1;
      platform += Number(r.platformCommissionAmount);
      agent += Number(r.agentCommissionAmount);
      const month = r.createdAt.toISOString().slice(0, 7);
      const bucket = monthBuckets.get(month) ?? { platform: 0, agent: 0, count: 0 };
      bucket.platform += Number(r.platformCommissionAmount);
      bucket.agent += Number(r.agentCommissionAmount);
      bucket.count += 1;
      monthBuckets.set(month, bucket);
    }
    const byMonth = Array.from(monthBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v }));
    return {
      totalPlatformRevenue: Math.round(platform * 100) / 100,
      totalAgentCommissions: Math.round(agent * 100) / 100,
      totalTransactions: rows.length,
      byStatus,
      byMonth,
    };
  }

  /** Record a user's commitment oath. Returns the saved row so the client
   *  can cache the acceptance id alongside its localStorage flag.
   *
   *  This call is intentionally resilient: a DB error here MUST NOT block
   *  the user from proceeding with their inquiry / publish action. The oath
   *  is also cached in localStorage on the client, so the legal trail is not
   *  lost even when the DB write fails (e.g. before the table is created
   *  in dev). We log + return a synthetic success so the UI flow continues.
   */
  async acceptOath(userId: string, dto: AcceptOathDto, ipAddress: string | null): Promise<OathResponseDto> {
    try {
      const entity = this.oaths.create({
        userId,
        oathType: dto.oathType,
        oathText: dto.oathText ?? 'Commission commitment accepted',
        listingId: dto.listingId ?? null,
        acceptedAt: new Date(),
        ipAddress,
      });
      const saved = await this.oaths.save(entity);
      return OathResponseDto.fromEntity(saved);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[CommissionsService.acceptOath] persistence failed:', error);
      const fallback = OathResponseDto.fromEntity({
        id: '',
        userId,
        oathType: dto.oathType,
        oathText: dto.oathText ?? 'Commission commitment accepted',
        listingId: dto.listingId ?? null,
        acceptedAt: new Date(),
        ipAddress,
        // BaseEntity fields the DTO never reads — safe to stub.
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        version: 1,
      } as CommitmentOathEntity);
      return fallback;
    }
  }

  async hasAcceptedOath(userId: string, oathType: 'agent_listing' | 'buyer_purchase'): Promise<boolean> {
    try {
      const found = await this.oaths.findOne({ where: { userId, oathType } });
      return Boolean(found);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[CommissionsService.hasAcceptedOath] read failed:', error);
      return false;
    }
  }
}
