import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { ListingStatus, UserRole } from '@eawlma/shared-types';

import { ListingEntity } from '../listings/entities/listing.entity';
import { UserEntity } from '../users/entities/user.entity';
import { InquiryEntity } from '../inquiries/entities/inquiry.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { CommissionEntity } from '../commissions/entities/commission.entity';
import { WalletTransactionEntity } from '../wallet/entities/wallet-transaction.entity';
import { RequestUser } from '../../common/decorators/current-user.decorator';

export interface AdminDashboardStats {
  totalUsers: number;
  totalAgents: number;
  totalListings: number;
  activeListings: number;
  totalInquiries: number;
  totalBookings: number;
  totalRevenue: number;
  pendingModeration: number;
  openDisputes: number;
  platformEarnings: number;
  newUsersThisMonth: number;
}

/**
 * Pulls live KPIs for the admin dashboard. Each count/sum is fired in parallel
 * to keep the page snappy — at this scale none of these queries should fan
 * out beyond a single index lookup.
 */
@Injectable()
export class AdminStatsService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(InquiryEntity)
    private readonly inquiries: Repository<InquiryEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(CommissionEntity)
    private readonly commissions: Repository<CommissionEntity>,
    @InjectRepository(WalletTransactionEntity)
    private readonly walletTx: Repository<WalletTransactionEntity>,
  ) {}

  async dashboard(actor: RequestUser): Promise<AdminDashboardStats> {
    if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.MODERATOR) {
      throw new ForbiddenException('Admins only');
    }

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalAgents,
      totalListings,
      activeListings,
      totalInquiries,
      totalBookings,
      revenueRow,
      pendingModeration,
      openDisputes,
      platformEarningsRow,
      newUsersThisMonth,
    ] = await Promise.all([
      this.users.count(),
      this.users.count({
        where: { role: In([UserRole.AGENT, UserRole.AGENCY_ADMIN]) },
      }),
      this.listings.count(),
      this.listings.count({ where: { status: ListingStatus.ACTIVE } }),
      this.inquiries.count(),
      this.bookings.count(),
      this.walletTx
        .createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'total')
        .where("t.type = 'commission_payment'")
        .getRawOne<{ total: string }>(),
      this.listings.count({ where: { status: ListingStatus.PENDING_REVIEW } }),
      this.inquiries.count({ where: { dealStatus: 'disputed' } }),
      this.commissions
        .createQueryBuilder('c')
        .select('COALESCE(SUM(c.platform_commission_amount), 0)', 'total')
        .where("c.status = 'paid'")
        .getRawOne<{ total: string }>(),
      this.users.count({ where: { createdAt: MoreThan(thisMonth) } }),
    ]);

    return {
      totalUsers,
      totalAgents,
      totalListings,
      activeListings,
      totalInquiries,
      totalBookings,
      totalRevenue: Number(revenueRow?.total ?? 0),
      pendingModeration,
      openDisputes,
      platformEarnings: Number(platformEarningsRow?.total ?? 0),
      newUsersThisMonth,
    };
  }
}
