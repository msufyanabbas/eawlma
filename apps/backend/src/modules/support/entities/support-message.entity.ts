import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { SupportTicketEntity } from './support-ticket.entity';

@Entity('support_messages')
export class SupportMessageEntity extends BaseEntity {
  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => SupportTicketEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket?: SupportTicketEntity;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender?: UserEntity;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'is_staff', type: 'boolean', default: false })
  isStaff: boolean;

  @Column({ name: 'attachment_url', type: 'varchar', length: 1024, nullable: true })
  attachmentUrl: string | null;
}
