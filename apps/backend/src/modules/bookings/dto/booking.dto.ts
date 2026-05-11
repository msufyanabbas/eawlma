import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { BookingEntity, BookingStatus } from '../entities/booking.entity';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  listingId: string;

  @ApiProperty({ example: '2025-08-10' })
  @IsDateString()
  checkIn: string;

  @ApiProperty({ example: '2025-08-15' })
  @IsDateString()
  checkOut: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  numGuests?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class BookingResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() listingId: string;
  @ApiProperty() guestId: string;
  @ApiProperty() hostId: string;
  @ApiProperty() checkIn: string;
  @ApiProperty() checkOut: string;
  @ApiProperty() nights: number;
  @ApiProperty() numGuests: number;
  @ApiProperty() totalAmount: number;
  @ApiProperty() status: BookingStatus;
  @ApiPropertyOptional({ nullable: true }) notes: string | null;
  @ApiPropertyOptional({ nullable: true }) moyasarPaymentId: string | null;
  @ApiProperty({ type: String }) createdAt: Date;
  @ApiProperty({ type: String }) updatedAt: Date;

  static fromEntity(b: BookingEntity): BookingResponseDto {
    const dto = new BookingResponseDto();
    dto.id = b.id;
    dto.listingId = b.listingId;
    dto.guestId = b.guestId;
    dto.hostId = b.hostId;
    dto.checkIn = b.checkIn;
    dto.checkOut = b.checkOut;
    dto.nights = b.nights;
    dto.numGuests = b.numGuests ?? 1;
    dto.totalAmount = Number(b.totalAmount);
    dto.status = b.status;
    dto.notes = b.notes;
    dto.moyasarPaymentId = b.moyasarPaymentId;
    dto.createdAt = b.createdAt;
    dto.updatedAt = b.updatedAt;
    return dto;
  }
}
