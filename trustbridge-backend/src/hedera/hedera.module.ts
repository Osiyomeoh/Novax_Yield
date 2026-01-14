import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HederaController } from './hedera.controller';
import { HederaService } from './hedera.service';
import { TrustTokenService } from './trust-token.service';
import { HscsContractService } from './hscs-contract.service';
import { HscsHybridService } from './hscs-hybrid.service';
import { MarketplaceService } from './marketplace.service';
import { HcsService } from './hcs.service';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
  ],
  controllers: [HederaController],
  providers: [HederaService, TrustTokenService, HscsContractService, HscsHybridService, MarketplaceService, HcsService],
  exports: [HederaService, TrustTokenService, HscsContractService, HscsHybridService, MarketplaceService, HcsService],
})
export class HederaModule {}
