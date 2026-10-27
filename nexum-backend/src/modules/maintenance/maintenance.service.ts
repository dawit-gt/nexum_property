import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, MaintenanceStatus, NotificationChannel, NotificationType, RoomStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';
import { STORAGE_BUCKETS, SIGNED_URL_EXPIRY_SECONDS } from '../../common/constants/storage.constants';
import { assertValidUpload } from '../../common/utils/file-validation.util';
import { RoomAvailabilityService } from '../rooms/room-availability.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { ListMaintenanceQueryDto } from './dto/list-maintenance-query.dto';
import { buildDateRange } from '../../common/utils/date-range.util';
import { paginate } from '../../common/utils/paginate.util';

type UploadedFile = Express.Multer.File;

function generateTicketNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(2).toString('hex').toUpperCase();
  return `MR-${stamp}-${rand}`;
}

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
    private readonly roomAvailability: RoomAvailabilityService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateMaintenanceRequestDto, file?: UploadedFile) {
    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    let imagePath: string | undefined;
    if (file) {
      assertValidUpload(file);
      imagePath = this.storage.buildSecurePath(`maintenance/${userId}`, file.originalname);
      await this.storage.upload(STORAGE_BUCKETS.MAINTENANCE_IMAGES, imagePath, file.buffer, file.mimetype);
    }

    try {
      const request = await this.prisma.maintenanceRequest.create({
        data: {
          ticketNumber: generateTicketNumber(),
          userId,
          propertyId: room.propertyId,
          roomId: room.id,
          issueTitle: dto.issueTitle,
          description: dto.description,
          imagePath,
          status: MaintenanceStatus.PENDING,
        },
      });

      await this.notifications.notifyAdmins({
        kind: 'maintenance',
        type: NotificationType.MAINTENANCE,
        title: 'New maintenance request',
        content: `${request.ticketNumber}: ${dto.issueTitle} (Room ${room.roomNumber})`,
        actionUrl: '/admin/maintenance',
      });

      return request;
    } catch (error) {
      if (imagePath) {
        await this.storage.delete(STORAGE_BUCKETS.MAINTENANCE_IMAGES, imagePath);
      }
      throw error;
    }
  }

  async findMine(userId: string) {
    return this.prisma.maintenanceRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findForReview(query: ListMaintenanceQueryDto) {
    const { page = 1, limit = 20, search, status, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;
    const createdAt = buildDateRange(dateFrom, dateTo);

    const where = {
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              { ticketNumber: { contains: search, mode: 'insensitive' as const } },
              { issueTitle: { contains: search, mode: 'insensitive' as const } },
              { room: { roomNumber: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.maintenanceRequest.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          room: { select: { id: true, roomNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.maintenanceRequest.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOneWithAccessCheck(id: string, requester: { id: string; role: string }) {
    const request = await this.prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }
    if (requester.role !== 'ADMIN' && request.userId !== requester.id) {
      throw new ForbiddenException('You cannot access this request');
    }

    if (!request.imagePath) {
      return request;
    }

    const signedUrl = await this.storage.getSignedUrl(
      STORAGE_BUCKETS.MAINTENANCE_IMAGES,
      request.imagePath,
      SIGNED_URL_EXPIRY_SECONDS,
    );
    const { imagePath: _imagePath, ...safe } = request;
    return { ...safe, signedUrl, signedUrlExpiresInSeconds: SIGNED_URL_EXPIRY_SECONDS };
  }

  async updateStatus(
    id: string,
    status: MaintenanceStatus,
    adminNotes?: string,
    takeRoomOutOfService = false,
    adminId?: string,
  ) {
    const request = await this.prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }
    if (request.status === MaintenanceStatus.RESOLVED || request.status === MaintenanceStatus.REJECTED) {
      throw new BadRequestException(`This request is already closed (status: ${request.status})`);
    }

    // Admin's explicit choice, not automatic — see the DTO comment. Direct
    // Prisma update here rather than RoomAvailabilityService, since MAINTENANCE
    // isn't one of that service's three lease-driven transitions.
    if (status === MaintenanceStatus.IN_PROGRESS && takeRoomOutOfService && request.roomId) {
      const room = await this.prisma.room.findUnique({ where: { id: request.roomId } });
      if (room && room.status === RoomStatus.AVAILABLE) {
        await this.prisma.room.update({ where: { id: room.id }, data: { status: RoomStatus.MAINTENANCE } });
        await this.audit.log({
          actorId: adminId,
          action: AuditAction.STATUS_CHANGE,
          entityType: 'ROOM',
          entityId: room.id,
          oldValue: { status: room.status },
          newValue: { status: RoomStatus.MAINTENANCE, reason: `Ticket ${request.ticketNumber}` },
        });
      }
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status,
        adminNotes,
        resolvedAt: status === MaintenanceStatus.RESOLVED ? new Date() : null,
      },
    });

    await this.audit.log({
      actorId: adminId,
      action: AuditAction.STATUS_CHANGE,
      entityType: 'MAINTENANCE',
      entityId: id,
      oldValue: { status: request.status },
      newValue: { status, adminNotes: adminNotes ?? null },
    });

    // Bring the room back to AVAILABLE automatically once resolved, but
    // only if it was actually taken out of service for this ticket in the
    // first place — never touch a room that's OCCUPIED under an active lease.
    if (status === MaintenanceStatus.RESOLVED && request.roomId) {
      const room = await this.prisma.room.findUnique({ where: { id: request.roomId } });
      if (room?.status === RoomStatus.MAINTENANCE) {
        await this.prisma.room.update({ where: { id: room.id }, data: { status: RoomStatus.AVAILABLE } });
        await this.audit.log({
          actorId: adminId,
          action: AuditAction.STATUS_CHANGE,
          entityType: 'ROOM',
          entityId: room.id,
          oldValue: { status: room.status },
          newValue: { status: RoomStatus.AVAILABLE, reason: `Ticket ${request.ticketNumber} resolved` },
        });
      }
    }

    await this.notifications.send({
      userId: request.userId,
      type: NotificationType.MAINTENANCE,
      title: `Maintenance ticket ${request.ticketNumber} updated`,
      content: `Status changed to ${status}.${adminNotes ? ` Note: ${adminNotes}` : ''}`,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    });

    return updated;
  }
}
