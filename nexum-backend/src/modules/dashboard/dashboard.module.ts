import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DueDateModule } from '../due-date/due-date.module';

@Module({
  imports: [DueDateModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
