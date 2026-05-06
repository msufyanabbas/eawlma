import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export type CommissionStatus = 'pending' | 'confirmed' | 'paid' | 'disputed';

@Entity({ name: 'commissions' })
@Index('idx_commissions_agent', ['agentId'])
@Index('idx_commissions_status', ['status'])
export class CommissionEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  /** Agent who earned the commission. */
  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  /** Buyer who completed the transaction (nullable while pending). */
  @Column({ type: 'uuid', name: 'buyer_id', nullable: true })
  buyerId: string | null;

  /** Sale price (in SAR) used as the commission base. */
  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'transaction_value' })
  transactionValue: string;

  /** Agent's percentage cut (e.g. 2.5 = 2.5%). */
  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'agent_commission_rate', default: 2.5 })
  agentCommissionRate: string;

  /** Platform's percentage cut (e.g. 0.5 = 0.5%). */
  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'platform_commission_rate', default: 0.5 })
  platformCommissionRate: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'agent_commission_amount' })
  agentCommissionAmount: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'platform_commission_amount' })
  platformCommissionAmount: string;

  @Column({
    type: 'varchar',
    length: 16,
    default: 'pending',
  })
  status: CommissionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
