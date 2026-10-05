import { Module } from '@nestjs/common';

import { LeasesController } from './leases.controller';
import { LeasesService } from './leases.service';

import { RoomsModule } from '../rooms/rooms.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    RoomsModule,
    NotificationsModule,
    AuditModule,
  ],
  controllers: [LeasesController],
  providers: [LeasesService],
  exports: [LeasesService],
})
export class LeasesModule {}