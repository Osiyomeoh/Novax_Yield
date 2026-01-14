import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AMCPoolsController } from './amc-pools.controller';
import { AMCPoolsService } from './amc-pools.service';
import { ROICalculationService } from './roi-calculation.service';
import { AMCPool, AMCPoolSchema } from '../schemas/amc-pool.schema';
import { Asset, AssetSchema } from '../schemas/asset.schema';
import { AssetV2, AssetV2Schema } from '../schemas/asset-v2.schema';
import { HederaModule } from '../hedera/hedera.module';
import { MantleModule } from '../mantle/mantle.module';
import { AdminModule } from '../admin/admin.module';
import { AssetOwnersModule } from '../asset-owners/asset-owners.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AMCPool.name, schema: AMCPoolSchema },
      { name: Asset.name, schema: AssetSchema },
      { name: AssetV2.name, schema: AssetV2Schema }
    ]),
    HederaModule,
    MantleModule,
    AuthModule,
    AdminModule,
    forwardRef(() => AssetOwnersModule) // Use forwardRef to avoid circular dependency
  ],
  controllers: [AMCPoolsController],
  providers: [AMCPoolsService, ROICalculationService],
  exports: [AMCPoolsService, ROICalculationService]
})
export class AMCPoolsModule {}
