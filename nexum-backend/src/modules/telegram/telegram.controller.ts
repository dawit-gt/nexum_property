import { Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TelegramConnectionsService } from './telegram-connections.service';
import { TelegramService } from './telegram.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('telegram')
@ApiBearerAuth()
@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly connections: TelegramConnectionsService,
    private readonly telegramService: TelegramService,
  ) {}

  @Post('connect')
  @ApiOperation({ summary: 'Generate a one-time link to connect Telegram (valid 10 minutes)' })
  connect(@CurrentUser() user: AuthenticatedUser) {
    return this.connections.generateConnectLink(user.id);
  }

  @Get('status')
  @ApiOperation({ summary: 'Check whether Telegram is connected' })
  async status(@CurrentUser() user: AuthenticatedUser) {
    const connection = await this.connections.findForUser(user.id);
    return {
      connected: !!connection?.isActive,
      telegramUsername: connection?.telegramUsername ?? null,
    };
  }

  @Delete('connect')
  @ApiOperation({ summary: 'Disconnect Telegram' })
  disconnect(@CurrentUser() user: AuthenticatedUser) {
    return this.connections.disconnect(user.id);
  }
}
