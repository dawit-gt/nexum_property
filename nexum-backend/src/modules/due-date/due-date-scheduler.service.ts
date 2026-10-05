import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DueDateService } from './due-date.service';

@Injectable()
export class DueDateSchedulerService {
  private readonly logger = new Logger(DueDateSchedulerService.name);

  constructor(private readonly dueDateService: DueDateService) {}

  /**
   * Runs once daily. Because free hosting can sleep/pause (Master Plan
   * Section 4), this alone isn't fully reliable in production — the
   * manual-trigger endpoint below doubles as the dashboard-load safety net
   * once Phase 9 builds the admin dashboard, and a free external uptime
   * monitor (set up at deployment, Phase 12) keeps the host itself awake.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyCheck() {
    this.logger.log('Running scheduled daily due-date check...');
    await this.dueDateService.runDailyCheck();
  }
}
