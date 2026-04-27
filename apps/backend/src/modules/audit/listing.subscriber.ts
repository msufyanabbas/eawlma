import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { ListingEntity } from '../listings/entities/listing.entity';
import { AuditService } from './audit.service';
import type { FieldDiff } from './entities/audit-log.entity';

const TRACKED_FIELDS: Array<keyof ListingEntity> = [
  'title',
  'description',
  'price',
  'currency',
  'rentPeriod',
  'isNegotiable',
  'status',
  'propertyType',
  'type',
  'bedrooms',
  'bathrooms',
  'area',
  'landArea',
  'furnishing',
  'city',
  'district',
  'lat',
  'lng',
  'isFeatured',
  'featuredUntil',
  'publishedAt',
  'expiresAt',
  'rejectionReason',
];

/** TypeORM subscriber that captures create / update / delete events on ListingEntity. */
@Injectable()
@EventSubscriber()
export class ListingAuditSubscriber implements EntitySubscriberInterface<ListingEntity> {
  private readonly logger = new Logger(ListingAuditSubscriber.name);

  constructor(
    @InjectDataSource() dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo(): typeof ListingEntity {
    return ListingEntity;
  }

  async afterInsert(event: InsertEvent<ListingEntity>): Promise<void> {
    const entity = event.entity;
    if (!entity) return;
    const fields: Record<string, FieldDiff> = { id: { before: null, after: entity.id } };
    for (const key of TRACKED_FIELDS) {
      const value = (entity as unknown as Record<string, unknown>)[key as string];
      if (value !== undefined) fields[key as string] = { before: null, after: value as unknown };
    }
    await this.auditService
      .write({
        action: 'create',
        entityType: 'listing',
        entityId: entity.id,
        changedFields: fields,
      })
      .catch((err) => this.logger.error(`audit afterInsert failed: ${err.message}`));
  }

  async afterUpdate(event: UpdateEvent<ListingEntity>): Promise<void> {
    const before = event.databaseEntity as ListingEntity | undefined;
    const after = event.entity as ListingEntity | undefined;
    if (!after || !before) return;
    if (!after.id) return;

    const updatedColumns = (event.updatedColumns ?? []).map((c) => c.propertyName);
    const fields: Record<string, FieldDiff> = {};
    for (const key of TRACKED_FIELDS) {
      const k = key as string;
      if (!updatedColumns.includes(k)) continue;
      const oldVal = (before as unknown as Record<string, unknown>)[k];
      const newVal = (after as unknown as Record<string, unknown>)[k];
      if (!isEqual(oldVal, newVal)) fields[k] = { before: oldVal ?? null, after: newVal ?? null };
    }
    if (Object.keys(fields).length === 0) return;

    await this.auditService
      .write({
        action: 'update',
        entityType: 'listing',
        entityId: after.id,
        changedFields: fields,
      })
      .catch((err) => this.logger.error(`audit afterUpdate failed: ${err.message}`));
  }

  async afterRemove(event: RemoveEvent<ListingEntity>): Promise<void> {
    const before = event.databaseEntity as ListingEntity | undefined;
    if (!before) return;
    await this.auditService
      .write({
        action: 'delete',
        entityType: 'listing',
        entityId: before.id,
        changedFields: { id: { before: before.id, after: null } },
      })
      .catch((err) => this.logger.error(`audit afterRemove failed: ${err.message}`));
  }
}

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return a === b;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (typeof a === 'number' && typeof b === 'string') return Number(a) === Number(b);
  if (typeof a === 'string' && typeof b === 'number') return Number(a) === Number(b);
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}
