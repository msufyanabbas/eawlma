import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { UserRole, UserStatus } from '@eawlma/shared-types';

import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const ARGON_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  // ---------------------------------------------------------------------------
  // Creation / lookup
  // ---------------------------------------------------------------------------

  async create(dto: CreateUserDto): Promise<UserEntity> {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();

    const existing = await this.users.findOne({
      where: [{ email }, { phone }],
    });
    if (existing) {
      if (existing.email === email) {
        throw new ConflictException('An account with this email already exists');
      }
      throw new ConflictException('An account with this phone number already exists');
    }

    const passwordHash = await argon2.hash(dto.password, ARGON_OPTIONS);

    const user = this.users.create({
      email,
      phone,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      passwordHash,
      role: dto.role ?? UserRole.USER,
      status: UserStatus.ACTIVE,
      preferredLocale: dto.preferredLocale ?? 'ar',
    });

    const saved = await this.users.save(user);
    this.logger.log(`Created user ${saved.id} (${saved.email})`);
    return saved;
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  findByEmailWithPassword(email: string): Promise<UserEntity | null> {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  // ---------------------------------------------------------------------------
  // Listing / search (admin)
  // ---------------------------------------------------------------------------

  async paginate(
    page: number,
    limit: number,
    filter: { search?: string; role?: UserRole; status?: UserStatus } = {},
  ): Promise<PaginatedResultDto<UserEntity>> {
    const where: FindOptionsWhere<UserEntity> | FindOptionsWhere<UserEntity>[] = filter.search
      ? [
          { email: ILike(`%${filter.search}%`), role: filter.role, status: filter.status },
          { firstName: ILike(`%${filter.search}%`), role: filter.role, status: filter.status },
          { lastName: ILike(`%${filter.search}%`), role: filter.role, status: filter.status },
          { phone: ILike(`%${filter.search}%`), role: filter.role, status: filter.status },
        ]
      : { role: filter.role, status: filter.status };

    const [data, total] = await this.users.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return new PaginatedResultDto(data, total, page, limit);
  }

  // ---------------------------------------------------------------------------
  // Updates
  // ---------------------------------------------------------------------------

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserEntity> {
    const user = await this.findByIdOrFail(userId);

    if (dto.phone && dto.phone !== user.phone) {
      const existing = await this.users.findOne({ where: { phone: dto.phone } });
      if (existing && existing.id !== user.id) {
        throw new ConflictException('Phone number already in use by another account');
      }
      user.phone = dto.phone;
      user.phoneVerified = false; // re-verify when phone changes
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) user.lastName = dto.lastName.trim();
    if (dto.bio !== undefined) user.bio = dto.bio;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.preferredLocale !== undefined) user.preferredLocale = dto.preferredLocale;
    if (dto.notificationPreferences !== undefined) {
      // Merge — preserve any keys we don't have a UI toggle for yet.
      user.notificationPreferences = { ...(user.notificationPreferences ?? {}), ...dto.notificationPreferences };
    }
    if (dto.agencyName !== undefined) user.agencyName = dto.agencyName.trim() || null;
    if (dto.licenseNumber !== undefined) user.licenseNumber = dto.licenseNumber.trim() || null;
    if (dto.registrationNumber !== undefined) user.registrationNumber = dto.registrationNumber.trim() || null;

    return this.users.save(user);
  }

  async updateStatus(userId: string, status: UserStatus): Promise<UserEntity> {
    const user = await this.findByIdOrFail(userId);
    user.status = status;
    return this.users.save(user);
  }

  async updateRole(userId: string, role: UserRole): Promise<UserEntity> {
    const user = await this.findByIdOrFail(userId);
    user.role = role;
    return this.users.save(user);
  }

  async setEmailVerified(userId: string, verified = true): Promise<void> {
    await this.users.update({ id: userId }, { emailVerified: verified });
  }

  async setPhoneVerified(userId: string, verified = true): Promise<void> {
    await this.users.update({ id: userId }, { phoneVerified: verified });
  }

  async recordSuccessfulLogin(userId: string, ip: string | null): Promise<void> {
    await this.users.update(
      { id: userId },
      {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    );
  }

  async recordFailedLogin(userId: string): Promise<UserEntity> {
    const user = await this.findByIdOrFail(userId);
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
    }
    return this.users.save(user);
  }

  // ---------------------------------------------------------------------------
  // Password
  // ---------------------------------------------------------------------------

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  async setPassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await argon2.hash(newPassword, ARGON_OPTIONS);
    await this.users.update({ id: userId }, { passwordHash });
  }

  // ---------------------------------------------------------------------------
  // Nafath SSO
  // ---------------------------------------------------------------------------

  findByNafathNationalId(nationalId: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { nafathNationalId: nationalId } });
  }

  findByPhone(phone: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { phone: phone.trim() } });
  }

  async createFromNafath(input: {
    nationalId: string;
    fullNameAr: string;
    fullNameEn: string;
    phone: string;
  }): Promise<UserEntity> {
    // Split a single full name on whitespace; first token = firstName,
    // remainder = lastName. Falls back to the AR form if EN missing.
    const fullName = (input.fullNameEn || input.fullNameAr || '').trim();
    const [firstName = 'User', ...rest] = fullName.split(/\s+/);
    const lastName = rest.join(' ') || 'Nafath';

    // Generate a placeholder email so the schema's NOT NULL constraint is
    // satisfied. The user can update this later in Settings.
    const synthetic = `nafath-${input.nationalId}@nafath.local`;

    // Argon2 hash of a random secret — the user logs in via Nafath, never
    // via password, but we keep the column populated.
    const placeholderPasswordHash = await argon2.hash(
      `nafath-${input.nationalId}-${Date.now()}-${Math.random()}`,
      ARGON_OPTIONS,
    );

    const user = this.users.create({
      email: synthetic,
      phone: input.phone,
      firstName,
      lastName,
      passwordHash: placeholderPasswordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      preferredLocale: 'ar',
      nafathNationalId: input.nationalId,
      isNafathVerified: true,
      phoneVerified: true,
    });
    return this.users.save(user);
  }

  async markNafathVerified(userId: string, nationalId: string): Promise<void> {
    await this.users.update(
      { id: userId },
      { nafathNationalId: nationalId, isNafathVerified: true, phoneVerified: true },
    );
  }

  // ---------------------------------------------------------------------------
  // Deletion (soft)
  // ---------------------------------------------------------------------------

  async softDelete(userId: string): Promise<void> {
    await this.users.softDelete({ id: userId });
  }
}
