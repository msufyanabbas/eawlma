import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export type WalletTxnType =
  | 'deposit'
  | 'withdrawal'
  | 'commission_payment'
  | 'commission_received'
  | 'refund';

export type WalletTxnStatus = 'pending' | 'completed' | 'failed';

@Entity({ name: 'wallet_transactions' })
@Index('idx_wallet_txn_wallet', ['walletId'])
@Index('idx_wallet_txn_status', ['status'])
@Index('idx_wallet_txn_reference', ['referenceId'])
export class WalletTransactionEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'wallet_id' })
  walletId: string;

  @Column({ type: 'varchar', length: 24 })
  type: WalletTxnType;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'balance_before' })
  balanceBefore: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'balance_after' })
  balanceAfter: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 64, name: 'reference_id', nullable: true })
  referenceId: string | null;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: WalletTxnStatus;
}
