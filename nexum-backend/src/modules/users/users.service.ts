import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

import {
  AuditAction,
  DocumentStatus,
  LeaseStatus,
  MaintenanceStatus,
  NotificationChannel,
  NotificationType,
  PaymentStatus,
  RegistrationStatus,
  RequestStatus,
  UserStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';
import { STORAGE_BUCKETS } from '../../common/constants/storage.constants';
import { assertValidUpload } from '../../common/utils/file-validation.util';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangeEmailDto } from './dto/change-email.dto';

import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { paginate } from '../../common/utils/paginate.util';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  telegramUsername: true,
  role: true,
  status: true,
  registrationStatus: true,
  rejectionReason: true,
  avatarUrl: true,
  address: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly storage: SupabaseStorageService,
  ) {}

  // ---------- Own profile ----------

  /**
   * Lets a user edit their own contact details. Role, status, registration
   * status and email are deliberately not editable here. An empty string
   * clears the optional fields (address, Telegram username).
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });

    if (!current) {
      throw new NotFoundException('User not found');
    }

    if (dto.phone && dto.phone !== current.phone) {
      const taken = await this.prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id: userId } },
        select: { id: true },
      });

      if (taken) {
        throw new ConflictException('This phone number is already in use');
      }
    }

    const clean = (value: string | undefined) =>
      value === undefined ? undefined : value.trim() || null;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        phone: dto.phone,
        address: clean(dto.address),
        telegramUsername:
          dto.telegramUsername === undefined
            ? undefined
            : dto.telegramUsername.trim().replace(/^@/, '') || null,
      },
      select: SAFE_USER_SELECT,
    });

    await this.audit.log({
      actorId: userId,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: userId,
      oldValue: {
        firstName: current.firstName,
        lastName: current.lastName,
        phone: current.phone,
        address: current.address,
        telegramUsername: current.telegramUsername,
      },
      newValue: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        address: updated.address,
        telegramUsername: updated.telegramUsername,
      },
    });

    return updated;
  }

  /**
   * Email is also the login, so it needs the current password. A wrong
   * password is a 400 (not 401) on purpose: the web app treats a 401 as an
   * expired session and would try to refresh or sign the user out.
   */
  async changeEmail(userId: string, dto: ChangeEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordOk = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );

    if (!passwordOk) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newEmail = dto.newEmail.trim();

    if (newEmail === user.email) {
      throw new BadRequestException(
        'That is already your email address',
      );
    }

    const taken = await this.prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });

    if (taken) {
      throw new ConflictException('This email is already in use');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
      select: SAFE_USER_SELECT,
    });

    await this.audit.log({
      actorId: userId,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: userId,
      oldValue: { email: user.email },
      newValue: { email: newEmail },
    });

    return updated;
  }

  // ---------- Profile photo ----------
  // Photos live in the private documents bucket under avatars/<userId>/ and
  // are only ever served through a short-lived signed URL.

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('A photo file is required');
    }

    assertValidUpload(file);

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        'Profile photos must be JPG or PNG images',
      );
    }

    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    const path = this.storage.buildSecurePath(
      `avatars/${userId}`,
      file.originalname,
    );

    await this.storage.upload(
      STORAGE_BUCKETS.PROPERTY_DOCUMENTS,
      path,
      file.buffer,
      file.mimetype,
    );

    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: path },
        select: SAFE_USER_SELECT,
      });

      if (current?.avatarUrl) {
        await this.storage
          .delete(STORAGE_BUCKETS.PROPERTY_DOCUMENTS, current.avatarUrl)
          .catch(() => undefined);
      }

      return updated;
    } catch (error) {
      await this.storage
        .delete(STORAGE_BUCKETS.PROPERTY_DOCUMENTS, path)
        .catch(() => undefined);
      throw error;
    }
  }

  async removeAvatar(userId: string) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: SAFE_USER_SELECT,
    });

    if (current?.avatarUrl) {
      await this.storage
        .delete(STORAGE_BUCKETS.PROPERTY_DOCUMENTS, current.avatarUrl)
        .catch(() => undefined);
    }

    return updated;
  }

  async getAvatarUrl(userId: string): Promise<{ url: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (!user?.avatarUrl) {
      return { url: null };
    }

    const url = await this.storage.getSignedUrl(
      STORAGE_BUCKETS.PROPERTY_DOCUMENTS,
      user.avatarUrl,
      60 * 60,
    );

    return { url };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Everything an admin needs to know about one person in one call: the rooms
   * they occupy (their leases), their room requests, every document they have
   * uploaded, their payments and their maintenance tickets.
   */
  async getOverview(userId: string) {
    await this.findById(userId);

    const roomLocation = {
      select: {
        id: true,
        roomNumber: true,
        floor: { select: { floorNumber: true } },
        building: { select: { name: true, code: true } },
        property: { select: { name: true } },
      },
    } as const;

    const [
      leases,
      roomRequests,
      documents,
      payments,
      approvedPayments,
      paymentTotal,
      pendingPayments,
      maintenance,
      maintenanceTotal,
      openMaintenance,
    ] = await this.prisma.$transaction([
      this.prisma.lease.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          leaseNumber: true,
          status: true,
          startDate: true,
          endDate: true,
          monthlyRent: true,
          paymentSchedule: true,
          terminationDate: true,
          terminationReason: true,
          createdAt: true,
          room: roomLocation,
        },
      }),
      this.prisma.roomRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          desiredStartDate: true,
          note: true,
          rejectionReason: true,
          createdAt: true,
          room: { select: { id: true, roomNumber: true, monthlyRent: true } },
        },
      }),
      this.prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          documentType: true,
          title: true,
          fileType: true,
          fileSizeBytes: true,
          version: true,
          previousVersionId: true,
          status: true,
          rejectionReason: true,
          reviewedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          paymentNumber: true,
          amount: true,
          currency: true,
          status: true,
          monthsCovered: true,
          periodStartDate: true,
          periodEndDate: true,
          paymentDate: true,
          rejectionReason: true,
          createdAt: true,
          room: { select: { roomNumber: true } },
        },
      }),
      this.prisma.payment.findMany({
        where: { userId, status: PaymentStatus.APPROVED },
        select: { leaseId: true, periodEndDate: true },
      }),
      this.prisma.payment.count({ where: { userId } }),
      this.prisma.payment.count({
        where: { userId, status: PaymentStatus.PENDING },
      }),
      this.prisma.maintenanceRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          ticketNumber: true,
          issueTitle: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
          room: { select: { roomNumber: true } },
        },
      }),
      this.prisma.maintenanceRequest.count({ where: { userId } }),
      this.prisma.maintenanceRequest.count({
        where: {
          userId,
          status: {
            in: [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS],
          },
        },
      }),
    ]);

    // A lease is paid through the end of its last approved payment period.
    const paidThrough = new Map<string, Date>();
    for (const payment of approvedPayments) {
      const current = paidThrough.get(payment.leaseId);
      if (!current || payment.periodEndDate > current) {
        paidThrough.set(payment.leaseId, payment.periodEndDate);
      }
    }

    // Only the newest version of each document counts as "current".
    const replaced = new Set(
      documents.map((d) => d.previousVersionId).filter(Boolean),
    );
    const documentsWithFlag = documents.map((d) => ({
      ...d,
      isCurrent: !replaced.has(d.id),
    }));
    const currentDocuments = documentsWithFlag.filter((d) => d.isCurrent);

    const activeLeases = leases.filter(
      (l) => l.status === LeaseStatus.ACTIVE,
    );

    return {
      summary: {
        activeLeases: activeLeases.length,
        occupiedRooms: new Set(activeLeases.map((l) => l.room.id)).size,
        pendingRequests: roomRequests.filter(
          (r) => r.status === RequestStatus.PENDING,
        ).length,
        documentsAwaitingReview: currentDocuments.filter(
          (d) => d.status === DocumentStatus.PENDING,
        ).length,
        documentsRejected: currentDocuments.filter(
          (d) => d.status === DocumentStatus.REJECTED,
        ).length,
        pendingPayments,
        openMaintenance,
      },
      leases: leases.map((l) => ({
        ...l,
        paidThrough: paidThrough.get(l.id) ?? null,
      })),
      roomRequests,
      documents: documentsWithFlag,
      payments,
      paymentTotal,
      maintenance,
      maintenanceTotal,
    };
  }

  async findAll(query: ListUsersQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      registrationStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where = {
      ...(registrationStatus ? { registrationStatus } : {}),
      ...(search
        ? {
            OR: [
              {
                firstName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                lastName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                phone: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                leases: {
                  some: {
                    status: 'ACTIVE' as const,
                    room: {
                      roomNumber: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: SAFE_USER_SELECT,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  /**
   * Suspends a user account.
   *
   * Admin accounts cannot be suspended through this endpoint.
   * An audit record and notification are created after the status changes.
   */
  async suspend(
    adminId: string,
    userId: string,
    reason: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new BadRequestException(
        'User is already suspended',
      );
    }

    if (user.role === 'ADMIN') {
      throw new BadRequestException(
        'Admin accounts cannot be suspended through this endpoint',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.SUSPENDED,
      },
      select: SAFE_USER_SELECT,
    });

    await this.audit.log({
      actorId: adminId,
      action: AuditAction.SUSPEND,
      entityType: 'USER',
      entityId: userId,
      oldValue: {
        status: user.status,
      },
      newValue: {
        status: UserStatus.SUSPENDED,
        reason,
      },
    });

    await this.notifications.send({
      userId,
      type: NotificationType.SYSTEM,
      title: 'Account suspended',
      content: `Your account has been suspended: ${reason}`,
      channels: [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
      ],
    });

    return updated;
  }

  /**
   * Reactivates a previously suspended/inactive user account.
   */
  async reactivate(
    adminId: string,
    userId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException(
        'User is already active',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
      },
      select: SAFE_USER_SELECT,
    });

    await this.audit.log({
      actorId: adminId,
      action: AuditAction.ACTIVATE,
      entityType: 'USER',
      entityId: userId,
      oldValue: {
        status: user.status,
      },
      newValue: {
        status: UserStatus.ACTIVE,
      },
    });

    await this.notifications.send({
      userId,
      type: NotificationType.SYSTEM,
      title: 'Account reactivated',
      content:
        'Your account has been reactivated. You can log in again.',
      channels: [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
      ],
    });

    return updated;
  }

  /**
   * Approves or rejects a tenant's overall registration.
   *
   * Master Plan Section 6:
   * - An approved user can start using tenant functions.
   * - A rejected user can correct and re-upload documents and be re-reviewed.
   *
   * A notification and audit record are created after the
   * registration status is updated.
   */
  async reviewRegistration(
    adminId: string,
    userId: string,
    status:
      | typeof RegistrationStatus.APPROVED
      | typeof RegistrationStatus.REJECTED,
    rejectionReason?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      user.registrationStatus ===
        RegistrationStatus.APPROVED &&
      status === RegistrationStatus.APPROVED
    ) {
      throw new BadRequestException(
        'User is already approved',
      );
    }

    // A registration is reviewed on the strength of its documents, so
    // approval needs at least one that has not been rejected.
    if (status === RegistrationStatus.APPROVED) {
      const usableDocuments = await this.prisma.document.count({
        where: { userId, status: { not: DocumentStatus.REJECTED } },
      });

      if (usableDocuments === 0) {
        throw new BadRequestException(
          'This tenant has not uploaded any documents yet. Ask them to upload their documents before approving.',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        registrationStatus: status,
        rejectionReason:
          status === RegistrationStatus.REJECTED
            ? rejectionReason
            : null,
      },
      select: SAFE_USER_SELECT,
    });

    await this.audit.log({
      actorId: adminId,
      action:
        status === RegistrationStatus.APPROVED
          ? AuditAction.APPROVE
          : AuditAction.REJECT,
      entityType: 'USER',
      entityId: userId,
      newValue: {
        registrationStatus: status,
        rejectionReason,
      },
    });

    await this.notifications.send({
      userId,
      type: NotificationType.REGISTRATION,
      title:
        status === RegistrationStatus.APPROVED
          ? 'Registration approved'
          : 'Registration rejected',
      content:
        status === RegistrationStatus.APPROVED
          ? 'Your registration has been approved. You can now use all tenant features.'
          : `Your registration was rejected: ${rejectionReason}`,
      channels: [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
      ],
    });

    return updated;
  }
}
