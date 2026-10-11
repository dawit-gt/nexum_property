import { Controller, Get, Header, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

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

  @Get('payments/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="payments.csv"')
  @ApiOperation({ summary: '[ADMIN] Export all payments as CSV' })
  async exportPayments(@Res() res: Response) {
    const csv = await this.dashboardService.exportPaymentsCsv();
    res.send(csv);
  }
}
