import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetOwnersController } from './asset-owners.controller';
import { AssetOwnersService } from './asset-owners.service';
import { FraudPreventionService } from './fraud-prevention.service';
import { AssetOwner, AssetOwnerSchema, OwnershipRecord, OwnershipRecordSchema, RevenueReport, RevenueReportSchema } from '../schemas/asset-owner.schema';
import { MantleModule } from '../mantle/mantle.module';
import { AMCPoolsModule } from '../amc-pools/amc-pools.module';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AssetOwner.name, schema: AssetOwnerSchema },
      { name: OwnershipRecord.name, schema: OwnershipRecordSchema },
      { name: RevenueReport.name, schema: RevenueReportSchema },
    ]),
    MantleModule,
    AuthModule, // Required for JwtAuthGuard (provides JwtService and AuthService)
    AdminModule, // Required for AdminGuard (provides AdminService)
    forwardRef(() => AMCPoolsModule), // Use forwardRef to avoid circular dependency
  ],
  controllers: [AssetOwnersController],
  providers: [AssetOwnersService, FraudPreventionService],
  exports: [AssetOwnersService, FraudPreventionService],
})
export class AssetOwnersModule {}

