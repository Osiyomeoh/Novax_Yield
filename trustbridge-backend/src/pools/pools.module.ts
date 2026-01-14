import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PoolsController } from './pools.controller';
import { PoolsService } from './pools.service';
import { Pool, PoolSchema } from '../schemas/pool.schema';
import { Asset, AssetSchema } from '../schemas/asset.schema';
import { HederaModule } from '../hedera/hedera.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pool.name, schema: PoolSchema },
      { name: Asset.name, schema: AssetSchema }
    ]),
    HederaModule,
    AuthModule
  ],
  controllers: [PoolsController],
  providers: [PoolsService],
  exports: [PoolsService]
})
export class PoolsModule {}
