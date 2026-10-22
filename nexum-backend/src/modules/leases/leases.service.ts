import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AuditAction,
  LeaseStatus,
  NotificationChannel,
  NotificationType,
} from '@prisma/client';

import { ListLeasesQueryDto } from './dto/list-leases-query.dto';
import { paginate } from '../../common/utils/paginate.util';
import { buildDateRange } from '../../common/utils/date-range.util';

import { PrismaService } from '../../database/prisma.service';
import { RoomAvailabilityService } from '../rooms/room-availability.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

import { TerminateLeaseDto } from './dto/terminate-lease.dto';

@Injectable()
export class LeasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomAvailability: RoomAvailabilityService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async findMine(userId: string) {
    return this.prisma.lease.findMany({
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

  async findAll(query: ListLeasesQueryDto) {
    const { page = 1, limit = 20, search, status, dateFrom, dateTo } = query;

    const createdAt = buildDateRange(dateFrom, dateTo);

    const where = {
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              {
                leaseNumber: { contains: search, mode: 'insensitive' as const },
              },
              {
                room: {
                  roomNumber: { contains: search, mode: 'insensitive' as const },
                },
              },
              {
                user: {
                  firstName: { contains: search, mode: 'insensitive' as const },
                },
              },
              {
                user: {
                  lastName: { contains: search, mode: 'insensitive' as const },
                },
              },
              {
                user: {
                  email: { contains: search, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.lease.findMany({
        where,
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
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lease.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(
    id: string,
    requester: { id: string; role: string },
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (
      requester.role !== 'ADMIN' &&
      lease.userId !== requester.id
    ) {
      throw new ForbiddenException(
        'You cannot access this lease',
      );
    }

    return lease;
  }

  async terminate(
    id: string,
    dto: TerminateLeaseDto,
    adminId: string,
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (lease.status !== LeaseStatus.ACTIVE) {
      throw new BadRequestException(
        `Only an ACTIVE lease can be terminated (current status: ${lease.status})`,
      );
    }

    await this.roomAvailability.release(lease.roomId);

    const updated = await this.prisma.lease.update({
      where: { id },
      data: {
        status: LeaseStatus.TERMINATED,
        terminationDate: dto.terminationDate
          ? new Date(dto.terminationDate)
          : new Date(),
        terminationReason: dto.terminationReason,
      },
    });

    await this.audit.log({
      actorId: adminId,
      action: AuditAction.TERMINATE,
      entityType: 'LEASE',
      entityId: id,
      oldValue: {
        status: lease.status,
      },
      newValue: {
        status: LeaseStatus.TERMINATED,
        terminationReason: dto.terminationReason,
      },
    });

    await this.notifications.send({
      userId: lease.userId,
      type: NotificationType.LEASE,
      title: 'Lease terminated',
      content: `Your lease ${lease.leaseNumber} has been terminated: ${dto.terminationReason}`,
      channels: [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
      ],
    });

    return updated;
  }

  /**
   * Finds ACTIVE leases past their endDate and expires them, releasing the
   * room. Not called automatically yet — Phase 8 wires this into the same
   * daily job as room-reservation expiry. Exposed here as an
   * admin-triggerable endpoint for testing in the meantime.
   */
  async expireEndedLeases() {
    const now = new Date();

    const ended = await this.prisma.lease.findMany({
      where: {
        status: LeaseStatus.ACTIVE,
        endDate: { lt: now },
      },
    });

    for (const lease of ended) {
      await this.roomAvailability.release(lease.roomId);

      await this.prisma.lease.update({
        where: { id: lease.id },
        data: {
          status: LeaseStatus.EXPIRED,
        },
      });
    }

    return { expiredCount: ended.length };
  }
}