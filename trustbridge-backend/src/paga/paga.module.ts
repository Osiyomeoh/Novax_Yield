import { Module } from '@nestjs/common';
import { PagaService } from './paga.service';
import { PagaController } from './paga.controller';

@Module({
  providers: [PagaService],
  controllers: [PagaController],
  exports: [PagaService],
})
export class PagaModule {}

