import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { ListingEntity } from '../../listings/entities/listing.entity';
import { UserEntity } from '../../users/entities/user.entity';

export type RentalContractStatus =
  | 'draft'
  | 'pending_signatures'
  | 'active'
  | 'expired'
  | 'cancelled';

@Entity({ name: 'rental_contracts' })
@Index('idx_rental_contracts_listing', ['listingId'])
@Index('idx_rental_contracts_landlord', ['landlordUserId'])
@Index('idx_rental_contracts_tenant', ['tenantUserId'])
@Index('idx_rental_contracts_status', ['status'])
export class RentalContractEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @ManyToOne(() => ListingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: ListingEntity;

  @Column({ type: 'uuid', name: 'agent_id', nullable: true })
  agentId: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent: UserEntity | null;

  @Column({ type: 'uuid', name: 'landlord_user_id' })
  landlordUserId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'landlord_user_id' })
  landlord: UserEntity;

  @Column({ type: 'uuid', name: 'tenant_user_id' })
  tenantUserId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_user_id' })
  tenant: UserEntity;

  @Column({ type: 'varchar', length: 64, name: 'tenant_national_id' })
  tenantNationalId: string;

  @Column({ type: 'varchar', length: 64, name: 'landlord_national_id', nullable: true })
  landlordNationalId: string | null;

  @Column({ type: 'date', name: 'start_date' })
  startDate: string;

  @Column({ type: 'date', name: 'end_date' })
  endDate: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'monthly_rent' })
  monthlyRent: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'annual_rent' })
  annualRent: string;

  @Column({ type: 'varchar', length: 64, name: 'ejar_contract_id', nullable: true })
  ejarContractId: string | null;

  @Column({ type: 'varchar', length: 64, name: 'ejar_contract_number', nullable: true })
  ejarContractNumber: string | null;

  @Column({ type: 'varchar', length: 1024, name: 'ejar_url', nullable: true })
  ejarUrl: string | null;

  @Column({ type: 'varchar', length: 32, default: 'draft' })
  status: RentalContractStatus;
}
