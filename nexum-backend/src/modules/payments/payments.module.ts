import { Module } from '@nestjs/common';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    NotificationsModule,
    AuditModule,
  ],

  controllers: [PaymentsController],

  providers: [PaymentsService],

  exports: [PaymentsService],
})
export class PaymentsModule {}
