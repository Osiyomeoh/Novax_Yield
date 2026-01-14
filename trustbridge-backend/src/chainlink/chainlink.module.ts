import { Module } from '@nestjs/common';
import { ChainlinkController } from './chainlink.controller';
import { ChainlinkService } from './chainlink.service';
import { ChainlinkExternalService } from './chainlink-external.service';

@Module({
  controllers: [ChainlinkController],
  providers: [ChainlinkService, ChainlinkExternalService],
  exports: [ChainlinkService, ChainlinkExternalService],
})
export class ChainlinkModule {}
