import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RoomStatus } from '@prisma/client';

// RESERVED and OCCUPIED are deliberately excluded — those are system-managed
// by the lease flow (Phase 4), not something an admin sets by hand. This
// endpoint only covers the manual states.
const MANUAL_ROOM_STATUSES = {
  AVAILABLE: RoomStatus.AVAILABLE,
  MAINTENANCE: RoomStatus.MAINTENANCE,
  INACTIVE: RoomStatus.INACTIVE,
} as const;

export class UpdateRoomStatusDto {
  @ApiProperty({ enum: MANUAL_ROOM_STATUSES })
  @IsEnum(MANUAL_ROOM_STATUSES)
  status: typeof RoomStatus.AVAILABLE | typeof RoomStatus.MAINTENANCE | typeof RoomStatus.INACTIVE;
}
