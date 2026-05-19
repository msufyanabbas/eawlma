import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { DevicePlatform } from './entities/device-token.entity';
import {
  MarkNotificationsReadDto,
  NotificationResponseDto,
} from './dto/notification.dto';

class RegisterDeviceDto {
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  token: string;

  @IsString()
  @IsIn(['ios', 'android', 'web'])
  platform: DevicePlatform;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceModel?: string;
}

class UnregisterDeviceDto {
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  token: string;
}

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller({ path: 'notifications', version: '1' })
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiQuery({ name: 'unread', required: false, type: Boolean })
  async list(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationQueryDto,
    @Query('unread') unread?: string,
  ) {
    const onlyUnread = unread === 'true' || unread === '1';
    const result = await this.notificationsService.paginate(
      userId,
      pagination.page ?? 1,
      pagination.limit ?? 20,
      onlyUnread,
    );
    return {
      data: result.data.map(NotificationResponseDto.fromEntity),
      meta: result.meta,
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get the count of unread notifications' })
  @ApiOkResponse({ schema: { properties: { count: { type: 'number' } } } })
  async unreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.unreadCount(userId);
    return { count };
  }

  @Patch('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a list of notifications as read' })
  async markRead(
    @CurrentUser('id') userId: string,
    @Body() dto: MarkNotificationsReadDto,
  ) {
    const updated = await this.notificationsService.markRead(userId, dto.ids);
    return { updated };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read for the current user' })
  async markAllRead(@CurrentUser('id') userId: string) {
    const updated = await this.notificationsService.markAllRead(userId);
    return { updated };
  }

  // ---- Push device registration ------------------------------------------

  @Post('register-device')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Register an Expo/FCM push token for the current user. Idempotent — re-registering the same token reactivates it.',
  })
  async registerDevice(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterDeviceDto,
  ): Promise<{ success: true }> {
    await this.pushService.registerToken(userId, dto.token, dto.platform, dto.deviceModel);
    return { success: true };
  }

  @Delete('unregister-device')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Soft-disable a push token (sign-out, uninstall, opt-out). The row is kept for audit.',
  })
  async unregisterDevice(@Body() dto: UnregisterDeviceDto): Promise<{ success: true }> {
    await this.pushService.unregisterToken(dto.token);
    return { success: true };
  }
}
