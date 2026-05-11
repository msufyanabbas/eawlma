import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { ListingEntity } from '../../listings/entities/listing.entity';
import { WishlistEntity } from './wishlist.entity';

@Entity({ name: 'wishlist_items' })
@Index('uq_wishlist_listing', ['wishlistId', 'listingId'], { unique: true })
@Index('idx_wishlist_items_listing', ['listingId'])
export class WishlistItemEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'wishlist_id' })
  wishlistId: string;

  @ManyToOne(() => WishlistEntity, (w) => w.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wishlist_id' })
  wishlist: WishlistEntity;

  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @ManyToOne(() => ListingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: ListingEntity;
}
