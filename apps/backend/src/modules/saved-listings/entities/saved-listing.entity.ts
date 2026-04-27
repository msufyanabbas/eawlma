import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { ListingEntity } from '../../listings/entities/listing.entity';

@Entity({ name: 'saved_listings' })
@Index('uq_saved_user_listing', ['userId', 'listingId'], { unique: true })
@Index('idx_saved_user', ['userId'])
@Index('idx_saved_listing', ['listingId'])
export class SavedListingEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @ManyToOne(() => ListingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: ListingEntity;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
