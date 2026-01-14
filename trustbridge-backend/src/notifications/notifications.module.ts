import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { GmailService } from '../services/gmail.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, GmailService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
