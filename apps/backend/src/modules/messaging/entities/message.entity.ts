import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ConversationEntity } from './conversation.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'messages' })
@Index('idx_messages_conversation', ['conversationId'])
@Index('idx_messages_conversation_created', ['conversationId', 'createdAt'])
@Index('idx_messages_sender', ['senderId'])
export class MessageEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => ConversationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: ConversationEntity;

  @Column({ type: 'uuid', name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: UserEntity;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', array: true, name: 'attachment_urls', default: () => "'{}'::text[]" })
  attachmentUrls: string[];

  /** User IDs who have read this message (includes the sender after delivery). */
  @Column({ type: 'uuid', array: true, name: 'read_by', default: () => "'{}'::uuid[]" })
  readBy: string[];

  @Column({ type: 'timestamptz', name: 'delivered_at', nullable: true })
  deliveredAt: Date | null;
}
