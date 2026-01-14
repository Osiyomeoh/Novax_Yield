import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Import all schemas
import { Asset, AssetSchema } from '../schemas/asset.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { VerificationRequest, VerificationRequestSchema } from '../schemas/verification-request.schema';
// import { Attestor, AttestorSchema } from '../schemas/attestor.schema'; // Removed - attestor functionality deprecated
import { Settlement, SettlementSchema } from '../schemas/settlement.schema';
import { Operation, OperationSchema } from '../schemas/operation.schema';
import { Analytics, AnalyticsSchema } from '../schemas/analytics.schema';
import { AssetOwner, AssetOwnerSchema, OwnershipRecord, OwnershipRecordSchema, RevenueReport, RevenueReportSchema } from '../schemas/asset-owner.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Asset.name, schema: AssetSchema },
      { name: User.name, schema: UserSchema },
      { name: VerificationRequest.name, schema: VerificationRequestSchema },
      // { name: Attestor.name, schema: AttestorSchema }, // Removed - attestor functionality deprecated
      { name: Settlement.name, schema: SettlementSchema },
      { name: Operation.name, schema: OperationSchema },
      { name: Analytics.name, schema: AnalyticsSchema },
      { name: AssetOwner.name, schema: AssetOwnerSchema },
      { name: OwnershipRecord.name, schema: OwnershipRecordSchema },
      { name: RevenueReport.name, schema: RevenueReportSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
