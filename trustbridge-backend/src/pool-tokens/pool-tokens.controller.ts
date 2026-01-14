import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PoolTokensService, TransferTokensDto, ClaimDividendDto, StakeTokensDto } from './pool-tokens.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('pool-tokens')
@UseGuards(JwtAuthGuard)
export class PoolTokensController {
  constructor(private readonly poolTokensService: PoolTokensService) {}

  /**
   * Get user's pool token holdings
   */
  @Get('holdings')
  async getUserHoldings(@Request() req) {
    const holderAddress = req.user.walletAddress;
    return await this.poolTokensService.getUserHoldings(holderAddress);
  }

  /**
   * Get specific pool token holding
   */
  @Get('holdings/:poolId')
  async getPoolHolding(@Param('poolId') poolId: string, @Request() req) {
    const holderAddress = req.user.walletAddress;
    return await this.poolTokensService.getPoolHolding(holderAddress, poolId);
  }

  /**
   * Get portfolio summary
   */
  @Get('portfolio/summary')
  async getPortfolioSummary(@Request() req) {
    const holderAddress = req.user.walletAddress;
    return await this.poolTokensService.getPortfolioSummary(holderAddress);
  }

  /**
   * Transfer tokens between addresses
   */
  @Post('transfer')
  async transferTokens(@Body() transferDto: TransferTokensDto, @Request() req) {
    // Use sender from request if not specified
    if (!transferDto.fromAddress) {
      transferDto.fromAddress = req.user.walletAddress;
    }
    return await this.poolTokensService.transferTokens(transferDto);
  }

  /**
   * Claim dividends
   */
  @Post('claim-dividends')
  async claimDividends(@Body() claimDto: ClaimDividendDto, @Request() req) {
    claimDto.holderAddress = req.user.walletAddress;
    return await this.poolTokensService.claimDividends(claimDto);
  }

  /**
   * Stake tokens for rewards
   */
  @Post('stake')
  async stakeTokens(@Body() stakeDto: StakeTokensDto, @Request() req) {
    stakeDto.holderAddress = req.user.walletAddress;
    return await this.poolTokensService.stakeTokens(stakeDto);
  }

  /**
   * Unstake tokens
   */
  @Put('unstake/:poolId/:stakingId')
  async unstakeTokens(@Param('poolId') poolId: string, @Param('stakingId') stakingId: string, @Request() req) {
    const holderAddress = req.user.walletAddress;
    return await this.poolTokensService.unstakeTokens(holderAddress, poolId, stakingId);
  }

  /**
   * Update dividend distribution (Admin only)
   */
  @Post('distribute-dividends')
  @UseGuards(AdminGuard)
  async distributeDividends(
    @Body() dividendDto: {
      poolId: string;
      dividendAmount: number;
      perToken: number;
      description: string;
    }
  ) {
    return await this.poolTokensService.updateDividendDistribution(
      dividendDto.poolId,
      dividendDto.dividendAmount,
      dividendDto.perToken,
      dividendDto.description
    );
  }

  /**
   * Get token transfer history
   */
  @Get('transfers/:poolId')
  async getTransferHistory(@Param('poolId') poolId: string, @Request() req) {
    const holderAddress = req.user.walletAddress;
    const holding = await this.poolTokensService.getPoolHolding(holderAddress, poolId);
    return holding.transfers;
  }

  /**
   * Get dividend history
   */
  @Get('dividends/:poolId')
  async getDividendHistory(@Param('poolId') poolId: string, @Request() req) {
    const holderAddress = req.user.walletAddress;
    const holding = await this.poolTokensService.getPoolHolding(holderAddress, poolId);
    return holding.dividends;
  }

  /**
   * Get staking records
   */
  @Get('staking/:poolId')
  async getStakingRecords(@Param('poolId') poolId: string, @Request() req) {
    const holderAddress = req.user.walletAddress;
    const holding = await this.poolTokensService.getPoolHolding(holderAddress, poolId);
    return holding.stakingRecords;
  }

  /**
   * Get unclaimed dividends
   */
  @Get('unclaimed-dividends')
  async getUnclaimedDividends(@Request() req) {
    const holderAddress = req.user.walletAddress;
    const holdings = await this.poolTokensService.getUserHoldings(holderAddress);
    
    const unclaimedDividends = holdings.flatMap(holding => 
      holding.dividends
        .filter(dividend => !dividend.isClaimed)
        .map(dividend => ({
          ...dividend,
          poolId: holding.poolId,
          poolName: holding.poolName,
          holderAddress: holding.holderAddress
        }))
    );

    return unclaimedDividends;
  }

  /**
   * Get portfolio performance analytics
   */
  @Get('portfolio/analytics')
  async getPortfolioAnalytics(@Request() req) {
    const holderAddress = req.user.walletAddress;
    const holdings = await this.poolTokensService.getUserHoldings(holderAddress);
    
    const analytics = {
      totalHoldings: holdings.length,
      totalValue: holdings.reduce((sum, h) => sum + h.currentValue, 0),
      totalInvested: holdings.reduce((sum, h) => sum + h.totalInvested, 0),
      totalPnL: holdings.reduce((sum, h) => sum + h.totalPnL, 0),
      totalDividends: holdings.reduce((sum, h) => sum + h.totalDividendsReceived, 0),
      bestPerformer: holdings.length > 0 ? holdings.reduce((best, current) => 
        current.roi > best.roi ? current : best
      ) : null,
      worstPerformer: holdings.length > 0 ? holdings.reduce((worst, current) => 
        current.roi < worst.roi ? current : worst
      ) : null,
      riskDistribution: holdings.reduce((acc, holding) => {
        const risk = holding.metadata.riskLevel;
        acc[risk] = (acc[risk] || 0) + holding.currentValue;
        return acc;
      }, {} as Record<string, number>),
      poolTypeDistribution: holdings.reduce((acc, holding) => {
        const type = holding.metadata.poolType;
        acc[type] = (acc[type] || 0) + holding.currentValue;
        return acc;
      }, {} as Record<string, number>)
    };

    return analytics;
  }

  /**
   * Get token balance for a specific pool
   */
  @Get('balance/:poolId')
  async getTokenBalance(@Param('poolId') poolId: string, @Request() req) {
    const holderAddress = req.user.walletAddress;
    try {
      const holding = await this.poolTokensService.getPoolHolding(holderAddress, poolId);
      return {
        poolId: holding.poolId,
        poolName: holding.poolName,
        totalTokens: holding.totalTokens,
        availableTokens: holding.availableTokens,
        lockedTokens: holding.lockedTokens,
        currentValue: holding.currentValue,
        totalPnL: holding.totalPnL,
        roi: holding.roi
      };
    } catch (error) {
      return {
        poolId,
        poolName: '',
        totalTokens: 0,
        availableTokens: 0,
        lockedTokens: 0,
        currentValue: 0,
        totalPnL: 0,
        roi: 0
      };
    }
  }
}
