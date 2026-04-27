import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ListingEntity } from '../../listings/entities/listing.entity';

@Entity({ name: 'conversations' })
@Index('idx_conversations_listing', ['listingId'])
// Postgres GIN index over the participantIds array — created in the migration
// alongside the table so we can do `participant_ids @> ARRAY[:userId]` lookups.
export class ConversationEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'listing_id', nullable: true })
  listingId: string | null;

  @ManyToOne(() => ListingEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'listing_id' })
  listing: ListingEntity | null;

  @Column({ type: 'uuid', name: 'participant_ids', array: true })
  participantIds: string[];

  @Column({ type: 'timestamptz', name: 'last_message_at', nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: 'varchar', length: 280, name: 'last_message_preview', nullable: true })
  lastMessagePreview: string | null;

  @Column({ type: 'uuid', name: 'last_sender_id', nullable: true })
  lastSenderId: string | null;
}
