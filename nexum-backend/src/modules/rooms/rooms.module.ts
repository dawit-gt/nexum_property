import { Module } from '@nestjs/common';

import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomAvailabilityService } from './room-availability.service';

import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomAvailabilityService],
  exports: [RoomsService, RoomAvailabilityService],
})
export class RoomsModule {}