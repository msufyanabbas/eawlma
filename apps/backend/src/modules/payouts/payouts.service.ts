import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NotificationType } from '@eawlma/shared-types';

import { UserEntity } from '../users/entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';

import { PayoutRequestEntity, PayoutStatus } from './entities/payout-request.entity';
import {
  PayoutResponseDto,
  PayoutSummaryDto,
  RejectPayoutDto,
  RequestPayoutDto,
} from './dto/payout.dto';
import { MoyasarDisbursementService } from './moyasar-disbursement.service';

const ALL_STATUSES: PayoutStatus[] = ['pending', 'processing', 'paid', 'failed', 'rejected'];

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    @InjectRepository(PayoutRequestEntity)
    private readonly payouts: Repository<PayoutRequestEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly wallet: WalletService,
    private readonly moyasar: MoyasarDisbursementService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Agent — request a payout
  // ---------------------------------------------------------------------------

  async requestPayout(agentId: string, dto: RequestPayoutDto): Promise<PayoutRequestEntity> {
    if (dto.amount < 100) {
      throw new BadRequestException('Minimum payout is 100 SAR');
    }

    // Lock-and-load the wallet through WalletService so balance + ledger stay
    // consistent with the rest of the platform's accounting.
    const wallet = await this.wallet.getOrCreate(agentId);
    if (Number(wallet.balance) < dto.amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${Number(wallet.balance).toFixed(2)} SAR`,
      );
    }

    const agent = await this.users.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');
    const beneficiaryName = `${agent.firstName ?? ''} ${agent.lastName ?? ''}`.trim() || agent.email;

    // 1. Create the payout row first so the holding debit references something
    //    persistent — the wallet ledger needs a stable referenceId.
    let payout = this.payouts.create({
      agentId,
      walletId: wallet.id,
      amount: dto.amount.toFixed(2),
      ibanNumber: dto.ibanNumber,
      bankName: dto.bankName,
      beneficiaryName,
      status: 'processing',
      requestedAt: new Date(),
    });
    payout = await this.payouts.save(payout);

    // 2. Hold the funds — debit the wallet immediately so the agent can't
    //    request another payout against the same balance while this one is
    //    in flight. WalletService.debit guards against negative balances.
    try {
      await this.wallet.debit({
        userId: agentId,
        amount: dto.amount,
        type: 'withdrawal',
        description: `Payout request ${payout.id}`,
        referenceId: payout.id,
      });
    } catch (err) {
      // Couldn't hold the funds — drop the payout row so we don't leave an
      // orphan record blocking future requests.
      payout.status = 'failed';
      payout.failureReason = (err as Error).message;
      await this.payouts.save(payout);
      throw err;
    }

    // 3. Hand off to Moyasar.
    try {
      const disbursement = await this.moyasar.createDisbursement({
        amount: dto.amount,
        ibanNumber: dto.ibanNumber,
        beneficiaryName,
        description: `Eawlma commission payout - ${payout.id}`,
        reference: payout.id,
      });

      payout.moyasarDisbursementId = disbursement.id;
      if (disbursement.status === 'paid') {
        // Mock mode (or instant settle) — finalise straight away.
        payout.status = 'paid';
        payout.processedAt = new Date();
      } else {
        payout.status = 'processing';
      }
      payout = await this.payouts.save(payout);

      await this.notifications
        .create({
          userId: agentId,
          type: NotificationType.PAYMENT_SUCCEEDED,
          title: 'Payout Initiated',
          body: `Your payout of ${dto.amount.toLocaleString('en-US')} SAR to ${dto.ibanNumber} is being processed.`,
          data: { payoutId: payout.id },
        })
        .catch((notifyErr: Error) =>
          this.logger.warn(`Payout-initiated notification failed: ${notifyErr.message}`),
        );

      return payout;
    } catch (err) {
      // Disbursement call failed — refund the held amount and mark the
      // payout failed. The user is told the wallet has been refunded.
      const reason = (err as Error).message;
      payout.status = 'failed';
      payout.failureReason = reason;
      await this.payouts.save(payout);

      await this.wallet
        .credit({
          userId: agentId,
          amount: dto.amount,
          type: 'refund',
          description: `Payout failed - refund ${payout.id}`,
          referenceId: payout.id,
        })
        .catch((refundErr: Error) =>
          this.logger.error(
            `Failed to refund agent ${agentId} for payout ${payout.id}: ${refundErr.message}`,
          ),
        );

      await this.notifications
        .create({
          userId: agentId,
          type: NotificationType.PAYMENT_FAILED,
          title: 'Payout Failed',
          body: `Your payout of ${dto.amount.toLocaleString('en-US')} SAR failed: ${reason}. The amount has been refunded to your wallet.`,
          data: { payoutId: payout.id, failureReason: reason },
        })
        .catch((notifyErr: Error) =>
          this.logger.warn(`Payout-failed notification failed: ${notifyErr.message}`),
        );

      throw new BadRequestException(
        `Payout failed: ${reason}. Your wallet has been refunded.`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  async listForAgent(agentId: string): Promise<PayoutResponseDto[]> {
    const rows = await this.payouts.find({
      where: { agentId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((p) => PayoutResponseDto.fromEntity(p));
  }

  async listAll(statusFilter?: PayoutStatus): Promise<PayoutResponseDto[]> {
    const rows = await this.payouts.find({
      where: statusFilter ? { status: statusFilter } : {},
      order: { createdAt: 'DESC' },
    });
    if (rows.length === 0) return [];

    const agentIds = Array.from(new Set(rows.map((r) => r.agentId)));
    const users = await this.users.find({
      where: { id: In(agentIds) },
      select: ['id', 'firstName', 'lastName', 'email'],
    });
    const usersById = new Map(users.map((u) => [u.id, u]));

    return rows.map((r) => {
      const u = usersById.get(r.agentId);
      const fullName = u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : null;
      return PayoutResponseDto.fromEntity(r, {
        agentName: fullName || null,
        agentEmail: u?.email ?? null,
      });
    });
  }

  async summary(): Promise<PayoutSummaryDto> {
    const rows = await this.payouts.find();
    const out: PayoutSummaryDto = {
      totalPaid: 0,
      totalProcessing: 0,
      totalFailed: 0,
      countByStatus: ALL_STATUSES.reduce(
        (acc, s) => {
          acc[s] = 0;
          return acc;
        },
        {} as Record<PayoutStatus, number>,
      ),
    };
    for (const r of rows) {
      out.countByStatus[r.status] += 1;
      const amount = Number(r.amount);
      if (r.status === 'paid') out.totalPaid += amount;
      if (r.status === 'processing' || r.status === 'pending') out.totalProcessing += amount;
      if (r.status === 'failed') out.totalFailed += amount;
    }
    out.totalPaid = Math.round(out.totalPaid * 100) / 100;
    out.totalProcessing = Math.round(out.totalProcessing * 100) / 100;
    out.totalFailed = Math.round(out.totalFailed * 100) / 100;
    return out;
  }

  // ---------------------------------------------------------------------------
  // Admin — manual reject
  // ---------------------------------------------------------------------------

  async adminReject(id: string, dto: RejectPayoutDto): Promise<PayoutRequestEntity> {
    const payout = await this.payouts.findOne({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status === 'paid') {
      throw new ForbiddenException('Cannot reject a payout that has already paid out');
    }
    if (payout.status === 'rejected') {
      throw new BadRequestException('Payout is already rejected');
    }

    const wasHoldingFunds = payout.status === 'processing' || payout.status === 'pending';
    payout.status = 'rejected';
    payout.failureReason = dto.reason;
    if (dto.adminNotes !== undefined) payout.adminNotes = dto.adminNotes;
    payout.processedAt = new Date();
    const saved = await this.payouts.save(payout);

    if (wasHoldingFunds) {
      // Refund the held amount.
      await this.wallet
        .credit({
          userId: saved.agentId,
          amount: Number(saved.amount),
          type: 'refund',
          description: `Payout rejected - refund ${saved.id}`,
          referenceId: saved.id,
        })
        .catch((err: Error) =>
          this.logger.error(`Reject refund failed for ${saved.id}: ${err.message}`),
        );
    }

    await this.notifications
      .create({
        userId: saved.agentId,
        type: NotificationType.PAYMENT_FAILED,
        title: 'Payout Rejected',
        body: `Your payout of ${Number(saved.amount).toLocaleString('en-US')} SAR was rejected: ${dto.reason}. ${
          wasHoldingFunds ? 'The amount has been refunded to your wallet.' : ''
        }`,
        data: { payoutId: saved.id, reason: dto.reason },
      })
      .catch((err: Error) =>
        this.logger.warn(`Reject notification failed for ${saved.id}: ${err.message}`),
      );

    return saved;
  }

  // ---------------------------------------------------------------------------
  // Webhook — Moyasar status update
  // ---------------------------------------------------------------------------

  async handleMoyasarWebhook(payload: Record<string, unknown>): Promise<void> {
    const id = String(payload.id ?? '');
    const reference = String(payload.reference ?? '');
    const status = String(payload.status ?? '').toLowerCase();
    const failureReason =
      typeof payload.failure_reason === 'string' ? payload.failure_reason : null;

    let payout: PayoutRequestEntity | null = null;
    if (reference) {
      payout = await this.payouts.findOne({ where: { id: reference } });
    }
    if (!payout && id) {
      payout = await this.payouts.findOne({ where: { moyasarDisbursementId: id } });
    }

    if (!payout) {
      this.logger.warn(`Moyasar webhook ignored — no matching payout (id=${id} ref=${reference})`);
      return;
    }

    if (status === 'paid' && payout.status !== 'paid') {
      payout.status = 'paid';
      payout.processedAt = new Date();
      if (id) payout.moyasarDisbursementId = id;
      await this.payouts.save(payout);

      await this.notifications
        .create({
          userId: payout.agentId,
          type: NotificationType.PAYMENT_SUCCEEDED,
          title: 'Payout Successful 🎉',
          body: `${Number(payout.amount).toLocaleString('en-US')} SAR has been transferred to your bank account.`,
          data: { payoutId: payout.id },
        })
        .catch((err: Error) =>
          this.logger.warn(`Webhook success notification failed: ${err.message}`),
        );
      return;
    }

    if (status === 'failed' && payout.status !== 'failed') {
      payout.status = 'failed';
      payout.failureReason = failureReason ?? 'Transfer failed';
      if (id) payout.moyasarDisbursementId = id;
      await this.payouts.save(payout);

      await this.wallet
        .credit({
          userId: payout.agentId,
          amount: Number(payout.amount),
          type: 'refund',
          description: `Payout failed refund ${payout.id}`,
          referenceId: payout.id,
        })
        .catch((err: Error) =>
          this.logger.error(`Webhook refund failed for ${payout.id}: ${err.message}`),
        );

      await this.notifications
        .create({
          userId: payout.agentId,
          type: NotificationType.PAYMENT_FAILED,
          title: 'Payout Failed',
          body: `Payout of ${Number(payout.amount).toLocaleString('en-US')} SAR failed. The amount has been refunded to your wallet.`,
          data: { payoutId: payout.id, reason: payout.failureReason },
        })
        .catch((err: Error) =>
          this.logger.warn(`Webhook failure notification failed: ${err.message}`),
        );
    }
  }
}
