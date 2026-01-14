import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AMCService } from './amc.service';
import { AMCController } from './amc.controller';
import { MantleModule } from '../mantle/mantle.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GmailService } from '../services/gmail.service';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
  imports: [
    MantleModule,
    NotificationsModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AMCController],
  providers: [AMCService, GmailService],
  exports: [AMCService],
})
export class AMCModule {}
