import {
  Column,
  Entity,
  Index,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole, UserStatus, VerificationStatus } from '@eawlma/shared-types';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RefreshTokenEntity } from '../../auth/entities/refresh-token.entity';

@Entity({ name: 'users' })
@Index('uq_users_email', ['email'], { unique: true, where: '"deleted_at" IS NULL' })
@Index('uq_users_phone', ['phone'], { unique: true, where: '"deleted_at" IS NULL' })
export class UserEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName: string;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Column({ type: 'varchar', length: 1024, name: 'avatar_url', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 8, name: 'preferred_locale', default: 'ar' })
  preferredLocale: string;

  @Column({ type: 'boolean', name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ type: 'boolean', name: 'phone_verified', default: false })
  phoneVerified: boolean;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    name: 'identity_verification_status',
    default: VerificationStatus.UNVERIFIED,
  })
  identityVerificationStatus: VerificationStatus;

  @Column({ type: 'varchar', length: 64, name: 'national_id', nullable: true })
  nationalId: string | null;

  @Column({ type: 'uuid', name: 'agency_id', nullable: true })
  agencyId: string | null;

  /** Agency / brokerage the agent belongs to. Free-text for now — will be
   *  promoted to a foreign key into the upcoming `agencies` table later. */
  @Column({ type: 'varchar', length: 200, name: 'agency_name', nullable: true })
  agencyName: string | null;

  /** REGA broker licence number (e.g. 1100012345). Editable by the agent
   *  themselves; admin verification of the licence is a separate workflow. */
  @Column({ type: 'varchar', length: 64, name: 'license_number', nullable: true })
  licenseNumber: string | null;

  /** Saudi commercial registration number (CR / السجل التجاري). */
  @Column({ type: 'varchar', length: 64, name: 'registration_number', nullable: true })
  registrationNumber: string | null;

  @Column({ type: 'timestamptz', name: 'last_login_at', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'inet', name: 'last_login_ip', nullable: true })
  lastLoginIp: string | null;

  @Column({ type: 'integer', name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamptz', name: 'locked_until', nullable: true })
  lockedUntil: Date | null;

  /**
   * Per-user notification preference map. Keys are NotificationType values
   * (or shorthand keys like `emailOnInquiry`). A missing key is treated as
   * opted-in (default true) for backwards compat.
   */
  @Column({ type: 'jsonb', name: 'notification_preferences', nullable: true })
  notificationPreferences: Record<string, boolean> | null;

  @OneToMany(() => RefreshTokenEntity, (rt) => rt.user)
  refreshTokens: RefreshTokenEntity[];

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
