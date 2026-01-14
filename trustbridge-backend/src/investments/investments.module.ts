import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';
import { Investment, InvestmentSchema } from '../schemas/investment.schema';
import { HederaModule } from '../hedera/hedera.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Investment.name, schema: InvestmentSchema }]),
    HederaModule,
  ],
  controllers: [InvestmentsController],
  providers: [InvestmentsService],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
