import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

export interface FieldDiff<T = unknown> {
  before: T | null;
  after: T | null;
}

@Entity({ name: 'audit_logs' })
@Index('idx_audit_actor', ['actorId'])
@Index('idx_audit_entity', ['entityType', 'entityId'])
@Index('idx_audit_action', ['action'])
@Index('idx_audit_created', ['createdAt'])
export class AuditLogEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'actor_id', nullable: true })
  actorId: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: UserEntity | null;

  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Column({ type: 'varchar', length: 64, name: 'entity_type' })
  entityType: string;

  @Column({ type: 'uuid', name: 'entity_id', nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', name: 'changed_fields', default: () => "'{}'::jsonb" })
  changedFields: Record<string, FieldDiff>;

  @Column({ type: 'inet', name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 512, name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 64, name: 'request_id', nullable: true })
  requestId: string | null;
}
