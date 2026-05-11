import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { ListingEntity } from '../listings/entities/listing.entity';
import { RequestUser } from '../../common/decorators/current-user.decorator';

import { BookingEntity } from './entities/booking.entity';
import { CreateBookingDto } from './dto/booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
  ) {}

  async create(actor: RequestUser, dto: CreateBookingDto): Promise<BookingEntity> {
    const listing = await this.listings.findOne({ where: { id: dto.listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.bookingType !== 'daily' && listing.bookingType !== 'short_term') {
      throw new BadRequestException('Listing is not bookable on a daily basis');
    }

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out must be after check-in');
    }
    const nights = Math.round(
      (checkOut.getTime() - checkIn.getTime()) / (24 * 3600 * 1000),
    );
    if (nights < (listing.minimumStay ?? 1)) {
      throw new BadRequestException(
        `Minimum stay is ${listing.minimumStay ?? 1} nights`,
      );
    }

    // Headcount cap — refuse bookings that exceed the listing's maxGuests.
    const numGuests = dto.numGuests ?? 1;
    if (listing.maxGuests && numGuests > listing.maxGuests) {
      throw new BadRequestException(
        `This listing accommodates up to ${listing.maxGuests} guests`,
      );
    }

    const overlap = await this.bookings
      .createQueryBuilder('b')
      .where('b.listing_id = :id', { id: listing.id })
      .andWhere('b.status IN (:...active)', { active: ['pending', 'confirmed'] })
      .andWhere(
        new Brackets((qb) => {
          qb.where('b.check_in < :out AND b.check_out > :in', {
            in: dto.checkIn,
            out: dto.checkOut,
          });
        }),
      )
      .getCount();
    if (overlap > 0) {
      throw new BadRequestException('Selected dates overlap an existing booking');
    }

    const dailyRate = Number(listing.dailyRate ?? listing.price ?? 0);
    if (!dailyRate) throw new BadRequestException('Listing has no daily rate');
    const weeklyRate = listing.weeklyRate !== null ? Number(listing.weeklyRate) : null;
    const totalAmount = calculateStayTotal(nights, dailyRate, weeklyRate).toFixed(2);

    // instantBook → auto-confirm without host approval; otherwise pending.
    const initialStatus: 'pending' | 'confirmed' = listing.instantBook
      ? 'confirmed'
      : 'pending';

    const booking = this.bookings.create({
      listingId: listing.id,
      guestId: actor.id,
      hostId: listing.ownerId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      nights,
      numGuests,
      totalAmount,
      notes: dto.notes ?? null,
      status: initialStatus,
    });
    return this.bookings.save(booking);
  }

  async listForGuest(guestId: string): Promise<BookingEntity[]> {
    return this.bookings.find({ where: { guestId }, order: { createdAt: 'DESC' } });
  }

  async listForHost(hostId: string): Promise<BookingEntity[]> {
    return this.bookings.find({ where: { hostId }, order: { createdAt: 'DESC' } });
  }

  async listConfirmedForListing(listingId: string): Promise<BookingEntity[]> {
    return this.bookings.find({
      where: [
        { listingId, status: 'confirmed' },
        { listingId, status: 'pending' },
      ],
    });
  }

  private async getOne(id: string): Promise<BookingEntity> {
    const b = await this.bookings.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    return b;
  }

  async confirm(id: string, actor: RequestUser): Promise<BookingEntity> {
    const b = await this.getOne(id);
    if (b.hostId !== actor.id) throw new ForbiddenException('Only the host can confirm');
    b.status = 'confirmed';
    return this.bookings.save(b);
  }

  async cancel(id: string, actor: RequestUser): Promise<BookingEntity> {
    const b = await this.getOne(id);
    if (b.hostId !== actor.id && b.guestId !== actor.id) {
      throw new ForbiddenException('Not allowed to cancel this booking');
    }
    b.status = 'cancelled';
    return this.bookings.save(b);
  }
}

/**
 * Tiered booking pricing:
 *   - 1-6 nights  → nights × daily
 *   - 7-29 nights → weekly rate when configured, otherwise daily × nights × 0.9
 *   - 30+ nights  → 20% monthly discount on (daily × nights)
 *
 * Exported so unit tests can pin the math.
 */
export function calculateStayTotal(
  nights: number,
  dailyRate: number,
  weeklyRate: number | null,
): number {
  if (nights >= 30) {
    return dailyRate * nights * 0.8;
  }
  if (nights >= 7) {
    if (weeklyRate && weeklyRate > 0) {
      const fullWeeks = Math.floor(nights / 7);
      const extraNights = nights % 7;
      return weeklyRate * fullWeeks + extraNights * dailyRate;
    }
    return dailyRate * nights * 0.9;
  }
  return dailyRate * nights;
}
