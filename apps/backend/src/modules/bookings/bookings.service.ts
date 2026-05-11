import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { ListingEntity } from '../listings/entities/listing.entity';
import { ListingPricingService } from '../listings/listing-pricing.service';
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
    private readonly pricing: ListingPricingService,
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
    // Dynamic pricing: sum per-day overrides (or default rate) over the
    // requested window; fall back to the tiered weekly/monthly discount on
    // the resulting nightly subtotal so long stays still get a break.
    const dynamic = await this.pricing.stayTotal(listing.id, checkIn, checkOut);
    const nightlySubtotal = dynamic.total > 0
      ? dynamic.total
      : calculateStayTotal(nights, dailyRate, weeklyRate);
    // Long-stay discount lives on top of the per-day pricing — 10% over 7
    // nights, 20% over 30 — but only when no weekly rate was explicitly set
    // by the host. Hosts who set a weekly rate already control their own
    // discount math.
    let stayTotal = nightlySubtotal;
    if (!weeklyRate) {
      if (nights >= 30) stayTotal = nightlySubtotal * 0.8;
      else if (nights >= 7) stayTotal = nightlySubtotal * 0.9;
    }
    const deposit = Number(listing.damageDeposit ?? 0);
    const totalAmount = (stayTotal + deposit).toFixed(2);

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
      depositAmount: deposit.toFixed(2),
      depositStatus: 'held',
      notes: dto.notes ?? null,
      status: initialStatus,
    });
    return this.bookings.save(booking);
  }

  async listForGuest(guestId: string): Promise<BookingEntity[]> {
    return this.bookings.find({
      where: { guestId },
      relations: ['listing'],
      order: { createdAt: 'DESC' },
    });
  }

  async listForHost(hostId: string): Promise<BookingEntity[]> {
    return this.bookings.find({
      where: { hostId },
      relations: ['listing'],
      order: { createdAt: 'DESC' },
    });
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
