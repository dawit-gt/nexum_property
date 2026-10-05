import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../../database/prisma.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly configured: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT');

    this.configured = !!(publicKey && privateKey && subject);
    if (this.configured) {
      webpush.setVapidDetails(subject!, publicKey!, privateKey!);
    } else {
      this.logger.warn('VAPID keys not fully configured — Web Push notifications are disabled.');
    }
  }

  getPublicKey(): string | undefined {
    return this.config.get<string>('VAPID_PUBLIC_KEY');
  }

  async subscribe(userId: string, dto: SubscribePushDto) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: { userId, ...dto },
      update: { userId, p256dh: dto.p256dh, auth: dto.auth, userAgent: dto.userAgent },
    });
  }

  async unsubscribe(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  /**
   * Sends to every device the user has subscribed on (a user may have
   * several browsers/devices). An individual dead subscription (410 Gone —
   * the browser unregistered it) is cleaned up automatically rather than
   * treated as a hard failure; the overall send only fails if EVERY
   * subscription fails.
   */
  async sendToUser(userId: string, title: string, body: string): Promise<{ success: boolean; error?: string }> {
    if (!this.configured) {
      return { success: false, error: 'Web Push is not configured (missing VAPID keys)' };
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) {
      return { success: false, error: 'No push subscriptions for this user' };
    }

    const payload = JSON.stringify({ title, body });
    let anySucceeded = false;
    let lastError: string | undefined;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        anySucceeded = true;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is dead — the browser unregistered it. Clean up
          // rather than retry forever.
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return anySucceeded ? { success: true } : { success: false, error: lastError ?? 'All subscriptions failed' };
  }
}
