import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { KeepAliveService } from './keep-alive.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, KeepAliveService],
})
export class HealthModule {}
