import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TokenomicsController } from './tokenomics.controller';
import { TokenomicsService } from './tokenomics.service';
import { GovernanceService } from './governance.service';
import { StakingService } from './staking.service';
import { RevenueService } from './revenue.service';
import { HederaModule } from '../hedera/hedera.module';
import { AuthModule } from '../auth/auth.module';
import { Payment, PaymentSchema } from '../schemas/payment.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { ProposalModel } from '../models/governance.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: User.name, schema: UserSchema },
      { name: 'Proposal', schema: ProposalModel.schema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
    HederaModule,
    AuthModule,
  ],
  controllers: [TokenomicsController],
  providers: [
    TokenomicsService,
    GovernanceService,
    StakingService,
    RevenueService,
  ],
  exports: [
    TokenomicsService,
    GovernanceService,
    StakingService,
    RevenueService,
  ],
})
export class TokenomicsModule {}
