import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { Asset, AssetSchema } from '../schemas/asset.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { VerificationRequest, VerificationRequestSchema } from '../schemas/verification-request.schema';
// import { Attestor, AttestorSchema } from '../schemas/attestor.schema'; // Removed - attestor functionality deprecated
import { Settlement, SettlementSchema } from '../schemas/settlement.schema';
import { Operation, OperationSchema } from '../schemas/operation.schema';
import { HederaModule } from '../hedera/hedera.module';
import { ChainlinkModule } from '../chainlink/chainlink.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PagaModule } from '../paga/paga.module';
// PaystackService removed - using direct API calls

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Asset.name, schema: AssetSchema },
      { name: User.name, schema: UserSchema },
      { name: VerificationRequest.name, schema: VerificationRequestSchema },
      // { name: Attestor.name, schema: AttestorSchema }, // Removed - attestor functionality deprecated
      { name: Settlement.name, schema: SettlementSchema },
      { name: Operation.name, schema: OperationSchema },
    ]),
    HederaModule,
    ChainlinkModule,
    WebSocketModule,
    NotificationsModule,
    PagaModule,
  ],
  controllers: [MobileController],
  providers: [MobileService],
  exports: [MobileService],
})
export class MobileModule {}
