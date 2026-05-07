import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export type PayoutStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'rejected';

@Entity({ name: 'payout_requests' })
@Index('idx_payouts_agent', ['agentId'])
@Index('idx_payouts_status', ['status'])
@Index('idx_payouts_moyasar', ['moyasarDisbursementId'])
export class PayoutRequestEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @Column({ type: 'uuid', name: 'wallet_id' })
  walletId: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: string;

  /** Saudi IBAN — `SA` + 22 digits, 24 chars total. */
  @Column({ type: 'varchar', length: 34, name: 'iban_number' })
  ibanNumber: string;

  @Column({ type: 'varchar', length: 100, name: 'bank_name' })
  bankName: string;

  @Column({ type: 'varchar', length: 200, name: 'beneficiary_name' })
  beneficiaryName: string;

  /** Disbursement ID returned by Moyasar (null until the API call succeeds). */
  @Column({ type: 'varchar', length: 64, name: 'moyasar_disbursement_id', nullable: true })
  moyasarDisbursementId: string | null;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: PayoutStatus;

  @Column({ type: 'text', name: 'failure_reason', nullable: true })
  failureReason: string | null;

  @Column({ type: 'text', name: 'admin_notes', nullable: true })
  adminNotes: string | null;

  @Column({ type: 'timestamptz', name: 'requested_at', default: () => 'now()' })
  requestedAt: Date;

  @Column({ type: 'timestamptz', name: 'processed_at', nullable: true })
  processedAt: Date | null;
}
