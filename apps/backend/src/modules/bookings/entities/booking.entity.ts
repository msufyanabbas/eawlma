import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { ListingEntity } from '../../listings/entities/listing.entity';
import { UserEntity } from '../../users/entities/user.entity';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

@Entity({ name: 'bookings' })
@Index('idx_bookings_listing', ['listingId'])
@Index('idx_bookings_guest', ['guestId'])
@Index('idx_bookings_host', ['hostId'])
@Index('idx_bookings_status', ['status'])
@Index('idx_bookings_dates', ['checkIn', 'checkOut'])
export class BookingEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @ManyToOne(() => ListingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: ListingEntity;

  @Column({ type: 'uuid', name: 'guest_id' })
  guestId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guest_id' })
  guest: UserEntity;

  /** Listing owner at time of booking — snapshotted so an ownership change
   *  doesn't reroute existing reservations. */
  @Column({ type: 'uuid', name: 'host_id' })
  hostId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_id' })
  host: UserEntity;

  @Column({ type: 'date', name: 'check_in' })
  checkIn: string;

  @Column({ type: 'date', name: 'check_out' })
  checkOut: string;

  @Column({ type: 'integer' })
  nights: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'total_amount' })
  totalAmount: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: BookingStatus;

  @Column({ type: 'varchar', length: 64, name: 'moyasar_payment_id', nullable: true })
  moyasarPaymentId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
