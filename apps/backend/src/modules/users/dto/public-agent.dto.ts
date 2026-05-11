import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserEntity } from '../entities/user.entity';

/**
 * Public agent profile — only fields safe to expose on the public-facing
 * AgentProfilePage. Email + phone are deliberately omitted; reach-out goes
 * through the inquiry/messaging flow which forwards via the agent's
 * preferred channel.
 */
export class PublicAgentDto {
  @ApiProperty() id: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() role: string;
  @ApiPropertyOptional({ nullable: true }) avatarUrl: string | null;
  @ApiPropertyOptional({ nullable: true }) bio: string | null;
  @ApiProperty() preferredLocale: string;
  @ApiProperty() identityVerified: boolean;
  @ApiPropertyOptional({ nullable: true }) agencyId: string | null;
  @ApiProperty({ type: String }) memberSince: Date;

  // Host stats — surfaced on the agent card and listing detail.
  @ApiPropertyOptional({ nullable: true }) responseRate: number | null;
  @ApiPropertyOptional({ nullable: true }) responseTime: string | null;
  @ApiProperty() isSuperhost: boolean;
  @ApiProperty() totalCompletedBookings: number;

  static fromEntity(u: UserEntity): PublicAgentDto {
    const dto = new PublicAgentDto();
    dto.id = u.id;
    dto.firstName = u.firstName;
    dto.lastName = u.lastName;
    dto.role = u.role;
    dto.avatarUrl = u.avatarUrl;
    dto.bio = u.bio;
    dto.preferredLocale = u.preferredLocale;
    dto.identityVerified = u.identityVerificationStatus === 'verified';
    dto.agencyId = u.agencyId;
    dto.memberSince = u.createdAt;
    dto.responseRate = u.responseRate !== null && u.responseRate !== undefined
      ? Number(u.responseRate)
      : null;
    dto.responseTime = u.responseTime ?? null;
    dto.isSuperhost = !!u.isSuperhost;
    dto.totalCompletedBookings = u.totalCompletedBookings ?? 0;
    return dto;
  }
}
