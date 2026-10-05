import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AuditAction,
  NotificationChannel,
  NotificationType,
  RegistrationStatus,
  RequestStatus,
  RoomStatus,
} from '@prisma/client';

import { randomBytes } from 'crypto';

import { PrismaService } from '../../database/prisma.service';
import { RoomAvailabilityService } from '../rooms/room-availability.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

import { CreateRoomRequestDto } from './dto/create-room-request.dto';

/**
 * Default reservation window (Master Plan Section 8) — a room held for a
 * pending request reverts to AVAILABLE automatically after this long.
 */
const RESERVATION_DAYS = 3;

function generateLeaseNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(2).toString('hex').toUpperCase();

  return `LS-${stamp}-${rand}`;
}

@Injectable()
export class RoomRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomAvailability: RoomAvailabilityService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateRoomRequestDto) {
    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (
      requester?.registrationStatus !==
      RegistrationStatus.APPROVED
    ) {
      throw new ForbiddenException(
        'Your registration must be approved before you can request a room',
      );
    }

    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const alreadyPending =
      await this.prisma.roomRequest.findFirst({
        where: {
          userId,
          roomId: dto.roomId,
          status: RequestStatus.PENDING,
        },
      });

    if (alreadyPending) {
      throw new BadRequestException(
        'You already have a pending request for this room',
      );
    }

    const expiresAt = new Date(
      Date.now() +
        RESERVATION_DAYS * 24 * 60 * 60 * 1000,
    );

    // reserve() throws if the room isn't AVAILABLE — so a request can never
    // be created for a room that's already reserved/occupied by someone else.
    await this.roomAvailability.reserve(
      dto.roomId,
      expiresAt,
    );

    return this.prisma.roomRequest.create({
      data: {
        userId,
        roomId: dto.roomId,
        desiredStartDate: new Date(dto.desiredStartDate),
        note: dto.note,
        status: RequestStatus.PENDING,
      },
    });
  }

  async findMine(userId: string) {
    return this.prisma.roomRequest.findMany({
      where: { userId },
      include: {
        room: {
          select: {
            roomNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findForReview(status?: RequestStatus) {
    return this.prisma.roomRequest.findMany({
      where: {
        status: status ?? RequestStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        room: {
          select: {
            id: true,
            roomNumber: true,
            monthlyRent: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(
    id: string,
    requester: { id: string; role: string },
  ) {
    const request =
      await this.prisma.roomRequest.findUnique({
        where: { id },
      });

    if (!request) {
      throw new NotFoundException(
        'Room request not found',
      );
    }

    if (
      requester.role !== 'ADMIN' &&
      request.userId !== requester.id
    ) {
      throw new ForbiddenException(
        'You cannot access this request',
      );
    }

    return request;
  }

  async cancel(
    userId: string,
    id: string,
  ) {
    const request =
      await this.prisma.roomRequest.findUnique({
        where: { id },
      });

    if (!request) {
      throw new NotFoundException(
        'Room request not found',
      );
    }

    if (request.userId !== userId) {
      throw new ForbiddenException(
        'This is not your request',
      );
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        `Only a pending request can be cancelled (current status: ${request.status})`,
      );
    }

    await this.roomAvailability.release(
      request.roomId,
    );

    return this.prisma.roomRequest.update({
      where: { id },
      data: {
        status: RequestStatus.CANCELLED,
      },
    });
  }

  /**
   * Approving one request for a room creates the Lease and occupies the
   * room; every OTHER still-pending request for that same room is
   * auto-cancelled, since the room is no longer available to them.
   * Rejecting a request releases the room back to AVAILABLE.
   */
  async review(
    id: string,
    adminId: string,
    status:
      | typeof RequestStatus.APPROVED
      | typeof RequestStatus.REJECTED,
    rejectionReason?: string,
    durationMonths = 12,
  ) {
    const request =
      await this.prisma.roomRequest.findUnique({
        where: { id },
        include: { room: true },
      });

    if (!request) {
      throw new NotFoundException(
        'Room request not found',
      );
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        `Request has already been reviewed (status: ${request.status})`,
      );
    }

    /**
     * REJECTED path
     */
    if (status === RequestStatus.REJECTED) {
      await this.roomAvailability.release(
        request.roomId,
      );

      const updated =
        await this.prisma.roomRequest.update({
          where: { id },
          data: {
            status: RequestStatus.REJECTED,
            rejectionReason,
          },
        });

      await this.audit.log({
        actorId: adminId,
        action: AuditAction.REJECT,
        entityType: 'ROOM_REQUEST',
        entityId: id,
        newValue: {
          status: RequestStatus.REJECTED,
          rejectionReason,
        },
      });

      await this.notifications.send({
        userId: request.userId,
        type: NotificationType.ROOM_REQUEST,
        title: 'Room request rejected',
        content: `Your request for room ${request.room.roomNumber} was rejected: ${rejectionReason}`,
        channels: [
          NotificationChannel.IN_APP,
          NotificationChannel.EMAIL,
        ],
      });

      return updated;
    }

    /**
     * APPROVED path
     */
    const startDate = request.desiredStartDate;

    const endDate = new Date(startDate);
    endDate.setMonth(
      endDate.getMonth() + durationMonths,
    );

    await this.roomAvailability.occupy(
      request.roomId,
    );

    const [updatedRequest] =
      await this.prisma.$transaction([
        this.prisma.roomRequest.update({
          where: { id },
          data: {
            status: RequestStatus.APPROVED,
          },
        }),

        this.prisma.lease.create({
          data: {
            leaseNumber: generateLeaseNumber(),
            userId: request.userId,
            roomId: request.roomId,
            startDate,
            endDate,
            monthlyRent: request.room.monthlyRent,
            status: 'ACTIVE',
          },
        }),

        this.prisma.roomRequest.updateMany({
          where: {
            roomId: request.roomId,
            status: RequestStatus.PENDING,
            id: { not: id },
          },
          data: {
            status: RequestStatus.CANCELLED,
            rejectionReason:
              'Room was leased to another applicant',
          },
        }),
      ]);

    await this.audit.log({
      actorId: adminId,
      action: AuditAction.APPROVE,
      entityType: 'ROOM_REQUEST',
      entityId: id,
      newValue: {
        status: RequestStatus.APPROVED,
        durationMonths,
      },
    });

    await this.notifications.send({
      userId: request.userId,
      type: NotificationType.ROOM_REQUEST,
      title: 'Room request approved',
      content: `Your request for room ${request.room.roomNumber} was approved. Your lease has started.`,
      channels: [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
      ],
    });

    return updatedRequest;
  }

  /**
   * Finds RESERVED rooms whose reservation window has passed and releases
   * them, cancelling the associated PENDING request. Not called
   * automatically yet — Phase 8 wires this into a daily scheduled job.
   * Exposed here as an admin-triggerable endpoint for testing in the
   * meantime.
   */
  async expireStaleReservations() {
    const now = new Date();

    const stale = await this.prisma.room.findMany({
      where: {
        status: RoomStatus.RESERVED,
        reservationExpiresAt: { lt: now },
      },
    });

    let count = 0;

    for (const room of stale) {
      await this.roomAvailability.release(
        room.id,
      );

      await this.prisma.roomRequest.updateMany({
        where: {
          roomId: room.id,
          status: RequestStatus.PENDING,
        },
        data: {
          status: RequestStatus.CANCELLED,
          rejectionReason: 'Reservation expired',
        },
      });

      count++;
    }

    return { expiredCount: count };
  }
}