import { Module } from '@nestjs/common';
import { NovaxService } from './novax.service';

@Module({
  providers: [NovaxService],
  exports: [NovaxService],
})
export class NovaxModule {}


