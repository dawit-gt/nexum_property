import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, RoomStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Every automatic room-status transition goes through here — Room Requests
 * and Leases both call this instead of writing prisma.room.update()
 * directly. Keeps "how a room becomes RESERVED/OCCUPIED/AVAILABLE" in one
 * place instead of scattered across modules (Master Plan Section 7).
 *
 * Each real change is also written to the audit log, with no actor: these
 * are changes the system made as a result of an approval, a lease ending or
 * a reservation expiring (the admin's own decision is logged separately).
 */
@Injectable()
export class RoomAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async requireRoom(roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  private async changeStatus(
    roomId: string,
    previousStatus: RoomStatus,
    status: RoomStatus,
    reservationExpiresAt: Date | null,
  ) {
    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: { status, reservationExpiresAt },
    });

    if (previousStatus !== status) {
      await this.audit.log({
        action: AuditAction.STATUS_CHANGE,
        entityType: 'ROOM',
        entityId: roomId,
        oldValue: { status: previousStatus },
        newValue: { status },
      });
    }

    return updated;
  }

  async reserve(roomId: string, expiresAt: Date) {
    const room = await this.requireRoom(roomId);
    if (room.status !== RoomStatus.AVAILABLE) {
      throw new BadRequestException(`Room is not available (current status: ${room.status})`);
    }
    return this.changeStatus(roomId, room.status, RoomStatus.RESERVED, expiresAt);
  }

  async occupy(roomId: string) {
    const room = await this.requireRoom(roomId);
    return this.changeStatus(roomId, room.status, RoomStatus.OCCUPIED, null);
  }

  /** Back to AVAILABLE — used when a request is rejected/cancelled/expired, or a lease ends. */
  async release(roomId: string) {
    const room = await this.requireRoom(roomId);
    return this.changeStatus(roomId, room.status, RoomStatus.AVAILABLE, null);
  }
}
