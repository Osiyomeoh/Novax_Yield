import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DividendsController } from './dividends.controller';
import { DividendsService } from './dividends.service';
import { DividendDistribution, DividendDistributionSchema } from '../schemas/dividend-distribution.schema';
import { PoolTokenHoldings, PoolTokenHoldingsSchema } from '../schemas/pool-token-holdings.schema';
import { AMCPool, AMCPoolSchema } from '../schemas/amc-pool.schema';
import { MantleModule } from '../mantle/mantle.module';
import { AdminModule } from '../admin/admin.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DividendDistribution.name, schema: DividendDistributionSchema },
      { name: PoolTokenHoldings.name, schema: PoolTokenHoldingsSchema },
      { name: AMCPool.name, schema: AMCPoolSchema }
    ]),
    MantleModule,
    AuthModule,
    AdminModule
  ],
  controllers: [DividendsController],
  providers: [DividendsService],
  exports: [DividendsService]
})
export class DividendsModule {}
