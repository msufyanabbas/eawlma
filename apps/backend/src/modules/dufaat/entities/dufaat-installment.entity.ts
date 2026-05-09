import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

import { DufaatPlanEntity } from './dufaat-plan.entity';

export type DufaatInstallmentStatus = 'pending' | 'paid' | 'overdue' | 'waived';

@Entity({ name: 'dufaat_installments' })
@Index('idx_dufaat_installments_plan', ['planId'])
@Index('idx_dufaat_installments_status', ['status'])
@Index('idx_dufaat_installments_due', ['dueDate'])
export class DufaatInstallmentEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'plan_id' })
  planId: string;

  @ManyToOne(() => DufaatPlanEntity, (p) => p.installments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: DufaatPlanEntity;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: UserEntity;

  @Column({ type: 'date', name: 'due_date' })
  dueDate: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: string;

  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: DufaatInstallmentStatus;

  @Column({ type: 'varchar', length: 64, name: 'moyasar_payment_id', nullable: true })
  moyasarPaymentId: string | null;
}
