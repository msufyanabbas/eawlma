import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, ILike, Repository } from 'typeorm';

import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { RequestContextService } from '../../common/context/request-context.service';
import { AuditLogEntity, FieldDiff } from './entities/audit-log.entity';

export interface AuditWriteInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  changedFields?: Record<string, FieldDiff>;
  actorIdOverride?: string | null; // for system-initiated events (cron, kafka)
}

export interface AuditFilter {
  entityType?: string;
  entityId?: string;
  action?: string;
  actorId?: string;
  search?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly logs: Repository<AuditLogEntity>,
    private readonly context: RequestContextService,
  ) {}

  async write(input: AuditWriteInput): Promise<AuditLogEntity> {
    const ctx = this.context.get();
    const entry = this.logs.create({
      actorId: input.actorIdOverride ?? ctx?.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      changedFields: input.changedFields ?? {},
      ipAddress: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
      requestId: ctx?.requestId ?? null,
    });
    return this.logs.save(entry);
  }

  async paginate(
    page: number,
    limit: number,
    filter: AuditFilter = {},
  ): Promise<PaginatedResultDto<AuditLogEntity>> {
    const where: FindOptionsWhere<AuditLogEntity> = {};
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.action) where.action = filter.action;
    if (filter.actorId) where.actorId = filter.actorId;
    if (filter.from && filter.to) {
      where.createdAt = Between(filter.from, filter.to);
    } else if (filter.from) {
      where.createdAt = Between(filter.from, new Date());
    }

    const qb = this.logs.createQueryBuilder('a').where(where);
    if (filter.search) {
      qb.andWhere(
        "(a.entity_type ILIKE :s OR a.action ILIKE :s OR a.changed_fields::text ILIKE :s)",
        { s: `%${filter.search}%` },
      );
    }

    qb.orderBy('a.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResultDto(data, total, page, limit);
  }

  async streamForExport(filter: AuditFilter): Promise<AuditLogEntity[]> {
    const result = await this.paginate(1, 10_000, filter);
    return result.data;
  }
}
