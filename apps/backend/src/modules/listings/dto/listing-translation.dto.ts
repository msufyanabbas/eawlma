import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { Locale } from '@aqarat/shared-types';

export class UpsertListingTranslationDto {
  @ApiProperty({ enum: Locale })
  @IsEnum(Locale)
  locale: Locale;

  @ApiProperty()
  @IsString()
  @Length(5, 200)
  title: string;

  @ApiProperty()
  @IsString()
  @Length(20, 5000)
  description: string;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isMachineTranslated?: boolean;
}
