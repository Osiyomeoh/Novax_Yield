import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { IPFSService } from './ipfs.service';
import { IPFSController } from './ipfs.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    AuthModule
  ],
  providers: [IPFSService],
  controllers: [IPFSController],
  exports: [IPFSService],
})
export class IPFSModule {}
