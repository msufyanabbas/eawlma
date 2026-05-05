import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity({ name: 'reviews' })
@Index('uq_reviews_agent_reviewer', ['agentId', 'reviewerId'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('idx_reviews_agent', ['agentId'])
export class ReviewEntity extends BaseEntity {
  /** The agent being reviewed (User ID with role agent / agency-admin). */
  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  /** The reviewer (a buyer/seeker User ID). */
  @Column({ type: 'uuid', name: 'reviewer_id' })
  reviewerId: string;

  /** Optional listing this review references. */
  @Column({ type: 'uuid', name: 'listing_id', nullable: true })
  listingId: string | null;

  /** 1–5. */
  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text' })
  comment: string;

  /** Optional public reply from the agent. */
  @Column({ type: 'text', nullable: true })
  reply: string | null;

  @Column({ type: 'timestamptz', name: 'replied_at', nullable: true })
  repliedAt: Date | null;
}
