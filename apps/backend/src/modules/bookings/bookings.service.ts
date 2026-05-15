import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { NotificationType } from '@eawlma/shared-types';

import { ListingEntity } from '../listings/entities/listing.entity';
import { ListingPricingService } from '../listings/listing-pricing.service';
import { MoyasarClient } from '../payments/moyasar.client';
import { NotificationsService } from '../notifications/notifications.service';
import { PromosService } from '../promos/promos.service';
import { UserEntity } from '../users/entities/user.entity';
import { EmailService } from '../../common/email/email.service';
import { WhatsAppService } from '../../common/whatsapp/whatsapp.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';

import { BookingEntity } from './entities/booking.entity';
import { CreateBookingDto, CreateBookingResult } from './dto/booking.dto';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly pricing: ListingPricingService,
    private readonly moyasar: MoyasarClient,
    private readonly notifications: NotificationsService,
    private readonly promos: PromosService,
    private readonly email: EmailService,
    private readonly whatsapp: WhatsAppService,
    private readonly config: ConfigService,
  ) {}

  async create(actor: RequestUser, dto: CreateBookingDto): Promise<CreateBookingResult> {
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
    const dynamic = await this.pricing.stayTotal(listing.id, checkIn, checkOut);
    const nightlySubtotal = dynamic.total > 0
      ? dynamic.total
      : calculateStayTotal(nights, dailyRate, weeklyRate);
    let stayTotal = nightlySubtotal;
    if (!weeklyRate) {
      if (nights >= 30) stayTotal = nightlySubtotal * 0.8;
      else if (nights >= 7) stayTotal = nightlySubtotal * 0.9;
    }
    const deposit = Number(listing.damageDeposit ?? 0);
    const grandTotal = stayTotal + deposit;

    // Apply promo if supplied — server-side re-validation is authoritative.
    let discount = 0;
    let promoCodeUsed: string | undefined;
    if (dto.promoCode) {
      const result = await this.promos.validate(dto.promoCode, listing.id, grandTotal);
      if (result.valid) {
        discount = result.discount;
        promoCodeUsed = result.code;
      } else {
        throw new BadRequestException(result.message);
      }
    }
    const finalAmount = Math.max(0, grandTotal - discount);

    // Pending booking — confirmed only once payment is settled.
    const booking = this.bookings.create({
      listingId: listing.id,
      guestId: actor.id,
      hostId: listing.ownerId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      nights,
      numGuests,
      totalAmount: finalAmount.toFixed(2),
      depositAmount: deposit.toFixed(2),
      depositStatus: 'held',
      notes: dto.notes ?? null,
      status: 'pending',
    });
    const saved = await this.bookings.save(booking);

    // Create a Moyasar payment intent. In dev (no secret) the client returns
    // a stubbed response and we generate a mock callback URL the frontend
    // navigates to so the success/failure path can still be exercised.
    const frontendUrl = this.config.get<string>('app.frontendUrl', 'http://192.168.1.125:5173');
    const callbackBase = `${frontendUrl.replace(/\/$/, '')}/bookings/payment-callback`;
    const callbackUrl =
      `${callbackBase}?bookingId=${saved.id}` +
      (promoCodeUsed ? `&promoCode=${encodeURIComponent(promoCodeUsed)}` : '');
    const payment = await this.moyasar.createPayment({
      amount: Math.round(finalAmount * 100),
      currency: 'SAR',
      description: `Booking ${saved.id} — ${listing.title} (${nights} nights)`,
      callbackUrl,
      metadata: {
        bookingId: saved.id,
        type: 'booking',
        promoCode: promoCodeUsed ?? null,
      },
    });
    saved.moyasarPaymentId = payment.id;
    await this.bookings.save(saved);

    const isMock = !this.moyasar.isConfigured();
    return {
      booking: saved,
      paymentId: payment.id,
      paymentUrl: isMock
        ? `${callbackUrl}&status=paid&mock=true`
        : ((payment as unknown as { source?: { transaction_url?: string } }).source
            ?.transaction_url ??
          payment.callback_url ??
          callbackUrl),
      mockPayment: isMock,
    };
  }

  /**
   * Public callback hit by Moyasar (or the dev mock redirect) after the user
   * completes payment. Marks the booking confirmed/cancelled and dispatches
   * the buyer + host notifications.
   */
  async handlePaymentCallback(
    bookingId: string,
    status: string,
    paymentId?: string,
    promoCode?: string,
  ): Promise<{ status: string; bookingId: string }> {
    const booking = await this.bookings.findOne({
      where: { id: bookingId },
      relations: ['listing'],
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== 'pending') {
      // Idempotent — return the already-settled state without modifying.
      return { status: booking.status, bookingId: booking.id };
    }

    const normalised = status.toLowerCase();
    if (['paid', 'captured', 'authorized', 'succeeded'].includes(normalised)) {
      const listing = booking.listing ?? (await this.listings.findOne({ where: { id: booking.listingId } }));
      booking.status = listing?.instantBook ? 'confirmed' : 'pending';
      if (paymentId) booking.moyasarPaymentId = paymentId;
      await this.bookings.save(booking);

      // Record promo usage so usedCount/usage rows are kept in sync.
      if (promoCode) {
        try {
          await this.promos.apply(promoCode, booking.guestId, booking.id);
        } catch (err) {
          this.logger.warn(
            `Promo apply failed for booking ${booking.id}: ${(err as Error).message}`,
          );
        }
      }

      if (listing) {
        await this.notifyOnPayment(booking, listing);
        // SES booking-confirmation email — best-effort.
        void this.sendBookingEmail(booking, listing).catch((err: Error) =>
          this.logger.warn(`booking email failed: ${err.message}`),
        );
      }
      return { status: booking.status, bookingId: booking.id };
    }

    if (['failed', 'cancelled', 'voided'].includes(normalised)) {
      booking.status = 'cancelled';
      await this.bookings.save(booking);
      return { status: 'cancelled', bookingId: booking.id };
    }

    return { status: booking.status, bookingId: booking.id };
  }

  private async notifyOnPayment(
    booking: BookingEntity,
    listing: ListingEntity,
  ): Promise<void> {
    const confirmed = booking.status === 'confirmed';
    await this.notifications
      .create({
        userId: listing.ownerId,
        type: NotificationType.PAYMENT_SUCCEEDED,
        title: 'New booking received',
        body: `${booking.nights}-night booking for "${listing.title}" — check-in ${booking.checkIn}.`,
        data: { bookingId: booking.id, listingId: listing.id },
      })
      .catch((err) =>
        this.logger.warn(`host notify failed for ${booking.id}: ${(err as Error).message}`),
      );

    await this.notifications
      .create({
        userId: booking.guestId,
        type: NotificationType.PAYMENT_SUCCEEDED,
        title: confirmed ? 'Booking confirmed' : 'Booking request sent',
        body: confirmed
          ? `Your stay at "${listing.title}" is confirmed. Check-in ${booking.checkIn}.`
          : `Your booking request is pending host approval.`,
        data: { bookingId: booking.id, listingId: listing.id },
      })
      .catch((err) =>
        this.logger.warn(`guest notify failed for ${booking.id}: ${(err as Error).message}`),
      );
  }

  private async sendBookingEmail(
    booking: BookingEntity,
    listing: ListingEntity,
  ): Promise<void> {
    const [guest, host] = await Promise.all([
      this.users.findOne({ where: { id: booking.guestId } }),
      this.users.findOne({ where: { id: listing.ownerId } }),
    ]);

    if (guest?.email) {
      await this.email.sendBookingConfirmation({
        bookingId: booking.id,
        guestEmail: guest.email,
        guestName: guest.firstName ?? guest.email.split('@')[0] ?? 'there',
        listingTitle: listing.title,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        totalAmount: Number(booking.totalAmount),
      });
    }

    // WhatsApp dispatch — guest confirmation + host payment notice. Both run
    // best-effort so a transient 360dialog blip doesn't fail the callback.
    if (guest?.phone) {
      void this.whatsapp
        .sendBookingConfirmation({
          phone: guest.phone,
          guestName: guest.firstName ?? 'Guest',
          listingTitle: listing.title,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          totalAmount: Number(booking.totalAmount),
        })
        .catch(() => undefined);
    }
    if (host?.phone) {
      void this.whatsapp
        .sendPaymentReceived({
          agentPhone: host.phone,
          amount: Number(booking.totalAmount),
          listingTitle: listing.title,
        })
        .catch(() => undefined);
    }
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
