import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { TradingService, CreateOrderDto } from './trading.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('trading')
@UseGuards(JwtAuthGuard)
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  /**
   * Create a new trading order
   */
  @Post('orders')
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    const traderAddress = req.user.walletAddress;
    return await this.tradingService.createOrder(createOrderDto, traderAddress);
  }

  /**
   * Cancel a trading order
   */
  @Put('orders/:orderId/cancel')
  async cancelOrder(@Param('orderId') orderId: string, @Request() req) {
    const traderAddress = req.user.walletAddress;
    return await this.tradingService.cancelOrder(orderId, traderAddress);
  }

  /**
   * Get order book for a pool
   */
  @Get('orderbook/:poolId')
  async getOrderBook(
    @Param('poolId') poolId: string,
    @Query('depth') depth?: number
  ) {
    return await this.tradingService.getOrderBook(poolId, depth || 20);
  }

  /**
   * Get user's trading orders
   */
  @Get('orders')
  async getUserOrders(
    @Request() req,
    @Query('poolId') poolId?: string
  ) {
    const traderAddress = req.user.walletAddress;
    return await this.tradingService.getUserOrders(traderAddress, poolId);
  }

  /**
   * Get user's trade history
   */
  @Get('trades/history')
  async getUserTradeHistory(
    @Request() req,
    @Query('poolId') poolId?: string
  ) {
    const traderAddress = req.user.walletAddress;
    return await this.tradingService.getUserTradeHistory(traderAddress, poolId);
  }

  /**
   * Get recent trades for a pool
   */
  @Get('trades/recent/:poolId')
  async getRecentTrades(
    @Param('poolId') poolId: string,
    @Query('limit') limit?: number
  ) {
    return await this.tradingService.getRecentTrades(poolId, limit || 50);
  }

  /**
   * Get trading statistics for a pool
   */
  @Get('stats/:poolId')
  async getPoolTradingStats(@Param('poolId') poolId: string) {
    return await this.tradingService.getPoolTradingStats(poolId);
  }

  /**
   * Get market data for all pools
   */
  @Get('markets')
  async getMarketData() {
    // TODO: Implement market data aggregation
    return { message: 'Market data endpoint not implemented yet' };
  }

  /**
   * Get trading pairs
   */
  @Get('pairs')
  async getTradingPairs() {
    // TODO: Implement trading pairs
    return { message: 'Trading pairs endpoint not implemented yet' };
  }

  /**
   * Get price history for a pool
   */
  @Get('price-history/:poolId')
  async getPriceHistory(
    @Param('poolId') poolId: string,
    @Query('timeframe') timeframe?: string,
    @Query('limit') limit?: number
  ) {
    // TODO: Implement price history
    return { message: 'Price history endpoint not implemented yet' };
  }

  /**
   * Get trading fees
   */
  @Get('fees')
  async getTradingFees() {
    return {
      makerFee: 0.001, // 0.1%
      takerFee: 0.001, // 0.1%
      withdrawalFee: 0.0001, // 0.01%
      depositFee: 0
    };
  }

  /**
   * Get trading limits
   */
  @Get('limits')
  async getTradingLimits() {
    return {
      minOrderSize: 1,
      maxOrderSize: 1000000,
      minPrice: 0.01,
      maxPrice: 1000000,
      dailyVolumeLimit: 1000000
    };
  }
}