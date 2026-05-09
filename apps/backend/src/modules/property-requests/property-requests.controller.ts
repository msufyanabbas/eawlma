import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@eawlma/shared-types';

import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

import { PropertyRequestsService } from './property-requests.service';
import {
  CreatePropertyRequestDto,
  PropertyRequestResponseDto,
} from './dto/property-request.dto';
import { PropertyRequestStatus } from './entities/property-request.entity';

@ApiTags('property-requests')
@Controller({ path: 'property-requests', version: '1' })
export class PropertyRequestsController {
  constructor(private readonly service: PropertyRequestsService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a property request. Public — anonymous buyers can submit requests when they cannot find what they want.',
  })
  async create(
    @Body() dto: CreatePropertyRequestDto,
    @CurrentUser() actor: RequestUser | undefined,
  ): Promise<PropertyRequestResponseDto> {
    const entity = await this.service.create(dto, actor?.id ?? null);
    return PropertyRequestResponseDto.fromEntity(entity);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('mine')
  @ApiOperation({ summary: 'List the current user\'s property requests.' })
  async mine(
    @CurrentUser() actor: RequestUser,
  ): Promise<PropertyRequestResponseDto[]> {
    const list = await this.service.listForUser(actor.id);
    return list.map(PropertyRequestResponseDto.fromEntity);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth('access-token')
  @Get('admin')
  @ApiOperation({ summary: 'All property requests (admin).' })
  async listAll(
    @Query('status') status?: PropertyRequestStatus,
  ): Promise<PropertyRequestResponseDto[]> {
    const list = await this.service.listAll(status);
    return list.map(PropertyRequestResponseDto.fromEntity);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth('access-token')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update a property request status (admin).' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: PropertyRequestStatus,
  ): Promise<PropertyRequestResponseDto> {
    const entity = await this.service.updateStatus(id, status);
    return PropertyRequestResponseDto.fromEntity(entity);
  }
}
