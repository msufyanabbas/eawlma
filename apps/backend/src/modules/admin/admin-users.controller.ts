import {
  Body,
  Controller,
  ForbiddenException,
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
  ApiTags,
} from '@nestjs/swagger';
import { UserRole, UserStatus } from '@eawlma/shared-types';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { UsersService } from '../users/users.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { AuditService } from '../audit/audit.service';

import {
  AdminSuspendUserDto,
  AdminUpdateRoleDto,
  AdminUsersQueryDto,
} from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Controller({ path: 'admin/users', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Paginated user list with role/status/search filters (admin only)' })
  async list(@Query() query: AdminUsersQueryDto) {
    const result = await this.usersService.paginate(
      query.page ?? 1,
      query.limit ?? 20,
      {
        search: query.search,
        role: query.role,
        status: query.status,
      },
    );
    return {
      data: result.data.map(UserResponseDto.fromEntity),
      meta: result.meta,
    };
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Promote/demote a user role (admin only)' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: AdminUpdateRoleDto,
  ): Promise<UserResponseDto> {
    if (id === actor.id) {
      // Prevent admins from accidentally demoting themselves
      const target = await this.usersService.findByIdOrFail(id);
      if (target.role === UserRole.ADMIN && dto.role !== UserRole.ADMIN) {
        throw new ForbiddenException('You cannot demote yourself out of the admin role');
      }
    }
    const before = await this.usersService.findByIdOrFail(id);
    const updated = await this.usersService.updateRole(id, dto.role);
    void this.auditService
      .write({
        action: 'user.role-change',
        entityType: 'user',
        entityId: id,
        changedFields: { role: { before: before.role, after: dto.role } },
      })
      .catch(() => undefined);
    return UserResponseDto.fromEntity(updated);
  }

  @Patch(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a user account (admin only)' })
  @ApiOkResponse({ type: UserResponseDto })
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
    @Body() dto: AdminSuspendUserDto,
  ): Promise<UserResponseDto> {
    if (id === actor.id) {
      throw new ForbiddenException('You cannot suspend your own account');
    }
    const before = await this.usersService.findByIdOrFail(id);
    const updated = await this.usersService.updateStatus(id, UserStatus.SUSPENDED);
    void this.auditService
      .write({
        action: 'user.suspend',
        entityType: 'user',
        entityId: id,
        changedFields: {
          status: { before: before.status, after: UserStatus.SUSPENDED },
          reason: { before: null, after: dto.reason },
        },
      })
      .catch(() => undefined);
    return UserResponseDto.fromEntity(updated);
  }

  @Patch(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a suspended user (admin only)' })
  @ApiOkResponse({ type: UserResponseDto })
  async reactivate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    const before = await this.usersService.findByIdOrFail(id);
    const updated = await this.usersService.updateStatus(id, UserStatus.ACTIVE);
    void this.auditService
      .write({
        action: 'user.reactivate',
        entityType: 'user',
        entityId: id,
        changedFields: {
          status: { before: before.status, after: UserStatus.ACTIVE },
        },
      })
      .catch(() => undefined);
    return UserResponseDto.fromEntity(updated);
  }
}

