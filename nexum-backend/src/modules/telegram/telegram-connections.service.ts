import { forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { TelegramService } from './telegram.service';

interface PendingCode {
  userId: string;
  expiresAt: number;
}

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Connect codes live in memory, not the database — they're short-lived
 * (10 min) and regenerable, so losing them on a server restart is a
 * non-issue, and it avoids a whole extra table for a throwaway value.
 */
@Injectable()
export class TelegramConnectionsService {
  private readonly logger = new Logger(TelegramConnectionsService.name);
  private readonly pendingCodes = new Map<string, PendingCode>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    // forwardRef breaks the circular dependency: TelegramService needs
    // TelegramConnectionsService (to look up codes), and this class now
    // needs TelegramService back (to send the confirmation message).
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
  ) {}

  generateConnectLink(userId: string) {
    const code = randomBytes(8).toString('hex');
    this.pendingCodes.set(code, { userId, expiresAt: Date.now() + CODE_TTL_MS });

    const botUsername = this.config.get<string>('TELEGRAM_BOT_USERNAME');
    const deepLink = botUsername ? `https://t.me/${botUsername}?start=${code}` : undefined;

    return {
      code,
      deepLink,
      expiresInSeconds: CODE_TTL_MS / 1000,
    };
  }

  /** Called by TelegramService when a /start <code> message arrives. */
  async handleStartCode(code: string, chatId: string, telegramUsername?: string) {
    const pending = this.pendingCodes.get(code);
    if (!pending || pending.expiresAt < Date.now()) {
      this.pendingCodes.delete(code);
      this.logger.warn(`Rejected expired/invalid Telegram connect code from chat ${chatId}`);
      await this.telegramService.sendMessage(
        chatId,
        'This connect link has expired or is invalid. Please generate a new one from the app.',
      );
      return;
    }

    this.pendingCodes.delete(code);

    await this.prisma.telegramConnection.upsert({
      where: { userId: pending.userId },
      create: { userId: pending.userId, chatId, telegramUsername, isActive: true },
      update: { chatId, telegramUsername, isActive: true },
    });

    await this.telegramService.sendMessage(
      chatId,
      '✅ Connected! You will now receive Nexum notifications here.',
    );
  }

  async findForUser(userId: string) {
    return this.prisma.telegramConnection.findUnique({ where: { userId } });
  }

  async disconnect(userId: string) {
    const existing = await this.prisma.telegramConnection.findUnique({ where: { userId } });
    if (!existing) {
      throw new NotFoundException('No Telegram connection to disconnect');
    }
    return this.prisma.telegramConnection.update({
      where: { userId },
      data: { isActive: false },
    });
  }
}
