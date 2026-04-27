import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateInquiryDto {
  @ApiProperty()
  @IsUUID('4')
  listingId: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;

  // Required when sender is unauthenticated
  @ApiPropertyOptional({ description: 'Required when not signed in' })
  @IsOptional()
  @IsString()
  @Length(2, 200)
  guestName?: string;

  @ApiPropertyOptional({ description: 'Required when not signed in' })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  guestEmail?: string;

  @ApiPropertyOptional({ description: 'Required when not signed in' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Phone must be a valid E.164 number' })
  guestPhone?: string;

  @ApiPropertyOptional({ enum: ['phone', 'email', 'whatsapp'] })
  @IsOptional()
  @IsIn(['phone', 'email', 'whatsapp'])
  preferredContactMethod?: 'phone' | 'email' | 'whatsapp';
}
