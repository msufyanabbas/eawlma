import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '@eawlma/shared-types';

// Self-registration is allowed only for these roles. ADMIN / MODERATOR /
// AGENCY_ADMIN must be granted by an existing admin via the users module.
const SELF_REGISTRABLE_ROLES = [UserRole.USER, UserRole.AGENT] as const;

export class RegisterDto {
  @ApiProperty({ example: 'fatima@example.com' })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({ example: '+966501234567' })
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Phone must be a valid E.164 number' })
  phone: string;

  @ApiProperty({ example: 'StrongPassw0rd!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one lowercase letter, one uppercase letter, and one digit',
  })
  password: string;

  @ApiProperty({ example: 'Fatima' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  firstName: string;

  @ApiProperty({ example: 'Al-Saud' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  lastName: string;

  @ApiPropertyOptional({
    enum: SELF_REGISTRABLE_ROLES,
    default: UserRole.USER,
    description: 'Role to register as. Only "user" and "agent" can self-register; admin/moderator/agency_admin are assigned by an existing admin.',
  })
  @IsOptional()
  @IsIn(SELF_REGISTRABLE_ROLES as readonly UserRole[])
  role?: UserRole;

  @ApiPropertyOptional({ example: 'ar' })
  @IsOptional()
  @IsString()
  @Length(2, 8)
  preferredLocale?: string;
}
