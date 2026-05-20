import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * A single emailed login code. Rows are created by `OtpService.sendOtp` and
 * consumed (marked `usedAt`) by `verifyOtp`. Not a `BaseEntity` — these are
 * ephemeral and have no soft-delete / versioning needs.
 */
@Entity('email_otps')
export class EmailOtpEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Index('idx_email_otps_email')
  @Column({ length: 320 })
  email: string;

  @Column({ length: 6 })
  otp: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;
}
