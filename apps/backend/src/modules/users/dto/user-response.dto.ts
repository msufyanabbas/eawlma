import { ApiProperty } from '@nestjs/swagger';
import { Expose, Exclude } from 'class-transformer';
import { UserRole, UserStatus, VerificationStatus } from '@eawlma/shared-types';
import { UserEntity } from '../entities/user.entity';

@Exclude()
export class UserResponseDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() email: string;
  @Expose() @ApiProperty() phone: string;
  @Expose() @ApiProperty() firstName: string;
  @Expose() @ApiProperty() lastName: string;
  @Expose() @ApiProperty({ enum: UserRole }) role: UserRole;
  @Expose() @ApiProperty({ enum: UserStatus }) status: UserStatus;
  @Expose() @ApiProperty({ nullable: true }) avatarUrl: string | null;
  @Expose() @ApiProperty({ nullable: true }) bio: string | null;
  @Expose() @ApiProperty() preferredLocale: string;
  @Expose() @ApiProperty() emailVerified: boolean;
  @Expose() @ApiProperty() phoneVerified: boolean;
  @Expose() @ApiProperty({ enum: VerificationStatus }) identityVerificationStatus: VerificationStatus;
  @Expose() @ApiProperty({ nullable: true }) agencyId: string | null;
  @Expose() @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'boolean' },
    nullable: true,
    example: { emailOnInquiry: true, emailOnMessage: false, pushNotifications: true },
  })
  notificationPreferences: Record<string, boolean> | null;
  @Expose() @ApiProperty({ type: String }) createdAt: Date;
  @Expose() @ApiProperty({ type: String }) updatedAt: Date;
  @Expose() @ApiProperty({ type: String, nullable: true }) lastLoginAt: Date | null;

  static fromEntity(user: UserEntity): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.phone = user.phone;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.role = user.role;
    dto.status = user.status;
    dto.avatarUrl = user.avatarUrl;
    dto.bio = user.bio;
    dto.preferredLocale = user.preferredLocale;
    dto.emailVerified = user.emailVerified;
    dto.phoneVerified = user.phoneVerified;
    dto.identityVerificationStatus = user.identityVerificationStatus;
    dto.agencyId = user.agencyId;
    dto.notificationPreferences = user.notificationPreferences;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    dto.lastLoginAt = user.lastLoginAt;
    return dto;
  }
}
