import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { ExportQueryDto } from './dto/export-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { toAddisDateString } from '../../common/utils/date-range.util';

function sendCsv(res: Response, name: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${name}-${toAddisDateString(new Date())}.csv"`,
  );
  res.send(csv);
}

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: '[ADMIN] Occupancy/payment/user analytics + pending-actions counts (also re-runs the due-date check as a safety net)' })
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('income')
  @ApiQuery({ name: 'months', required: false, description: 'How many months back, 1 to 24 (default 6)' })
  @ApiOperation({ summary: '[ADMIN] Approved payment totals per month, for the income chart' })
  getMonthlyIncome(@Query('months') months?: string) {
    return this.dashboardService.getMonthlyIncome(months ? Number(months) : undefined);
  }

  @Get('payments/export')
  @ApiOperation({ summary: '[ADMIN] Export payments as CSV (same filters as the payments list)' })
  async exportPayments(@Query() query: ExportQueryDto, @Res() res: Response) {
    sendCsv(res, 'payments', await this.dashboardService.exportPaymentsCsv(query));
  }

  @Get('leases/export')
  @ApiOperation({ summary: '[ADMIN] Export leases as CSV (same filters as the leases list)' })
  async exportLeases(@Query() query: ExportQueryDto, @Res() res: Response) {
    sendCsv(res, 'leases', await this.dashboardService.exportLeasesCsv(query));
  }

  @Get('maintenance/export')
  @ApiOperation({ summary: '[ADMIN] Export maintenance tickets as CSV (same filters as the maintenance list)' })
  async exportMaintenance(@Query() query: ExportQueryDto, @Res() res: Response) {
    sendCsv(res, 'maintenance', await this.dashboardService.exportMaintenanceCsv(query));
  }
}
