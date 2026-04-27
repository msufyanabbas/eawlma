import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StorageService } from './storage.service';
import {
  DeleteObjectDto,
  PresignedUrlRequestDto,
  PresignedUrlResponseDto,
} from './dto/storage.dto';

@ApiTags('listings')
@ApiBearerAuth('access-token')
@Controller({ path: 'storage', version: '1' })
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presigned-url')
  @ApiOperation({
    summary:
      'Generate a pre-signed S3 PUT URL. The client uploads directly to S3 using the returned URL.',
  })
  @ApiOkResponse({ type: PresignedUrlResponseDto })
  async presigned(
    @CurrentUser('id') userId: string,
    @Body() dto: PresignedUrlRequestDto,
  ): Promise<PresignedUrlResponseDto> {
    return this.storageService.createPresignedUrl(userId, dto);
  }

  @Delete('object')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an S3 object by key (cleanup hook for listing/asset removal)' })
  async remove(@Body() dto: DeleteObjectDto): Promise<void> {
    await this.storageService.deleteObject(dto.objectKey);
  }
}
