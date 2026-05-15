import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { UserRole, UserStatus } from '@eawlma/shared-types';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

import { UsersService } from './users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { UserEntity } from './entities/user.entity';
import type { HostStats } from '@eawlma/shared-types';
import { NotFoundException } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import {
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from './dto/update-user-status.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(ReviewEntity)
    private readonly reviews: Repository<ReviewEntity>,
  ) {}

  // ---------- Public alias ------------------------------------------------
  // The spec exposes host stats under /users/:id/host-stats; the same data
  // is also served by AgentsController on /agents/:id/host-stats. The logic
  // is duplicated rather than cross-controller-injected because Nest
  // controllers aren't providers.
  @Public()
  @Get(':id/host-stats')
  @ApiOperation({ summary: 'Aggregate host stats — response rate, superhost badge, totals.' })
  async hostStats(@Param('id', ParseUUIDPipe) id: string): Promise<HostStats> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const completed = await this.bookings.find({ where: { hostId: id, status: 'completed' } });
    const totalCompletedBookings = completed.length;
    const totalEarnings = completed.reduce(
      (sum, b) => sum + Number(b.totalAmount ?? 0),
      0,
    );

    const reviews = await this.reviews.find({ where: { agentId: id } });
    const reviewCount = reviews.length;
    const averageRating = reviewCount === 0
      ? null
      : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10;

    const responseRate =
      user.responseRate !== null && user.responseRate !== undefined
        ? Number(user.responseRate)
        : null;
    const meetsCriteria =
      totalCompletedBookings >= 10 &&
      (responseRate ?? 0) >= 90 &&
      (averageRating ?? 0) >= 4.8;
    const isSuperhost = user.isSuperhost || meetsCriteria;

    return {
      userId: id,
      responseRate,
      responseTime: user.responseTime ?? null,
      isSuperhost,
      totalCompletedBookings,
      totalEarnings,
      averageRating,
      reviewCount,
    };
  }

  // ---------- Self-service ------------------------------------------------

  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  async me(@CurrentUser('id') userId: string): Promise<UserResponseDto> {
    const user = await this.usersService.findByIdOrFail(userId);
    return UserResponseDto.fromEntity(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const updated = await this.usersService.updateProfile(userId, dto);
    return UserResponseDto.fromEntity(updated);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update the current user language + theme preferences' })
  @ApiOkResponse({ type: UserResponseDto })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<UserResponseDto> {
    const updated = await this.usersService.updatePreferences(userId, dto);
    return UserResponseDto.fromEntity(updated);
  }

  // ---------- Admin / moderator ------------------------------------------

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'List users (admin/moderator)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  async list(
    @Query() pagination: PaginationQueryDto,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
  ) {
    const result = await this.usersService.paginate(
      pagination.page ?? 1,
      pagination.limit ?? 20,
      { search, role, status },
    );
    return {
      data: result.data.map(UserResponseDto.fromEntity),
      meta: result.meta,
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Get a user by ID (admin/moderator)' })
  @ApiOkResponse({ type: UserResponseDto })
  async getOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findByIdOrFail(id);
    return UserResponseDto.fromEntity(user);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a user account status (admin)' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<UserResponseDto> {
    const updated = await this.usersService.updateStatus(id, dto.status);
    return UserResponseDto.fromEntity(updated);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a user role (admin)' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserResponseDto> {
    const updated = await this.usersService.updateRole(id, dto.role);
    return UserResponseDto.fromEntity(updated);
  }
}
