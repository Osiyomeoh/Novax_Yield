import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { TradingOrder, TradingOrderSchema } from '../schemas/trading-order.schema';
import { TradeExecution, TradeExecutionSchema } from '../schemas/trade-execution.schema';
import { AMCPool, AMCPoolSchema } from '../schemas/amc-pool.schema';
import { MantleModule } from '../mantle/mantle.module';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TradingOrder.name, schema: TradingOrderSchema },
      { name: TradeExecution.name, schema: TradeExecutionSchema },
      { name: AMCPool.name, schema: AMCPoolSchema }
    ]),
    MantleModule,
    AuthModule,
    AdminModule
  ],
  controllers: [TradingController],
  providers: [TradingService],
  exports: [TradingService]
})
export class TradingModule {}