import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  PropertyRequestEntity,
  PropertyRequestStatus,
} from '../entities/property-request.entity';

export class CreatePropertyRequestDto {
  @ApiProperty({ example: 'apartment' })
  @IsString()
  @Length(1, 32)
  propertyType: string;

  @ApiProperty({ example: 'Riyadh' })
  @IsString()
  @Length(1, 120)
  city: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minBudget?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxBudget?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  bedrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiProperty({ example: '+9665xxxxxxxx' })
  @IsString()
  @Length(5, 32)
  contactPhone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  contactEmail?: string;
}

export class PropertyRequestResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true }) userId: string | null;
  @ApiProperty() propertyType: string;
  @ApiProperty() city: string;
  @ApiPropertyOptional({ nullable: true }) minBudget: number | null;
  @ApiPropertyOptional({ nullable: true }) maxBudget: number | null;
  @ApiPropertyOptional({ nullable: true }) bedrooms: number | null;
  @ApiPropertyOptional({ nullable: true }) message: string | null;
  @ApiProperty() contactPhone: string;
  @ApiPropertyOptional({ nullable: true }) contactEmail: string | null;
  @ApiProperty() status: PropertyRequestStatus;
  @ApiProperty({ type: String }) createdAt: Date;
  @ApiProperty({ type: String }) updatedAt: Date;

  static fromEntity(p: PropertyRequestEntity): PropertyRequestResponseDto {
    const dto = new PropertyRequestResponseDto();
    dto.id = p.id;
    dto.userId = p.userId;
    dto.propertyType = p.propertyType;
    dto.city = p.city;
    dto.minBudget = p.minBudget != null ? Number(p.minBudget) : null;
    dto.maxBudget = p.maxBudget != null ? Number(p.maxBudget) : null;
    dto.bedrooms = p.bedrooms;
    dto.message = p.message;
    dto.contactPhone = p.contactPhone;
    dto.contactEmail = p.contactEmail;
    dto.status = p.status;
    dto.createdAt = p.createdAt;
    dto.updatedAt = p.updatedAt;
    return dto;
  }
}
