import { Module } from '@nestjs/common';

import { RoomsController } from './rooms.controller';
import { PublicRoomsController } from './public-rooms.controller';
import { RoomsService } from './rooms.service';
import { PublicRoomsService } from './public-rooms.service';
import { RoomAvailabilityService } from './room-availability.service';

import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [RoomsController, PublicRoomsController],
  providers: [RoomsService, PublicRoomsService, RoomAvailabilityService],
  exports: [RoomsService, RoomAvailabilityService],
})
export class RoomsModule {}