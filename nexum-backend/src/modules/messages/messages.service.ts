import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  LeaseStatus,
  MessageTargetType,
  NotificationChannel,
  NotificationType,
  RegistrationStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { NotificationsService } from '../notifications/notifications.service';

import { SendMessageDto } from './dto/send-message.dto';
import { AdminSendMessageDto } from './dto/admin-send-message.dto';
import { ListInboxQueryDto } from './dto/list-inbox-query.dto';

import { paginate } from '../../common/utils/paginate.util';

function addOneDay(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Tenant → Admin. Goes to every active admin — there's no concept of
   * "my specific admin" in a shared admin pool. Stored as targetType
   * SELECTED since the recipient set is explicit, even though the tenant
   * didn't manually pick it (it's computed).
   */
  async sendToAdmins(
    senderId: string,
    dto: SendMessageDto,
  ) {
    const admins = await this.prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    if (admins.length === 0) {
      throw new BadRequestException(
        'No active admin accounts to receive this message',
      );
    }

    return this.createMessageWithRecipients(
      senderId,
      dto.subject,
      dto.body,
      MessageTargetType.SELECTED,
      admins.map((a) => a.id),
    );
  }

  /**
   * Admin → users. Supports individual, selected, and group targets.
   */
  async sendFromAdmin(
    adminId: string,
    dto: AdminSendMessageDto,
  ) {
    const recipientIds = await this.resolveRecipients(dto);

    if (recipientIds.length === 0) {
      throw new BadRequestException(
        'No matching recipients for this target — nothing was sent',
      );
    }

    return this.createMessageWithRecipients(
      adminId,
      dto.subject,
      dto.body,
      dto.targetType,
      recipientIds,
      {
        propertyId: dto.propertyId,
        buildingId: dto.buildingId,
        floorId: dto.floorId,
      },
    );
  }

  private async resolveRecipients(
    dto: AdminSendMessageDto,
  ): Promise<string[]> {
    switch (dto.targetType) {
      case MessageTargetType.INDIVIDUAL: {
        const user = await this.prisma.user.findUnique({
          where: {
            id: dto.recipientId!,
          },
        });

        if (!user) {
          throw new NotFoundException('Recipient not found');
        }

        return [user.id];
      }

      case MessageTargetType.SELECTED: {
        const users = await this.prisma.user.findMany({
          where: {
            id: {
              in: dto.recipientIds!,
            },
          },
          select: {
            id: true,
          },
        });

        if (users.length !== dto.recipientIds!.length) {
          throw new BadRequestException(
            'One or more recipientIds do not exist',
          );
        }

        return users.map((u) => u.id);
      }

      case MessageTargetType.GROUP_ALL: {
        const users = await this.prisma.user.findMany({
          where: {
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            registrationStatus: RegistrationStatus.APPROVED,
          },
          select: {
            id: true,
          },
        });

        return users.map((u) => u.id);
      }

      case MessageTargetType.GROUP_PROPERTY: {
        const leases = await this.prisma.lease.findMany({
          where: {
            status: LeaseStatus.ACTIVE,
            room: {
              propertyId: dto.propertyId,
            },
          },
          select: {
            userId: true,
          },
          distinct: ['userId'],
        });

        return leases.map((l) => l.userId);
      }

      case MessageTargetType.GROUP_BUILDING: {
        const leases = await this.prisma.lease.findMany({
          where: {
            status: LeaseStatus.ACTIVE,
            room: {
              buildingId: dto.buildingId,
            },
          },
          select: {
            userId: true,
          },
          distinct: ['userId'],
        });

        return leases.map((l) => l.userId);
      }

      case MessageTargetType.GROUP_FLOOR: {
        const leases = await this.prisma.lease.findMany({
          where: {
            status: LeaseStatus.ACTIVE,
            room: {
              floorId: dto.floorId,
            },
          },
          select: {
            userId: true,
          },
          distinct: ['userId'],
        });

        return leases.map((l) => l.userId);
      }

      case MessageTargetType.GROUP_PAYMENTS_DUE_7_DAYS: {
        // Per-lease "next due date" isn't a single column, so this is
        // computed in JS from each lease's most recently approved payment.
        // Phase 8's scheduled job will reuse this same logic.
        const activeLeases = await this.prisma.lease.findMany({
          where: {
            status: LeaseStatus.ACTIVE,
          },
          include: {
            payments: {
              where: {
                status: 'APPROVED',
              },
              orderBy: {
                periodEndDate: 'desc',
              },
              take: 1,
            },
          },
        });

        const now = new Date();

        const in7Days = new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000,
        );

        const userIds = activeLeases
          .filter((lease) => {
            const lastPeriodEnd =
              lease.payments[0]?.periodEndDate;

            const nextDue = lastPeriodEnd
              ? addOneDay(lastPeriodEnd)
              : lease.startDate;

            return nextDue >= now && nextDue <= in7Days;
          })
          .map((lease) => lease.userId);

        return [...new Set(userIds)];
      }

      default:
        throw new BadRequestException(
          `Unsupported targetType: ${dto.targetType}`,
        );
    }
  }

  /**
   * Creates the message and its recipient rows, then sends an
   * in-app + email notification to every recipient.
   *
   * Group broadcasts read as announcements to the recipient;
   * direct messages read as regular system notifications.
   */
  private async createMessageWithRecipients(
    senderId: string,
    subject: string,
    body: string,
    targetType: MessageTargetType,
    recipientIds: string[],
    targetFilter?: Record<string, unknown>,
  ) {
    const message = await this.prisma.message.create({
      data: {
        senderId,
        subject,
        body,
        targetType,
        targetFilter: targetFilter
          ? JSON.parse(JSON.stringify(targetFilter))
          : undefined,
        recipients: {
          create: recipientIds.map((recipientId) => ({
            recipientId,
          })),
        },
      },
      include: {
        recipients: true,
      },
    });

    // Group broadcasts read as announcements to the recipient; a direct
    // message (tenant->admin, or admin->individual/selected) reads as a
    // regular system notification.
    const isBroadcast = targetType.startsWith('GROUP_');

    await Promise.all(
      recipientIds.map((userId) =>
        this.notifications.send({
          userId,
          type: isBroadcast
            ? NotificationType.ANNOUNCEMENT
            : NotificationType.SYSTEM,
          title: `New message: ${subject}`,
          content: body,
          channels: [
            NotificationChannel.IN_APP,
            NotificationChannel.EMAIL,
          ],
        }),
      ),
    );

    return message;
  }

  /**
   * Returns the current user's inbox with pagination and subject search.
   */
  async findInbox(
    userId: string,
    query: ListInboxQueryDto,
  ) {
    const {
      page = 1,
      limit = 20,
      search,
    } = query;

    const skip = (page - 1) * limit;

    const where = {
      recipientId: userId,
      ...(search
        ? {
            message: {
              subject: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.messageRecipient.findMany({
        where,
        include: {
          message: {
            select: {
              id: true,
              subject: true,
              body: true,
              senderId: true,
              createdAt: true,
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),

      this.prisma.messageRecipient.count({
        where,
      }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findSent(senderId: string) {
    return this.prisma.message.findMany({
      where: {
        senderId,
      },
      include: {
        recipients: {
          select: {
            recipientId: true,
            isRead: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.messageRecipient.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });

    return { unreadCount: count };
  }

  async markAsRead(
    userId: string,
    messageId: string,
  ) {
    const recipientRow =
      await this.prisma.messageRecipient.findUnique({
        where: {
          messageId_recipientId: {
            messageId,
            recipientId: userId,
          },
        },
      });

    if (!recipientRow) {
      throw new ForbiddenException(
        'You are not a recipient of this message',
      );
    }

    if (recipientRow.isRead) {
      return recipientRow;
    }

    return this.prisma.messageRecipient.update({
      where: {
        id: recipientRow.id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}
