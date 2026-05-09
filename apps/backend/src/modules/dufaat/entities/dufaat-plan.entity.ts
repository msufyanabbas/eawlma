import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { RentalContractEntity } from '../../ejar/entities/rental-contract.entity';
import { UserEntity } from '../../users/entities/user.entity';

import { DufaatInstallmentEntity } from './dufaat-installment.entity';

export type DufaatPlanStatus = 'active' | 'completed' | 'defaulted' | 'cancelled';

@Entity({ name: 'dufaat_plans' })
@Index('idx_dufaat_plans_tenant', ['tenantId'])
@Index('idx_dufaat_plans_status', ['status'])
export class DufaatPlanEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'rental_contract_id' })
  rentalContractId: string;

  @ManyToOne(() => RentalContractEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rental_contract_id' })
  rentalContract: RentalContractEntity;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: UserEntity;

  @Column({ type: 'uuid', name: 'landlord_id' })
  landlordId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'landlord_id' })
  landlord: UserEntity;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'total_annual_amount' })
  totalAnnualAmount: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'monthly_installment' })
  monthlyInstallment: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'platform_fee_rate', default: 2 })
  platformFeeRate: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'platform_fee' })
  platformFee: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: DufaatPlanStatus;

  @Column({ type: 'date', name: 'start_date' })
  startDate: string;

  @Column({ type: 'date', name: 'end_date' })
  endDate: string;

  @OneToMany(() => DufaatInstallmentEntity, (i) => i.plan, { cascade: true })
  installments: DufaatInstallmentEntity[];
}
