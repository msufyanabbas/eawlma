import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export enum StorageFileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  MODEL_3D = 'model_3d',
  AVATAR = 'avatar',
  AGENCY_LOGO = 'agency_logo',
}

export enum StorageFolder {
  LISTINGS = 'listings',
  AVATARS = 'avatars',
  AGENCIES = 'agencies',
  DOCUMENTS = 'documents',
  TOURS = 'tours',
}

export class PresignedUrlRequestDto {
  @ApiProperty({ enum: StorageFileType })
  @IsEnum(StorageFileType)
  fileType: StorageFileType;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MaxLength(127)
  @Matches(/^[a-zA-Z0-9!#$&^_+\-.]+\/[a-zA-Z0-9!#$&^_+\-.]+$/, {
    message: 'mimeType must be a valid IANA media type',
  })
  mimeType: string;

  @ApiProperty({ enum: StorageFolder })
  @IsEnum(StorageFolder)
  folder: StorageFolder;

  @ApiPropertyOptional({ description: 'Original file name (extension only used for the key suffix)' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  fileName?: string;
}

export class PresignedUrlResponseDto {
  @ApiProperty() uploadUrl: string;
  @ApiProperty() objectKey: string;
  @ApiProperty() publicUrl: string;
  @ApiProperty() expiresAt: string;
  @ApiProperty() maxSizeBytes: number;
  @ApiProperty({ description: 'Required Content-Type header to use when PUTting' })
  contentType: string;
}

export class DeleteObjectDto {
  @ApiProperty()
  @IsString()
  @Length(1, 1024)
  objectKey: string;
}
