import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { InquiryStatus } from '@eawlma/shared-types';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ListingEntity } from '../../listings/entities/listing.entity';
import { UserEntity } from '../../users/entities/user.entity';

export type PreferredContactMethod = 'phone' | 'email' | 'whatsapp';

@Entity({ name: 'inquiries' })
@Index('idx_inquiries_listing', ['listingId'])
@Index('idx_inquiries_user', ['userId'])
@Index('idx_inquiries_agent', ['agentId'])
@Index('idx_inquiries_status', ['status'])
@Index('idx_inquiries_listing_status', ['listingId', 'status'])
export class InquiryEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @ManyToOne(() => ListingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: ListingEntity;

  /** Owner of the listing at inquiry-creation time. Snapshotted so that
   *  ownership transfers later don't reroute historical leads. */
  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: UserEntity;

  /** Authenticated buyer's user ID; null when the inquiry came from a guest. */
  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity | null;

  // Captured contact info — populated for both guest and authenticated buyers
  // so the agent can reach the lead without joining users.
  @Column({ type: 'varchar', length: 200, name: 'guest_name', nullable: true })
  guestName: string | null;

  @Column({ type: 'varchar', length: 320, name: 'guest_email', nullable: true })
  guestEmail: string | null;

  @Column({ type: 'varchar', length: 32, name: 'guest_phone', nullable: true })
  guestPhone: string | null;

  @Column({
    type: 'varchar',
    length: 16,
    name: 'preferred_contact_method',
    nullable: true,
  })
  preferredContactMethod: PreferredContactMethod | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: InquiryStatus, default: InquiryStatus.NEW })
  status: InquiryStatus;

  @Column({ type: 'text', name: 'agent_notes', nullable: true })
  agentNotes: string | null;

  @Column({ type: 'varchar', length: 500, name: 'next_action', nullable: true })
  nextAction: string | null;

  @Column({ type: 'timestamptz', name: 'next_action_at', nullable: true })
  nextActionAt: Date | null;

  @Column({ type: 'timestamptz', name: 'responded_at', nullable: true })
  respondedAt: Date | null;

  @Column({ type: 'inet', name: 'source_ip', nullable: true })
  sourceIp: string | null;

  @Column({ type: 'varchar', length: 512, name: 'user_agent', nullable: true })
  userAgent: string | null;
}
