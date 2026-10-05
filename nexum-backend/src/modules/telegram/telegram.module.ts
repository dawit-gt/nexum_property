import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { TelegramConnectionsService } from './telegram-connections.service';

@Module({
  controllers: [TelegramController],
  providers: [TelegramService, TelegramConnectionsService],
  exports: [TelegramService, TelegramConnectionsService],
})
export class TelegramModule {}
