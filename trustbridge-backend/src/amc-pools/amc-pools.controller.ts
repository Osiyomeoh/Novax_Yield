import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AMCPoolsService, CreateAMCPoolDto, InvestInPoolDto, DistributeDividendDto } from './amc-pools.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('amc-pools')
@UseGuards(JwtAuthGuard)
export class AMCPoolsController {
  constructor(private readonly amcPoolsService: AMCPoolsService) {}

  /**
   * Create a new AMC pool (AMC Admin only)
   */
  @Post()
  @UseGuards(AdminGuard)
  async createPool(@Body() createPoolDto: CreateAMCPoolDto, @Request() req) {
    const adminWallet = req.user.walletAddress;
    return await this.amcPoolsService.createPool(createPoolDto, adminWallet);
  }

  /**
   * Launch pool (create Hedera token and make active)
   */
  @Post(':poolId/launch')
  @UseGuards(AdminGuard)
  async launchPool(@Param('poolId') poolId: string, @Request() req) {
    const adminWallet = req.user.walletAddress;
    return await this.amcPoolsService.launchPool(poolId, adminWallet);
  }

  /**
   * Get all pools
   */
  @Get()
  async getAllPools(@Query('status') status?: string, @Query('type') type?: string) {
    if (status && type) {
      return await this.amcPoolsService.getAllPools().then(pools => 
        pools.filter(pool => pool.status === status && pool.type === type)
      );
    } else if (status) {
      return await this.amcPoolsService.getAllPools().then(pools => 
        pools.filter(pool => pool.status === status)
      );
    } else if (type) {
      return await this.amcPoolsService.getAllPools().then(pools => 
        pools.filter(pool => pool.type === type)
      );
    }
    return await this.amcPoolsService.getAllPools();
  }

  /**
   * Get active pools (for investment)
   */
  @Get('active')
  async getActivePools() {
    return await this.amcPoolsService.getActivePools();
  }

  /**
   * Get pool by ID
   */
  @Get(':poolId')
  async getPoolById(@Param('poolId') poolId: string) {
    return await this.amcPoolsService.getPoolById(poolId);
  }

  /**
   * Get pools by admin
   */
  @Get('admin/:adminWallet')
  @UseGuards(AdminGuard)
  async getPoolsByAdmin(@Param('adminWallet') adminWallet: string) {
    return await this.amcPoolsService.getPoolsByAdmin(adminWallet);
  }

  /**
   * Invest in pool
   */
  @Post(':poolId/invest')
  async investInPool(@Param('poolId') poolId: string, @Body() investDto: InvestInPoolDto, @Request() req) {
    investDto.poolId = poolId;
    investDto.investorAddress = req.user.walletAddress;
    return await this.amcPoolsService.investInPool(investDto);
  }

  /**
   * Distribute dividends (AMC Admin only)
   */
  @Post(':poolId/dividends')
  @UseGuards(AdminGuard)
  async distributeDividend(@Param('poolId') poolId: string, @Body() dividendDto: DistributeDividendDto, @Request() req) {
    dividendDto.poolId = poolId;
    const adminWallet = req.user.walletAddress;
    return await this.amcPoolsService.distributeDividend(dividendDto, adminWallet);
  }

  /**
   * Close pool (AMC Admin only)
   */
  @Put(':poolId/close')
  @UseGuards(AdminGuard)
  async closePool(@Param('poolId') poolId: string, @Request() req) {
    const adminWallet = req.user.walletAddress;
    return await this.amcPoolsService.closePool(poolId, adminWallet);
  }

  /**
   * Get pool statistics
   */
  @Get(':poolId/stats')
  async getPoolStats(@Param('poolId') poolId: string) {
    return await this.amcPoolsService.getPoolStats(poolId);
  }

  /**
   * Get investor's investments in a pool
   */
  @Get(':poolId/investments/:investorAddress')
  async getInvestorInvestments(@Param('poolId') poolId: string, @Param('investorAddress') investorAddress: string) {
    const pool = await this.amcPoolsService.getPoolById(poolId);
    const investments = pool.investments.filter(inv => inv.investorAddress === investorAddress);
    
    // Get projected ROI for this investor
    const projectedROI = await this.amcPoolsService.getInvestorProjectedROI(poolId, investorAddress);
    
    return {
      poolId: pool.poolId,
      poolName: pool.name,
      investorAddress,
      investments,
      totalInvested: investments.reduce((sum, inv) => sum + inv.amount, 0),
      totalTokens: investments.reduce((sum, inv) => sum + inv.tokens, 0),
      totalDividends: investments.reduce((sum, inv) => sum + inv.dividendsReceived, 0),
      projectedROI: projectedROI || null // Includes projected dividends, ROI, APY
    };
  }

  /**
   * Get investor's projected ROI for a pool
   * Accepts optional query params for on-chain investment data as fallback
   */
  @Get(':poolId/projected-roi/:investorAddress')
  async getInvestorProjectedROI(
    @Param('poolId') poolId: string, 
    @Param('investorAddress') investorAddress: string,
    @Query('onChainAmount') onChainAmount?: string,
    @Query('onChainTokens') onChainTokens?: string,
    @Query('investedAt') investedAt?: string
  ) {
    const onChainData = (onChainAmount && onChainTokens) ? {
      amount: parseFloat(onChainAmount),
      tokens: parseFloat(onChainTokens),
      investedAt: investedAt ? new Date(investedAt) : undefined
    } : undefined;
    
    return await this.amcPoolsService.getInvestorProjectedROI(poolId, investorAddress, onChainData);
  }

  /**
   * Get all investments for a pool (AMC Admin only)
   */
  @Get(':poolId/investments')
  @UseGuards(AdminGuard)
  async getPoolInvestments(@Param('poolId') poolId: string) {
    const pool = await this.amcPoolsService.getPoolById(poolId);
    return {
      poolId: pool.poolId,
      poolName: pool.name,
      totalInvestments: pool.totalInvested,
      totalInvested: pool.totalInvested,
      totalInvestors: pool.totalInvestors,
      investments: pool.investments
    };
  }

  /**
   * Update pool metadata (AMC Admin only)
   */
  @Put(':poolId/metadata')
  @UseGuards(AdminGuard)
  async updatePoolMetadata(@Param('poolId') poolId: string, @Body() metadata: any, @Request() req) {
    // TODO: Implement metadata update
    return { message: 'Metadata update not implemented yet' };
  }

  /**
   * Get pool trading data
   */
  @Get(':poolId/trading')
  async getPoolTradingData(@Param('poolId') poolId: string) {
    const pool = await this.amcPoolsService.getPoolById(poolId);
    return {
      poolId: pool.poolId,
      isTradeable: pool.isTradeable,
      currentPrice: pool.currentPrice,
      priceChange24h: pool.priceChange24h,
      tradingVolume: pool.tradingVolume,
      hederaTokenId: pool.hederaTokenId
    };
  }

  /**
   * Remove pools that are not on-chain (Admin only)
   */
  @Delete('cleanup/non-on-chain')
  @UseGuards(AdminGuard)
  async removeNonOnChainPools() {
    return await this.amcPoolsService.removeNonOnChainPools();
  }

  /**
   * Delete pool by ID (Admin only)
   */
  @Delete(':poolId')
  @UseGuards(AdminGuard)
  async deletePool(@Param('poolId') poolId: string, @Request() req) {
    const adminWallet = req.user.walletAddress;
    await this.amcPoolsService.deletePool(poolId, adminWallet);
    return { message: 'Pool deleted successfully', poolId };
  }
}
