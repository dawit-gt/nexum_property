import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import {
  AuditAction,
  NotificationChannel,
  NotificationType,
  RegistrationStatus,
  UserStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

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
  ) {}

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
