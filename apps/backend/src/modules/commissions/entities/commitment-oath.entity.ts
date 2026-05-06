import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export type OathType = 'agent_listing' | 'buyer_purchase';

@Entity({ name: 'commitment_oaths' })
@Index('idx_oaths_user', ['userId'])
export class CommitmentOathEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 32, name: 'oath_type' })
  oathType: OathType;

  /** Snapshot of the oath text the user accepted, in case the wording is
   *  amended later. Stored verbatim for legal traceability. */
  @Column({ type: 'text', name: 'oath_text' })
  oathText: string;

  @Column({ type: 'timestamptz', name: 'accepted_at' })
  acceptedAt: Date;

  @Column({ type: 'varchar', length: 64, name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'uuid', name: 'listing_id', nullable: true })
  listingId: string | null;
}
