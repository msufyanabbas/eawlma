import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { WalletEntity } from './entities/wallet.entity';
import {
  WalletTransactionEntity,
  WalletTxnStatus,
  WalletTxnType,
} from './entities/wallet-transaction.entity';
import { CommissionEntity } from '../commissions/entities/commission.entity';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';

interface CreditOptions {
  userId: string;
  amount: number;
  type: WalletTxnType;
  description?: string;
  referenceId?: string;
  status?: WalletTxnStatus;
}

interface DebitOptions extends CreditOptions {
  /**
   * Allow the resulting balance to dip below zero. Used for pending platform
   * fees while we wait for the buyer's deposit to clear.
   */
  allowNegative?: boolean;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(WalletEntity)
    private readonly wallets: Repository<WalletEntity>,
    @InjectRepository(WalletTransactionEntity)
    private readonly transactions: Repository<WalletTransactionEntity>,
    @InjectRepository(CommissionEntity)
    private readonly commissions: Repository<CommissionEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  async getOrCreate(userId: string): Promise<WalletEntity> {
    let wallet = await this.wallets.findOne({ where: { userId } });
    if (!wallet) {
      wallet = this.wallets.create({ userId, balance: '0.00', currency: 'SAR' });
      wallet = await this.wallets.save(wallet);
    }
    return wallet;
  }

  async listTransactions(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResultDto<WalletTransactionEntity>> {
    const wallet = await this.getOrCreate(userId);
    const [data, total] = await this.transactions.findAndCount({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return new PaginatedResultDto(data, total, page, limit);
  }

  async recentTransactions(userId: string, limit = 10): Promise<WalletTransactionEntity[]> {
    const wallet = await this.getOrCreate(userId);
    return this.transactions.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ---------------------------------------------------------------------------
  // Write — credit / debit are wrapped in a single transaction so the wallet
  // balance and the ledger row can never disagree.
  // ---------------------------------------------------------------------------

  async credit(opts: CreditOptions): Promise<WalletTransactionEntity> {
    if (opts.amount <= 0) throw new BadRequestException('amount must be > 0');
    return this.dataSource.transaction(async (manager) => {
      const wallets = manager.getRepository(WalletEntity);
      const txns = manager.getRepository(WalletTransactionEntity);

      // SELECT … FOR UPDATE so concurrent writers serialise behind us.
      let wallet = await wallets
        .createQueryBuilder('w')
        .where('w.user_id = :userId', { userId: opts.userId })
        .setLock('pessimistic_write')
        .getOne();
      if (!wallet) {
        wallet = wallets.create({ userId: opts.userId, balance: '0.00', currency: 'SAR' });
        wallet = await wallets.save(wallet);
      }

      const before = Number(wallet.balance);
      const after = before + opts.amount;
      wallet.balance = after.toFixed(2);
      await wallets.save(wallet);

      const txn = txns.create({
        walletId: wallet.id,
        type: opts.type,
        amount: opts.amount.toFixed(2),
        balanceBefore: before.toFixed(2),
        balanceAfter: after.toFixed(2),
        description: opts.description ?? null,
        referenceId: opts.referenceId ?? null,
        status: opts.status ?? 'completed',
      });
      return txns.save(txn);
    });
  }

  async debit(opts: DebitOptions): Promise<WalletTransactionEntity> {
    if (opts.amount <= 0) throw new BadRequestException('amount must be > 0');
    return this.dataSource.transaction(async (manager) => {
      const wallets = manager.getRepository(WalletEntity);
      const txns = manager.getRepository(WalletTransactionEntity);

      const wallet = await wallets
        .createQueryBuilder('w')
        .where('w.user_id = :userId', { userId: opts.userId })
        .setLock('pessimistic_write')
        .getOne();
      if (!wallet) throw new NotFoundException('Wallet not found');

      const before = Number(wallet.balance);
      const after = before - opts.amount;
      if (!opts.allowNegative && after < 0) {
        throw new BadRequestException('Insufficient wallet balance');
      }
      wallet.balance = after.toFixed(2);
      await wallets.save(wallet);

      const txn = txns.create({
        walletId: wallet.id,
        type: opts.type,
        amount: opts.amount.toFixed(2),
        balanceBefore: before.toFixed(2),
        balanceAfter: after.toFixed(2),
        description: opts.description ?? null,
        referenceId: opts.referenceId ?? null,
        status: opts.status ?? 'completed',
      });
      return txns.save(txn);
    });
  }

  // ---------------------------------------------------------------------------
  // High-level operations exposed via the controller
  // ---------------------------------------------------------------------------

  /**
   * Deposit funds (Moyasar success webhook should call this; the manual dev
   * endpoint also exists so we can top up balances without the provider).
   */
  async deposit(
    userId: string,
    amount: number,
    description?: string,
    referenceId?: string,
  ): Promise<WalletTransactionEntity> {
    return this.credit({
      userId,
      amount,
      type: 'deposit',
      description: description ?? `Wallet deposit (${amount.toFixed(2)} SAR)`,
      referenceId,
    });
  }

  /**
   * Pay a confirmed commission. Debits the buyer's (or paying user's) wallet
   * and credits the agent's wallet. The platform fee row stays as a separate
   * platform-revenue ledger entry.
   */
  async payCommission(
    payerUserId: string,
    commissionId: string,
  ): Promise<{
    payerTransaction: WalletTransactionEntity;
    agentTransaction: WalletTransactionEntity;
  }> {
    const commission = await this.commissions.findOne({ where: { id: commissionId } });
    if (!commission) throw new NotFoundException('Commission not found');
    if (commission.status === 'paid') {
      throw new BadRequestException('Commission already paid');
    }
    if (commission.status !== 'confirmed') {
      throw new BadRequestException('Commission must be confirmed before payment');
    }

    const agentAmount = Number(commission.agentCommissionAmount);
    const platformAmount = Number(commission.platformCommissionAmount);
    const total = agentAmount + platformAmount;

    const payerTransaction = await this.debit({
      userId: payerUserId,
      amount: total,
      type: 'commission_payment',
      description: `Commission payment for listing ${commission.listingId}`,
      referenceId: commissionId,
    });

    let agentTransaction: WalletTransactionEntity;
    try {
      agentTransaction = await this.credit({
        userId: commission.agentId,
        amount: agentAmount,
        type: 'commission_received',
        description: `Commission received for listing ${commission.listingId}`,
        referenceId: commissionId,
      });
    } catch (err) {
      // Roll back the debit so the buyer doesn't lose funds when the agent
      // credit fails. Best-effort — surface the original error so the caller
      // sees the real cause.
      await this.credit({
        userId: payerUserId,
        amount: total,
        type: 'refund',
        description: `Refund — agent credit failed for ${commissionId}`,
        referenceId: commissionId,
      }).catch((rollbackErr) =>
        this.logger.error(
          `Rollback credit failed for commission ${commissionId}: ${(rollbackErr as Error).message}`,
        ),
      );
      throw err;
    }

    commission.status = 'paid';
    await this.commissions.save(commission);

    return { payerTransaction, agentTransaction };
  }
}
