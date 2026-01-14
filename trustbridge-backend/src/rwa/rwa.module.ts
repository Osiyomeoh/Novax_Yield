import { Module } from '@nestjs/common';
import { RWAController } from './rwa.controller';
import { RWAService } from './rwa.service';
import { ChainlinkRWAService } from './chainlink-rwa.service';
import { ChainlinkModule } from '../chainlink/chainlink.module';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [ChainlinkModule, AuthModule, AdminModule],
  controllers: [RWAController],
  providers: [RWAService, ChainlinkRWAService],
  exports: [RWAService, ChainlinkRWAService],
})
export class RWAModule {}
