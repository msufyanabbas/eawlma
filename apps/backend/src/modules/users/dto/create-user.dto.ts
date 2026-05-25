import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '@eawlma/shared-types';

export class CreateUserDto {
  @ApiPropertyOptional({ example: 'fatima@example.com' })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiPropertyOptional({ example: '+966501234567', description: 'E.164 phone number' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Phone must be a valid E.164 number' })
  phone?: string;

  @ApiPropertyOptional({ example: 'StrongPassw0rd!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt/argon practical upper bound
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one lowercase letter, one uppercase letter, and one digit',
  })
  password?: string;

  @ApiPropertyOptional({ example: 'Fatima' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Al-Saud' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: 'ar', description: 'Preferred locale (ar | en)' })
  @IsOptional()
  @IsString()
  @Length(2, 8)
  preferredLocale?: string;
}
