import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

export type PropertyRequestStatus = 'open' | 'matched' | 'closed';

@Entity({ name: 'property_requests' })
@Index('idx_property_requests_status', ['status'])
@Index('idx_property_requests_user', ['userId'])
@Index('idx_property_requests_city', ['city'])
export class PropertyRequestEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity | null;

  @Column({ type: 'varchar', length: 32, name: 'property_type' })
  propertyType: string;

  @Column({ type: 'varchar', length: 120 })
  city: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'min_budget', nullable: true })
  minBudget: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'max_budget', nullable: true })
  maxBudget: string | null;

  @Column({ type: 'integer', nullable: true })
  bedrooms: number | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'varchar', length: 32, name: 'contact_phone' })
  contactPhone: string;

  @Column({ type: 'varchar', length: 320, name: 'contact_email', nullable: true })
  contactEmail: string | null;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: PropertyRequestStatus;
}
