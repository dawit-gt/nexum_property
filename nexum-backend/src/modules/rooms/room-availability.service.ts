import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RoomStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Every automatic room-status transition goes through here — Room Requests
 * and Leases both call this instead of writing prisma.room.update()
 * directly. Keeps "how a room becomes RESERVED/OCCUPIED/AVAILABLE" in one
 * place instead of scattered across modules (Master Plan Section 7).
 */
@Injectable()
export class RoomAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async reserve(roomId: string, expiresAt: Date) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (room.status !== RoomStatus.AVAILABLE) {
      throw new BadRequestException(`Room is not available (current status: ${room.status})`);
    }
    return this.prisma.room.update({
      where: { id: roomId },
      data: { status: RoomStatus.RESERVED, reservationExpiresAt: expiresAt },
    });
  }

  async occupy(roomId: string) {
    return this.prisma.room.update({
      where: { id: roomId },
      data: { status: RoomStatus.OCCUPIED, reservationExpiresAt: null },
    });
  }

  /** Back to AVAILABLE — used when a request is rejected/cancelled/expired, or a lease ends. */
  async release(roomId: string) {
    return this.prisma.room.update({
      where: { id: roomId },
      data: { status: RoomStatus.AVAILABLE, reservationExpiresAt: null },
    });
  }
}
