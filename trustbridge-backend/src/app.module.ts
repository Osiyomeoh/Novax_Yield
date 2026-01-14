import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Core modules
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';

// Feature modules
import { AssetsModule } from './assets/assets.module';
import { InvestmentsModule } from './investments/investments.module';
import { VerificationModule } from './verification/verification.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TradingModule } from './trading/trading.module';
import { AMCModule } from './amc/amc.module';
import { AMCPoolsModule } from './amc-pools/amc-pools.module';
import { PoolTokensModule } from './pool-tokens/pool-tokens.module';
import { DividendsModule } from './dividends/dividends.module';
import { RWAModule } from './rwa/rwa.module';
import { CollectionsModule } from './collections/collections.module';
import { RoyaltiesModule } from './royalties/royalties.module';

// Service modules
import { HederaModule } from './hedera/hedera.module';
import { MantleModule } from './mantle/mantle.module';
import { ChainlinkModule } from './chainlink/chainlink.module';
import { UsersModule } from './users/users.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebSocketModule } from './websocket/websocket.module';
import { AdminModule } from './admin/admin.module';
import { PublicModule } from './public/public.module';
import { MobileModule } from './mobile/mobile.module';
import { PaymentsModule } from './payments/payments.module';
import { ExternalApisModule } from './external-apis/external-apis.module';
import { TokenomicsModule } from './tokenomics/tokenomics.module';
import { IPFSModule } from './ipfs/ipfs.module';
import { PoolsModule } from './pools/pools.module';
import { HealthModule } from './health/health.module';
import { ApiModule } from './api/api.module';
import { ActivityModule } from './activity/activity.module';
import { KycModule } from './kyc/kyc.module';
import { AIModule } from './ai/ai.module';
import { PagaModule } from './paga/paga.module';
import { AssetOwnersModule } from './asset-owners/asset-owners.module';

import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/trustbridge',
      {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      }
    ),


    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Scheduling
    ScheduleModule.forRoot(),

    // Event emitter
    EventEmitterModule.forRoot(),

    // Core modules
    DatabaseModule,
    AuthModule,

    // Feature modules
    AssetsModule,
    InvestmentsModule,
    VerificationModule,
    PortfolioModule,
    AnalyticsModule,
    TradingModule,
    AMCModule,
    AMCPoolsModule,
    PoolTokensModule,
    DividendsModule,
    RWAModule,
    CollectionsModule,
    RoyaltiesModule,

    // Service modules
    HederaModule,
    MantleModule, // New Mantle service module
    ChainlinkModule,
    UsersModule,
    FileUploadModule,
    NotificationsModule,
    WebSocketModule,
    AdminModule,
    PublicModule,
    MobileModule,
    PaymentsModule,
    ExternalApisModule,
    TokenomicsModule,
    IPFSModule,
    PoolsModule,
    HealthModule,
    ApiModule,
    ActivityModule,
    KycModule,
    AIModule,
    PagaModule,
    AssetOwnersModule,
  ],
})
export class AppModule {}
