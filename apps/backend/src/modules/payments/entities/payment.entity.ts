import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { PaymentPurpose, PaymentStatus } from '@eawlma/shared-types';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'payments' })
@Index('idx_payments_user', ['userId'])
@Index('idx_payments_status', ['status'])
@Index('idx_payments_provider_id', ['providerPaymentId'])
@Index('idx_payments_purpose', ['purpose'])
export class PaymentEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  /** Amount in halalas (smallest currency unit). 100 halalas = 1 SAR. */
  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'SAR' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.INITIATED })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentPurpose })
  purpose: PaymentPurpose;

  @Column({ type: 'varchar', length: 32, default: 'moyasar' })
  provider: string;

  @Column({ type: 'varchar', length: 128, name: 'provider_payment_id', nullable: true })
  providerPaymentId: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @Column({ type: 'text', name: 'failure_message', nullable: true })
  failureMessage: string | null;

  @Column({ type: 'integer', name: 'refunded_amount', default: 0 })
  refundedAmount: number;

  @Column({ type: 'jsonb', name: 'provider_payload', default: () => "'{}'::jsonb" })
  providerPayload: Record<string, unknown>;
}
