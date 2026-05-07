import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity({ name: 'wallets' })
@Index('idx_wallets_user', ['userId'], { unique: true })
export class WalletEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  balance: string;

  @Column({ type: 'varchar', length: 8, default: 'SAR' })
  currency: string;
}
