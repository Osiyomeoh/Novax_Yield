import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DividendsService, CreateDividendDto, ClaimDividendDto } from './dividends.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('dividends')
@UseGuards(JwtAuthGuard)
export class DividendsController {
  constructor(private readonly dividendsService: DividendsService) {}

  /**
   * Create a new dividend distribution (Admin only)
   */
  @Post('distributions')
  @UseGuards(AdminGuard)
  async createDividendDistribution(@Body() createDividendDto: CreateDividendDto, @Request() req) {
    const adminAddress = req.user.walletAddress;
    return await this.dividendsService.createDividendDistribution(createDividendDto, adminAddress);
  }

  /**
   * Execute dividend distribution (Admin only)
   */
  @Post('distributions/:distributionId/execute')
  @UseGuards(AdminGuard)
  async executeDividendDistribution(@Param('distributionId') distributionId: string, @Request() req) {
    const adminAddress = req.user.walletAddress;
    return await this.dividendsService.executeDividendDistribution(distributionId, adminAddress);
  }

  /**
   * Cancel dividend distribution (Admin only)
   */
  @Put('distributions/:distributionId/cancel')
  @UseGuards(AdminGuard)
  async cancelDividendDistribution(@Param('distributionId') distributionId: string, @Request() req) {
    const adminAddress = req.user.walletAddress;
    return await this.dividendsService.cancelDividendDistribution(distributionId, adminAddress);
  }

  /**
   * Claim dividend for a holder
   */
  @Post('claim')
  async claimDividend(@Body() claimDividendDto: ClaimDividendDto, @Request() req) {
    claimDividendDto.holderAddress = req.user.walletAddress;
    return await this.dividendsService.claimDividend(claimDividendDto);
  }

  /**
   * Get dividend distributions for a pool
   */
  @Get('distributions/pool/:poolId')
  async getPoolDividendDistributions(@Param('poolId') poolId: string) {
    return await this.dividendsService.getPoolDividendDistributions(poolId);
  }

  /**
   * Get user's dividend distributions
   */
  @Get('distributions/user')
  async getUserDividendDistributions(@Request() req) {
    const holderAddress = req.user.walletAddress;
    return await this.dividendsService.getUserDividendDistributions(holderAddress);
  }

  /**
   * Get dividend distribution by ID
   */
  @Get('distributions/:distributionId')
  async getDividendDistribution(@Param('distributionId') distributionId: string) {
    return await this.dividendsService.getDividendDistribution(distributionId);
  }

  /**
   * Get dividend statistics
   */
  @Get('stats')
  async getDividendStats(@Query('poolId') poolId?: string) {
    return await this.dividendsService.getDividendStats(poolId);
  }

  /**
   * Get upcoming dividend distributions
   */
  @Get('upcoming')
  async getUpcomingDividendDistributions() {
    return await this.dividendsService.getUpcomingDividendDistributions();
  }

  /**
   * Get all dividend distributions (Admin only)
   */
  @Get('distributions')
  @UseGuards(AdminGuard)
  async getAllDividendDistributions(@Query('status') status?: string) {
    // TODO: Implement filtering by status
    return { message: 'Get all dividend distributions endpoint not fully implemented yet' };
  }

  /**
   * Get dividend recipients for a distribution (Admin only)
   */
  @Get('distributions/:distributionId/recipients')
  @UseGuards(AdminGuard)
  async getDividendRecipients(@Param('distributionId') distributionId: string) {
    const distribution = await this.dividendsService.getDividendDistribution(distributionId);
    return {
      distributionId: distribution.distributionId,
      poolName: distribution.poolName,
      totalRecipients: distribution.totalRecipients,
      totalClaimed: distribution.totalClaimed,
      totalUnclaimed: distribution.totalUnclaimed,
      claimCount: distribution.claimCount,
      recipients: distribution.recipients
    };
  }

  /**
   * Get dividend analytics
   */
  @Get('analytics')
  async getDividendAnalytics(@Query('poolId') poolId?: string) {
    // TODO: Implement dividend analytics
    return { message: 'Dividend analytics endpoint not implemented yet' };
  }

  /**
   * Get dividend calendar
   */
  @Get('calendar')
  async getDividendCalendar(@Query('year') year?: number) {
    // TODO: Implement dividend calendar
    return { message: 'Dividend calendar endpoint not implemented yet' };
  }

  /**
   * Get dividend history for a specific holder
   */
  @Get('history/:holderAddress')
  async getDividendHistory(@Param('holderAddress') holderAddress: string) {
    // TODO: Implement dividend history
    return { message: 'Dividend history endpoint not implemented yet' };
  }

  /**
   * Bulk claim dividends for a holder
   */
  @Post('bulk-claim')
  async bulkClaimDividends(@Body() claimDto: { distributionIds: string[] }, @Request() req) {
    const holderAddress = req.user.walletAddress;
    
    try {
      const results = [];
      for (const distributionId of claimDto.distributionIds) {
        try {
          const result = await this.dividendsService.claimDividend({
            distributionId,
            holderAddress
          });
          results.push({ distributionId, success: true, result });
        } catch (error) {
          results.push({ distributionId, success: false, error: error.message });
        }
      }
      return results;
    } catch (error) {
      throw error;
    }
  }
}
