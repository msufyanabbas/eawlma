import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

// The 38 locales the shared @eawlma/i18n-locales package ships. Kept in lock
// step with the i18n resources block in apps/{frontend,mobile}/src/i18n.
const SUPPORTED_LOCALES = [
  'ar', 'en', 'ur', 'fr', 'zh', 'hi', 'es', 'de', 'tr', 'ru',
  'id', 'ms', 'bn', 'tl', 'vi', 'th', 'ko', 'ja', 'fa', 'he',
  'sw', 'am', 'ne', 'si', 'ta', 'te', 'gu', 'mr', 'pt', 'it',
  'nl', 'pl', 'ro', 'sv', 'da', 'fi', 'no', 'af',
] as const;

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ enum: SUPPORTED_LOCALES })
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_LOCALES as unknown as string[])
  preferredLanguage?: string;

  @ApiPropertyOptional({ enum: ['light', 'dark'] })
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark'])
  preferredTheme?: 'light' | 'dark';
}
