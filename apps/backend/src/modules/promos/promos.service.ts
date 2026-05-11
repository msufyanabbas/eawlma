import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { SHORT_TERM_PROPERTY_TYPES, UserRole } from '@eawlma/shared-types';

import { ListingEntity } from '../listings/entities/listing.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { RequestUser } from '../../common/decorators/current-user.decorator';

import { PromoApplicableTo, PromoCodeEntity, PromoType } from './entities/promo-code.entity';
import { PromoUsageEntity } from './entities/promo-usage.entity';

interface ValidationResult {
  valid: boolean;
  discount: number;
  finalAmount: number;
  message: string;
  code?: string;
  promoCodeId?: string;
}

@Injectable()
export class PromosService {
  constructor(
    @InjectRepository(PromoCodeEntity)
    private readonly promos: Repository<PromoCodeEntity>,
    @InjectRepository(PromoUsageEntity)
    private readonly usage: Repository<PromoUsageEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
  ) {}

  // ---------- Public --------------------------------------------------------

  async validate(
    code: string,
    listingId: string | undefined,
    amount: number,
  ): Promise<ValidationResult> {
    const promo = await this.findActive(code);
    if (!promo) {
      return { valid: false, discount: 0, finalAmount: amount, message: 'Invalid or expired code' };
    }
    if (amount < Number(promo.minBookingAmount)) {
      return {
        valid: false,
        discount: 0,
        finalAmount: amount,
        message: `Minimum booking amount is ${Number(promo.minBookingAmount)} SAR`,
      };
    }
    if (promo.applicableTo === 'specific_listing') {
      if (!listingId || promo.listingId !== listingId) {
        return { valid: false, discount: 0, finalAmount: amount, message: 'Not valid for this listing' };
      }
    }
    if (listingId && (promo.applicableTo === 'stays' || promo.applicableTo === 'long_term')) {
      const listing = await this.listings.findOne({ where: { id: listingId } });
      if (!listing) {
        return { valid: false, discount: 0, finalAmount: amount, message: 'Listing not found' };
      }
      const isShortTerm = SHORT_TERM_PROPERTY_TYPES.includes(listing.propertyType);
      if (promo.applicableTo === 'stays' && !isShortTerm) {
        return { valid: false, discount: 0, finalAmount: amount, message: 'Promo only applies to short-term stays' };
      }
      if (promo.applicableTo === 'long_term' && isShortTerm) {
        return { valid: false, discount: 0, finalAmount: amount, message: 'Promo only applies to long-term listings' };
      }
    }

    const discount = this.computeDiscount(promo, amount);
    return {
      valid: true,
      discount,
      finalAmount: Math.max(0, amount - discount),
      message: this.successCopy(promo, discount),
      code: promo.code,
      promoCodeId: promo.id,
    };
  }

  async apply(
    code: string,
    userId: string,
    bookingId: string,
  ): Promise<{ discount: number }> {
    const booking = await this.bookings.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== userId) {
      throw new ForbiddenException('You can only apply promos to your own bookings');
    }
    const amount = Number(booking.totalAmount);
    const result = await this.validate(code, booking.listingId, amount);
    if (!result.valid || !result.promoCodeId) {
      throw new BadRequestException(result.message);
    }
    await this.usage.save(
      this.usage.create({
        promoCodeId: result.promoCodeId,
        userId,
        bookingId,
        discountApplied: result.discount.toFixed(2),
        usedAt: new Date(),
      }),
    );
    await this.promos.increment({ id: result.promoCodeId }, 'usedCount', 1);
    return { discount: result.discount };
  }

  // ---------- Admin ---------------------------------------------------------

  async listAll(actor: RequestUser): Promise<PromoCodeEntity[]> {
    this.assertAdmin(actor);
    return this.promos.find({ order: { createdAt: 'DESC' } });
  }

  async create(actor: RequestUser, input: Partial<PromoCodeEntity>): Promise<PromoCodeEntity> {
    this.assertAdmin(actor);
    if (!input.code) throw new BadRequestException('code is required');
    const code = input.code.toUpperCase().trim();
    const dupe = await this.promos.findOne({ where: { code } });
    if (dupe) throw new BadRequestException('Code already exists');
    return this.promos.save(
      this.promos.create({
        ...input,
        code,
        createdBy: actor.id,
        usedCount: 0,
        isActive: input.isActive ?? true,
      }),
    );
  }

  async update(actor: RequestUser, id: string, patch: Partial<PromoCodeEntity>): Promise<PromoCodeEntity> {
    this.assertAdmin(actor);
    const promo = await this.promos.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Promo not found');
    Object.assign(promo, patch, { code: patch.code?.toUpperCase() ?? promo.code });
    return this.promos.save(promo);
  }

  async remove(actor: RequestUser, id: string): Promise<void> {
    this.assertAdmin(actor);
    await this.promos.delete({ id });
  }

  async usageFor(actor: RequestUser, id: string): Promise<PromoUsageEntity[]> {
    this.assertAdmin(actor);
    return this.usage.find({ where: { promoCodeId: id }, order: { usedAt: 'DESC' } });
  }

  // ---------- helpers -------------------------------------------------------

  private async findActive(code: string): Promise<PromoCodeEntity | null> {
    if (!code) return null;
    const now = new Date();
    const promo = await this.promos.findOne({
      where: {
        code: code.toUpperCase().trim(),
        isActive: true,
        validFrom: LessThanOrEqual(now),
        validUntil: MoreThanOrEqual(now),
      },
    });
    if (!promo) return null;
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return null;
    return promo;
  }

  private computeDiscount(promo: PromoCodeEntity, amount: number): number {
    const value = Number(promo.discountValue);
    let discount = 0;
    if (promo.type === 'percentage') {
      discount = (amount * value) / 100;
      if (promo.maxDiscountAmount !== null) {
        discount = Math.min(discount, Number(promo.maxDiscountAmount));
      }
    } else if (promo.type === 'fixed_amount') {
      discount = value;
    } else if (promo.type === 'free_nights') {
      // Treat each "free night" as ~1/30th of the total — rough heuristic that
      // matches the user-facing copy ("1 free night") without needing per-booking
      // night math here.
      discount = Math.min(amount, value * (amount / 30));
    }
    return Math.min(amount, Math.max(0, Math.round(discount * 100) / 100));
  }

  private successCopy(promo: PromoCodeEntity, discount: number): string {
    if (promo.type === 'percentage') {
      return `${Number(promo.discountValue)}% off applied — saved ${discount.toFixed(0)} SAR`;
    }
    if (promo.type === 'fixed_amount') {
      return `${Number(promo.discountValue)} SAR off applied`;
    }
    return `${Number(promo.discountValue)} free night${Number(promo.discountValue) > 1 ? 's' : ''} applied`;
  }

  private assertAdmin(actor: RequestUser): void {
    if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.MODERATOR) {
      throw new ForbiddenException('Admins only');
    }
  }
}
