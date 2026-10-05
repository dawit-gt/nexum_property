import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { DueDateService } from './due-date.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('due-date')
@ApiBearerAuth()
@Controller('due-date-check')
export class DueDateController {
  constructor(private readonly dueDateService: DueDateService) {}

  @Post('run')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[ADMIN] Manually run the daily due-date check (payment-due alerts, reservation expiry, lease expiry) — same job the scheduler runs nightly',
  })
  run() {
    return this.dueDateService.runDailyCheck();
  }
}
