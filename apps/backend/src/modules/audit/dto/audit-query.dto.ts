import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class AuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Entity type, e.g. "listing"' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  entityId?: string;

  @ApiPropertyOptional({ description: 'create | update | delete | login | …' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  actorId?: string;

  @ApiPropertyOptional({ description: 'Free-text search across action / entity / changes' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
