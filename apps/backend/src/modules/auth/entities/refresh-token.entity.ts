import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'refresh_tokens' })
@Index('idx_refresh_user_id', ['userId'])
@Index('uq_refresh_token_hash', ['tokenHash'], { unique: true })
export class RefreshTokenEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, (u) => u.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  /** SHA-256 hash of the JWT id (jti). The raw token is never persisted. */
  @Column({ type: 'varchar', length: 128, name: 'token_hash' })
  tokenHash: string;

  @Column({ type: 'varchar', length: 64, name: 'family_id' })
  familyId: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'varchar', length: 255, name: 'replaced_by', nullable: true })
  replacedBy: string | null;

  @Column({ type: 'inet', name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 512, name: 'user_agent', nullable: true })
  userAgent: string | null;
}
