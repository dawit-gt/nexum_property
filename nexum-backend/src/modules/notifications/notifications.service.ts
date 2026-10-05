import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../common/services/email.service';

import { TelegramService } from '../telegram/telegram.service';
import { TelegramConnectionsService } from '../telegram/telegram-connections.service';
import { SmsService } from '../sms/sms.service';
import { PushService } from '../push/push.service';

import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';
import { UpdateAdminNotificationPreferenceDto } from './dto/update-admin-notification-preference.dto';

export interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  channels: NotificationChannel[];
  actionUrl?: string;
}

const CHANNEL_PREFERENCE_FIELD: Record<NotificationChannel, string> = {
  EMAIL: 'emailEnabled',
  TELEGRAM: 'telegramEnabled',
  SMS: 'smsEnabled',
  IN_APP: 'inAppEnabled',
  PUSH: 'pushEnabled',
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly telegramService: TelegramService,
    private readonly telegramConnections: TelegramConnectionsService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {}

  // ---------- Preferences ----------

  async getOrCreatePreference(userId: string) {
    const existing =
      await this.prisma.notificationPreference.findUnique({
        where: { userId },
      });

    if (existing) return existing;

    return this.prisma.notificationPreference.create({
      data: { userId },
    });
  }

  async updatePreference(
    userId: string,
    dto: UpdateNotificationPreferenceDto,
  ) {
    await this.getOrCreatePreference(userId);

    return this.prisma.notificationPreference.update({
      where: { userId },
      data: dto,
    });
  }

  async getOrCreateAdminPreference(userId: string) {
    const existing =
      await this.prisma.adminNotificationPreference.findUnique({
        where: { userId },
      });

    if (existing) return existing;

    return this.prisma.adminNotificationPreference.create({
      data: { userId },
    });
  }

  async updateAdminPreference(
    userId: string,
    dto: UpdateAdminNotificationPreferenceDto,
  ) {
    await this.getOrCreateAdminPreference(userId);

    return this.prisma.adminNotificationPreference.update({
      where: { userId },
      data: dto,
    });
  }

  // ---------- Core send ----------

  /**
   * Creates the Notification row plus one NotificationDelivery per
   * requested channel that the user hasn't disabled.
   *
   * If every requested channel is disabled, IN_APP is still guaranteed
   * so that a notification is never silently dropped entirely.
   *
   * EMAIL, TELEGRAM, and PUSH are actually sent through their
   * respective services.
   *
   * SMS remains CREATED until an admin opens the SMS handoff.
   */
  async send(params: SendNotificationParams) {
    const prefs = await this.getOrCreatePreference(params.userId);

    const enabledChannels = params.channels.filter(
      (ch) =>
        prefs[
          CHANNEL_PREFERENCE_FIELD[ch] as keyof typeof prefs
        ] as boolean,
    );

    const channelsToUse =
      enabledChannels.length > 0
        ? enabledChannels
        : [NotificationChannel.IN_APP];

    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        content: params.content,
        type: params.type,
        actionUrl: params.actionUrl,
      },
    });

    const deliveries = await Promise.all(
      channelsToUse.map((channel) =>
        this.prisma.notificationDelivery.create({
          data: {
            notificationId: notification.id,
            channel,
            status:
              channel === NotificationChannel.IN_APP
                ? NotificationStatus.SENT
                : NotificationStatus.CREATED,
          },
        }),
      ),
    );

    // ---------- EMAIL ----------

    const emailDelivery = deliveries.find(
      (d) => d.channel === NotificationChannel.EMAIL,
    );

    if (emailDelivery) {
      const user = await this.prisma.user.findUnique({
        where: { id: params.userId },
        select: {
          email: true,
          firstName: true,
        },
      });

      if (user) {
        const result = await this.emailService.send({
          to: user.email,
          subject: params.title,
          html: this.buildEmailHtml(
            user.firstName,
            params.title,
            params.content,
          ),
        });

        await this.prisma.notificationDelivery.update({
          where: { id: emailDelivery.id },
          data: {
            status: result.success
              ? NotificationStatus.SENT
              : NotificationStatus.FAILED,
            errorMessage: result.error,
            attempts: 1,
          },
        });

        // Keep returned delivery object consistent with database.
        emailDelivery.status = result.success
          ? NotificationStatus.SENT
          : NotificationStatus.FAILED;

        emailDelivery.errorMessage = result.error ?? null;
        emailDelivery.attempts = 1;
      }
    }

    // ---------- PUSH ----------

    const pushDelivery = deliveries.find(
      (d) => d.channel === NotificationChannel.PUSH,
    );

    if (pushDelivery) {
      const result = await this.pushService.sendToUser(
        params.userId,
        params.title,
        params.content,
      );

      await this.prisma.notificationDelivery.update({
        where: { id: pushDelivery.id },
        data: {
          status: result.success
            ? NotificationStatus.SENT
            : NotificationStatus.FAILED,
          errorMessage: result.error,
          attempts: 1,
        },
      });

      // Keep returned delivery object consistent with database.
      pushDelivery.status = result.success
        ? NotificationStatus.SENT
        : NotificationStatus.FAILED;

      pushDelivery.errorMessage = result.error ?? null;
      pushDelivery.attempts = 1;
    }

    // ---------- TELEGRAM ----------

    const telegramDelivery = deliveries.find(
      (d) => d.channel === NotificationChannel.TELEGRAM,
    );

    if (telegramDelivery) {
      const connection =
        await this.telegramConnections.findForUser(params.userId);

      if (connection?.isActive) {
        const result = await this.telegramService.sendMessage(
          connection.chatId,
          `*${params.title}*\n\n${params.content}`,
        );

        await this.prisma.notificationDelivery.update({
          where: { id: telegramDelivery.id },
          data: {
            status: result.success
              ? NotificationStatus.SENT
              : NotificationStatus.FAILED,
            errorMessage: result.error,
            attempts: 1,
          },
        });

        // Keep returned delivery object consistent with database.
        telegramDelivery.status = result.success
          ? NotificationStatus.SENT
          : NotificationStatus.FAILED;

        telegramDelivery.errorMessage = result.error ?? null;
        telegramDelivery.attempts = 1;
      } else {
        await this.prisma.notificationDelivery.update({
          where: { id: telegramDelivery.id },
          data: {
            status: NotificationStatus.FAILED,
            errorMessage: 'Telegram not connected',
            attempts: 1,
          },
        });

        // Keep returned delivery object consistent with database.
        telegramDelivery.status = NotificationStatus.FAILED;
        telegramDelivery.errorMessage = 'Telegram not connected';
        telegramDelivery.attempts = 1;
      }
    }

    return {
      notification,
      deliveries,
    };
  }

  // ---------- SMS handoff ----------

  /**
   * Admin-triggered: builds the sms: link + QR code for one SMS delivery
   * and marks it OPENED_FOR_SENDING.
   *
   * Nexum does not mark the delivery SENT because the actual SMS is sent
   * from the administrator's own SMS application. The system therefore
   * cannot reliably know whether the administrator pressed "Send".
   */
  async getSmsHandoff(deliveryId: string) {
    const delivery =
      await this.prisma.notificationDelivery.findUnique({
        where: { id: deliveryId },
        include: {
          notification: {
            include: {
              user: true,
            },
          },
        },
      });

    if (!delivery) {
      throw new NotFoundException(
        'Notification delivery not found',
      );
    }

    if (delivery.channel !== NotificationChannel.SMS) {
      throw new BadRequestException(
        'This delivery is not an SMS channel',
      );
    }

    const { phone } = delivery.notification.user;

    const message = `${delivery.notification.title}: ${delivery.notification.content}`;

    const smsLink = this.smsService.buildSmsLink(
      phone,
      message,
    );

    const qrCodeDataUrl =
      await this.smsService.generateQrCodeDataUrl(smsLink);

    await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: NotificationStatus.OPENED_FOR_SENDING,
        deliveryDetails: {
          smsLink,
          phone,
        },
        attempts: {
          increment: 1,
        },
      },
    });

    return {
      smsLink,
      qrCodeDataUrl,
      phone,
    };
  }

  private buildEmailHtml(
    firstName: string,
    title: string,
    content: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #13293D;">${title}</h2>

        <p>Hi ${firstName},</p>

        <p>${content}</p>

        <p style="color: #888; font-size: 12px; margin-top: 32px;">
          — Nexum
        </p>
      </div>
    `;
  }

  // ---------- Reading ----------

  async findMine(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        isRead: unreadOnly ? false : undefined,
      },
      include: {
        deliveries: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { unreadCount: count };
  }

  async markAsRead(userId: string, id: string) {
    const notification =
      await this.prisma.notification.findUnique({
        where: { id },
      });

    if (!notification) {
      throw new NotFoundException(
        'Notification not found',
      );
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'This is not your notification',
      );
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    const result =
      await this.prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

    return {
      markedCount: result.count,
    };
  }
}
