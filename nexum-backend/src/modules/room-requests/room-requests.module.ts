import { Module } from '@nestjs/common';

import { RoomRequestsController } from './room-requests.controller';
import { RoomRequestsService } from './room-requests.service';

import { RoomsModule } from '../rooms/rooms.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    RoomsModule,
    NotificationsModule,
    AuditModule,
  ],

  controllers: [RoomRequestsController],

  providers: [RoomRequestsService],

  exports: [RoomRequestsService],
})
export class RoomRequestsModule {}
