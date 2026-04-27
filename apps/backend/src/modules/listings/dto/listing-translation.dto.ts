import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

const BCP47_PATTERN = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})?$/;

export class UpsertListingTranslationDto {
  @ApiProperty({ example: 'fr', description: 'BCP-47 locale code' })
  @IsString()
  @Length(2, 8)
  @Matches(BCP47_PATTERN, { message: 'locale must be a BCP-47 code, e.g. "fr" or "zh-Hans"' })
  locale: string;

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
