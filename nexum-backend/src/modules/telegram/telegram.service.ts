import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
  Inject,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { TelegramConnectionsService } from './telegram-connections.service';

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
    from?: { username?: string };
  };
}

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token?: string;
  private readonly apiBase: string;
  private stopped = false;
  private offset = 0;

  constructor(
    private readonly config: ConfigService,
    @Inject(forwardRef(() => TelegramConnectionsService))
    private readonly connections: TelegramConnectionsService,
  ) {
    this.token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    this.apiBase = `https://api.telegram.org/bot${this.token}`;
  }

  onModuleInit() {
    if (!this.token) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN not set — Telegram notifications and /start handling are disabled.',
      );
      return;
    }

    this.pollLoop();
  }

  onModuleDestroy() {
    this.stopped = true;
  }

  async sendMessage(
    chatId: string,
    text: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.token) {
      return {
        success: false,
        error: 'TELEGRAM_BOT_TOKEN not configured',
      };
    }

    try {
      const res = await fetch(`${this.apiBase}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        return {
          success: false,
          error:
            data.description ??
            'Unknown Telegram API error',
        };
      }

      return {
        success: true,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);

      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Long polling — repeatedly asks Telegram for new updates instead of
   * requiring a public HTTPS webhook. Works fine on localhost; for a real
   * production deploy later, a webhook is more efficient, but polling is
   * simpler and entirely sufficient for a project this size.
   */
  private async pollLoop() {
    while (!this.stopped) {
      try {
        const res = await fetch(
          `${this.apiBase}/getUpdates?offset=${this.offset}&timeout=25`,
        );

        const data = await res.json();

        if (data.ok) {
          for (const update of data.result as TelegramUpdate[]) {
            this.offset = update.update_id + 1;
            await this.handleUpdate(update);
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);

        this.logger.error(
          `Telegram polling error: ${message}`,
        );

        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  private async handleUpdate(update: TelegramUpdate) {
    const text = update.message?.text;
    const chatId = update.message?.chat?.id;

    if (!text || !chatId) {
      return;
    }

    if (text.startsWith('/start')) {
      const code = text.split(' ')[1]?.trim();
      const username = update.message?.from?.username;

      if (!code) {
        await this.sendMessage(
          String(chatId),
          'Welcome to Nexum. Please use the connect link from the app to link your account.',
        );

        return;
      }

      await this.connections.handleStartCode(
        code,
        String(chatId),
        username,
      );
    }
  }
}
