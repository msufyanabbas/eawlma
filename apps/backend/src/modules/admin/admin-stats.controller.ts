import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

import { AdminStatsService, AdminDashboardStats } from './admin-stats.service';

@ApiTags('admin', 'stats')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'admin/stats', version: '1' })
export class AdminStatsController {
  constructor(private readonly service: AdminStatsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin dashboard KPIs.' })
  async dashboard(@CurrentUser() actor: RequestUser): Promise<AdminDashboardStats> {
    return this.service.dashboard(actor);
  }
}
