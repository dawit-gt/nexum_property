import { Module } from '@nestjs/common';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    NotificationsModule,
    AuditModule,
  ],

  controllers: [DocumentsController],

  providers: [DocumentsService],

  exports: [DocumentsService],
})
export class DocumentsModule {}
