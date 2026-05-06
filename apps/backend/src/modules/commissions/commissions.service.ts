import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CommissionEntity, CommissionStatus } from './entities/commission.entity';
import { CommitmentOathEntity } from './entities/commitment-oath.entity';
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
  constructor(
    @InjectRepository(CommissionEntity)
    private readonly commissions: Repository<CommissionEntity>,
    @InjectRepository(CommitmentOathEntity)
    private readonly oaths: Repository<CommitmentOathEntity>,
    private readonly config: ConfigService,
  ) {}

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
    return rows.map(CommissionResponseDto.fromEntity);
  }

  async listAll(): Promise<CommissionResponseDto[]> {
    const rows = await this.commissions.find({ order: { createdAt: 'DESC' } });
    return rows.map(CommissionResponseDto.fromEntity);
  }

  async updateStatus(id: string, dto: UpdateCommissionStatusDto): Promise<CommissionResponseDto> {
    const row = await this.commissions.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Commission not found');
    row.status = dto.status;
    if (dto.notes !== undefined) row.notes = dto.notes;
    const saved = await this.commissions.save(row);
    return CommissionResponseDto.fromEntity(saved);
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
