import { Module } from '@nestjs/common';
import { DueDateController } from './due-date.controller';
import { DueDateService } from './due-date.service';
import { DueDateSchedulerService } from './due-date-scheduler.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RoomRequestsModule } from '../room-requests/room-requests.module';
import { LeasesModule } from '../leases/leases.module';

@Module({
  imports: [NotificationsModule, RoomRequestsModule, LeasesModule],
  controllers: [DueDateController],
  providers: [DueDateService, DueDateSchedulerService],
  exports: [DueDateService],
})
export class DueDateModule {}
