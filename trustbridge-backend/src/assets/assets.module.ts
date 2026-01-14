import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { Asset, AssetSchema } from '../schemas/asset.schema';
import { AssetV2, AssetV2Schema } from '../schemas/asset-v2.schema';
import { ApiModule } from '../api/api.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Asset.name, schema: AssetSchema },
      { name: AssetV2.name, schema: AssetV2Schema }
    ]),
    ApiModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
