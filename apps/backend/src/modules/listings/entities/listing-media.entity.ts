import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { MediaType } from '@eawlma/shared-types';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ListingEntity } from './listing.entity';

@Entity({ name: 'listing_media' })
@Index('idx_media_listing', ['listingId'])
@Index('idx_media_listing_position', ['listingId', 'position'])
export class ListingMediaEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @ManyToOne(() => ListingEntity, (l) => l.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: ListingEntity;

  @Column({ type: 'enum', enum: MediaType })
  type: MediaType;

  @Column({ type: 'varchar', length: 1024 })
  url: string;

  @Column({ type: 'varchar', length: 1024, name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  caption: string | null;

  @Column({ type: 'integer', default: 0 })
  position: number;

  @Column({ type: 'integer', nullable: true })
  width: number | null;

  @Column({ type: 'integer', nullable: true })
  height: number | null;

  @Column({ type: 'integer', name: 'duration_seconds', nullable: true })
  durationSeconds: number | null;
}
