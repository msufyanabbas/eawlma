import {
  Controller,
  Get,
  Header,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UserRole } from '@aqarat/shared-types';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditLogEntity } from './entities/audit-log.entity';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Controller({ path: 'admin/audit', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit log entries (admin)' })
  @ApiOkResponse()
  async list(@Query() query: AuditQueryDto) {
    const result = await this.auditService.paginate(
      query.page ?? 1,
      query.limit ?? 50,
      {
        entityType: query.entityType,
        entityId: query.entityId,
        action: query.action,
        actorId: query.actorId,
        search: query.search,
        from: query.from,
        to: query.to,
      },
    );
    return result;
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    `attachment; filename="aqarat-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
  )
  @ApiOperation({ summary: 'Stream the filtered audit log as CSV (admin)' })
  async export(@Query() query: AuditQueryDto, @Res({ passthrough: true }) _res: Response) {
    const rows = await this.auditService.streamForExport({
      entityType: query.entityType,
      entityId: query.entityId,
      action: query.action,
      actorId: query.actorId,
      search: query.search,
      from: query.from,
      to: query.to,
    });
    const csv = renderCsv(rows);
    return new StreamableFile(Buffer.from(csv, 'utf-8'));
  }
}

const HEADERS: Array<keyof AuditLogEntity | string> = [
  'id',
  'createdAt',
  'actorId',
  'action',
  'entityType',
  'entityId',
  'ipAddress',
  'userAgent',
  'requestId',
  'changedFields',
];

function renderCsv(rows: AuditLogEntity[]): string {
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str =
      typeof value === 'string'
        ? value
        : value instanceof Date
          ? value.toISOString()
          : JSON.stringify(value);
    const needsQuoting = /[",\n]/.test(str);
    const safe = str.replace(/"/g, '""');
    return needsQuoting ? `"${safe}"` : safe;
  };

  const lines = [HEADERS.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.createdAt,
        r.actorId,
        r.action,
        r.entityType,
        r.entityId,
        r.ipAddress,
        r.userAgent,
        r.requestId,
        r.changedFields,
      ]
        .map(escape)
        .join(','),
    );
  }
  return lines.join('\n');
}
