import { Module } from '@nestjs/common';
import { MantleService } from './mantle.service';

@Module({
  providers: [MantleService],
  exports: [MantleService],
})
export class MantleModule {}

