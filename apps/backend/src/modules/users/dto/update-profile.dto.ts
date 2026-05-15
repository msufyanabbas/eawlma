import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'E.164 phone number' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Phone must be a valid E.164 number' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  // Permissive HTTP(S) check — class-validator's @IsUrl() rejects hosts that
  // lack a TLD (e.g. http://192.168.1.125:3010/...) which is exactly the shape the
  // dev S3 stub returns. We only need to guarantee the value is a string with
  // an http/https protocol; the upload service already controls the URL.
  @Matches(/^https?:\/\/.+/i, { message: 'avatarUrl must be a URL address' })
  @MaxLength(1024)
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 8)
  preferredLocale?: string;

  @ApiPropertyOptional({
    description: 'Per-user notification preference map. Missing keys are treated as opted-in.',
    example: { emailOnInquiry: true, emailOnMessage: false, pushNotifications: true },
  })
  @IsOptional()
  @IsObject()
  notificationPreferences?: Record<string, boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  agencyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  licenseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  registrationNumber?: string;
}
