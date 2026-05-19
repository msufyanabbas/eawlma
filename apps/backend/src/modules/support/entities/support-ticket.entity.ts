import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketCategory =
  | 'general'
  | 'technical'
  | 'billing'
  | 'listing'
  | 'account'
  | 'other';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

@Entity('support_tickets')
export class SupportTicketEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 32, default: 'general' })
  category: SupportTicketCategory;

  @Column({ type: 'varchar', length: 16, default: 'medium' })
  priority: SupportTicketPriority;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: SupportTicketStatus;

  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: UserEntity | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  @Column({ name: 'ticket_number', type: 'varchar', length: 20, nullable: true, unique: true })
  ticketNumber: string | null;
}
