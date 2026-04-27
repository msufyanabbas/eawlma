import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { UserRole, UserStatus } from '@aqarat/shared-types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ApproveListingDto {
  @ApiPropertyOptional({ description: 'Optional internal note attached to the moderation log' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNote?: string;
}

export class RejectListingDto {
  @ApiProperty({
    description: 'User-visible reason explaining the rejection. Sent to the agent via email + in-app notification.',
    minLength: 5,
    maxLength: 2000,
  })
  @IsString()
  @Length(5, 2000)
  reason: string;

  @ApiPropertyOptional({ description: 'Internal moderator-only note (not shown to the agent)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNote?: string;
}

export class AdminUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across email/name/phone' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class AdminUpdateRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}

export class AdminSuspendUserDto {
  @ApiProperty({ description: 'Reason for suspension; logged to audit trail' })
  @IsString()
  @Length(5, 500)
  reason: string;
}
