import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitRegaLicenseDto {
  @ApiProperty({ example: 'FA-12345678' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  licenseNumber: string;

  @ApiProperty({ example: '2027-12-31' })
  @IsDateString()
  expiryDate: string;
}
