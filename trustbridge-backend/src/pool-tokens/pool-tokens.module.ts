import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PoolTokensController } from './pool-tokens.controller';
import { PoolTokensService } from './pool-tokens.service';
import { PoolTokenHoldings, PoolTokenHoldingsSchema } from '../schemas/pool-token-holdings.schema';
import { AMCPool, AMCPoolSchema } from '../schemas/amc-pool.schema';
import { HederaModule } from '../hedera/hedera.module';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PoolTokenHoldings.name, schema: PoolTokenHoldingsSchema },
      { name: AMCPool.name, schema: AMCPoolSchema }
    ]),
    HederaModule,
    AuthModule,
    AdminModule
  ],
  controllers: [PoolTokensController],
  providers: [PoolTokensService],
  exports: [PoolTokensService]
})
export class PoolTokensModule {}
