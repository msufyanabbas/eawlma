import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { WishlistItemEntity } from './wishlist-item.entity';

/**
 * A named bag of saved listings — Airbnb-style "Wishlists". Each user has at
 * least the auto-created default "Saved" list; they can rename/delete it and
 * create as many additional lists as they like.
 */
@Entity({ name: 'wishlists' })
@Index('idx_wishlists_user', ['userId'])
export class WishlistEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  /** Optional emoji or icon character ("🏖️", "🏔️", …) shown on the list card. */
  @Column({ type: 'varchar', length: 8, nullable: true })
  emoji: string | null;

  /** Exactly one list per user carries `isDefault = true`; receives saves when
   *  the user hasn't picked a list explicitly. Cleared automatically when the
   *  user picks a different default. */
  @Column({ type: 'boolean', name: 'is_default', default: false })
  isDefault: boolean;

  @OneToMany(() => WishlistItemEntity, (item) => item.wishlist, {
    cascade: ['insert', 'update', 'remove'],
  })
  items: WishlistItemEntity[];
}
