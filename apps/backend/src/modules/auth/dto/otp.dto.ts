import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ example: 'fatima@example.com' })
  @IsEmail()
  @MaxLength(320)
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'fatima@example.com' })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit code from the email' })
  @IsString()
  @Length(6, 6)
  otp: string;
}
