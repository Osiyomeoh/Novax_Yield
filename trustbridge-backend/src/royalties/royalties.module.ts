import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoyaltiesController } from './royalties.controller';
import { RoyaltiesService } from './royalties.service';
import { RoyaltyPayment, RoyaltyPaymentSchema, CreatorRoyaltyStats, CreatorRoyaltyStatsSchema } from '../schemas/royalty.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoyaltyPayment.name, schema: RoyaltyPaymentSchema },
      { name: CreatorRoyaltyStats.name, schema: CreatorRoyaltyStatsSchema },
    ]),
  ],
  controllers: [RoyaltiesController],
  providers: [RoyaltiesService],
  exports: [RoyaltiesService],
})
export class RoyaltiesModule {}

