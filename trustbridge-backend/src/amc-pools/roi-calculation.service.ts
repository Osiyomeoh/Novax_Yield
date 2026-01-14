import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AMCPool, AMCPoolDocument } from '../schemas/amc-pool.schema';

/**
 * Service for automatically calculating and updating ROI based on APY and elapsed time
 * This calculates PROJECTED ROI (expected returns) based on APY
 * Actual ROI is updated when dividends are distributed
 */
@Injectable()
export class ROICalculationService {
  private readonly logger = new Logger(ROICalculationService.name);

  constructor(
    @InjectModel(AMCPool.name) private amcPoolModel: Model<AMCPoolDocument>,
  ) {}

  /**
   * Calculate projected ROI for an investment based on APY and time elapsed
   */
  calculateProjectedROI(
    investmentAmount: number,
    apy: number, // Annual Percentage Yield (e.g., 12 for 12%)
    daysElapsed: number
  ): {
    projectedDividends: number;
    projectedROI: number;
    projectedAPY: number;
  } {
    // Calculate annual return
    const annualReturn = (investmentAmount * apy) / 100;
    
    // Calculate return for the elapsed period
    const projectedDividends = (annualReturn * daysElapsed) / 365;
    
    // Calculate ROI percentage
    const projectedROI = investmentAmount > 0 
      ? (projectedDividends / investmentAmount) * 100 
      : 0;
    
    // Projected APY (annualized)
    const projectedAPY = daysElapsed > 0
      ? (projectedDividends / investmentAmount) * (365 / daysElapsed) * 100
      : apy;

    return {
      projectedDividends,
      projectedROI,
      projectedAPY: Math.min(projectedAPY, apy * 1.5), // Cap at 1.5x expected APY to prevent unrealistic projections
    };
  }

  /**
   * Calculate projected ROI for a pool investment
   */
  calculatePoolInvestmentROI(
    investment: {
      amount: number;
      tokens: number;
      investedAt: Date;
      dividendsReceived: number;
    },
    pool: {
      expectedAPY: number;
      launchedAt: Date;
    }
  ): {
    daysSinceInvestment: number;
    daysSinceLaunch: number;
    projectedDividends: number;
    projectedROI: number;
    totalReturn: number; // dividendsReceived + projectedDividends
    totalROI: number; // Based on total return
    projectedAPY: number;
  } {
    const now = new Date();
    const daysSinceInvestment = Math.floor(
      (now.getTime() - investment.investedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysSinceLaunch = Math.floor(
      (now.getTime() - pool.launchedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate projected dividends based on APY
    const projected = this.calculateProjectedROI(
      investment.amount,
      pool.expectedAPY,
      daysSinceInvestment
    );

    // Total return = actual dividends + projected dividends
    const totalReturn = investment.dividendsReceived + projected.projectedDividends;
    const totalROI = investment.amount > 0 
      ? (totalReturn / investment.amount) * 100 
      : 0;

    return {
      daysSinceInvestment,
      daysSinceLaunch,
      projectedDividends: projected.projectedDividends,
      projectedROI: projected.projectedROI,
      totalReturn,
      totalROI,
      projectedAPY: projected.projectedAPY,
    };
  }

  /**
   * Update projected ROI for all active pools
   * Runs daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateAllPoolsProjectedROI() {
    this.logger.log('🔄 Starting automatic ROI calculation for all pools...');
    
    try {
      const activePools = await this.amcPoolModel.find({
        status: 'ACTIVE',
      });

      this.logger.log(`Found ${activePools.length} active pools to update`);

      for (const pool of activePools) {
        await this.updatePoolProjectedROI(pool.poolId);
      }

      this.logger.log(`✅ Updated projected ROI for ${activePools.length} pools`);
    } catch (error) {
      this.logger.error('Failed to update projected ROI:', error);
    }
  }

  /**
   * Update projected ROI for a specific pool
   * Can be called manually or via cron
   */
  async updatePoolProjectedROI(poolId: string): Promise<void> {
    try {
      const pool = await this.amcPoolModel.findOne({ poolId });
      if (!pool) {
        this.logger.warn(`Pool ${poolId} not found`);
        return;
      }

      if (pool.status !== 'ACTIVE') {
        this.logger.log(`Pool ${poolId} is not active, skipping ROI update`);
        return;
      }

      const now = new Date();
      const daysSinceLaunch = Math.floor(
        (now.getTime() - pool.launchedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLaunch < 0) {
        this.logger.log(`Pool ${poolId} not yet launched, skipping ROI update`);
        return;
      }

      // Calculate projected ROI for each investment
      let totalProjectedDividends = 0;
      let totalProjectedROI = 0;

      for (const investment of pool.investments) {
        if (!investment.isActive) continue;

        const roiData = this.calculatePoolInvestmentROI(
          {
            amount: investment.amount,
            tokens: investment.tokens,
            investedAt: investment.investedAt,
            dividendsReceived: investment.dividendsReceived,
          },
          {
            expectedAPY: pool.expectedAPY,
            launchedAt: pool.launchedAt,
          }
        );

        // Store projected ROI in investment metadata (if it exists)
        if (!investment['metadata']) {
          investment['metadata'] = {};
        }
        investment['metadata'].projectedDividends = roiData.projectedDividends;
        investment['metadata'].projectedROI = roiData.projectedROI;
        investment['metadata'].totalReturn = roiData.totalReturn;
        investment['metadata'].totalROI = roiData.totalROI;
        investment['metadata'].projectedAPY = roiData.projectedAPY;
        investment['metadata'].lastROIUpdate = now;

        totalProjectedDividends += roiData.projectedDividends;
        totalProjectedROI += roiData.projectedROI * investment.amount;
      }

      // Calculate pool-level projected ROI
      const poolProjectedROI = pool.totalInvested > 0
        ? totalProjectedROI / pool.totalInvested
        : 0;

      // Update pool metadata
      if (!pool.metadata) {
        pool.metadata = {
          riskLevel: 'MEDIUM',
          liquidity: 'MEDIUM',
          diversification: 0,
          geographicDistribution: [],
          sectorDistribution: {},
        };
      }

      pool.metadata['projectedDividends'] = totalProjectedDividends;
      pool.metadata['projectedROI'] = poolProjectedROI;
      pool.metadata['actualAPY'] = pool.totalInvested > 0 && daysSinceLaunch > 0
        ? ((pool.totalDividendsDistributed / pool.totalInvested) * (365 / daysSinceLaunch) * 100)
        : pool.expectedAPY;
      pool.metadata['lastROIUpdate'] = now;

      await pool.save();
      this.logger.log(`✅ Updated projected ROI for pool ${poolId}: ${poolProjectedROI.toFixed(2)}%`);
    } catch (error) {
      this.logger.error(`Failed to update projected ROI for pool ${poolId}:`, error);
    }
  }

  /**
   * Get investor's projected ROI for a specific pool
   * Falls back to on-chain data if investment not found in database
   */
  async getInvestorProjectedROI(
    poolId: string,
    investorAddress: string,
    onChainInvestmentData?: {
      amount: number;
      tokens: number;
      investedAt?: Date;
    }
  ): Promise<{
    investment: any;
    projected: {
      projectedDividends: number;
      projectedROI: number;
      totalReturn: number;
      totalROI: number;
      projectedAPY: number;
      daysSinceInvestment: number;
    };
    actual: {
      dividendsReceived: number;
      actualROI: number;
    };
  } | null> {
    try {
      const pool = await this.amcPoolModel.findOne({ poolId });
      if (!pool) {
        return null;
      }

      let investment = pool.investments.find(
        inv => inv.investorAddress.toLowerCase() === investorAddress.toLowerCase()
      );

      // If investment not found in database but we have on-chain data, use that
      if ((!investment || !investment.isActive) && onChainInvestmentData) {
        this.logger.log(`Investment not found in DB for ${investorAddress}, using on-chain data`);
        // Use on-chain data with pool launch date as fallback for investedAt
        const investedAt = onChainInvestmentData.investedAt || pool.launchedAt || new Date();
        investment = {
          amount: onChainInvestmentData.amount,
          tokens: onChainInvestmentData.tokens,
          investedAt: investedAt,
          dividendsReceived: 0, // On-chain doesn't track dividends, assume 0 for now
          isActive: true,
        } as any;
      }

      if (!investment || !investment.isActive) {
        this.logger.warn(`No active investment found for ${investorAddress} in pool ${poolId}`);
        return null;
      }

      const roiData = this.calculatePoolInvestmentROI(
        {
          amount: investment.amount,
          tokens: investment.tokens,
          investedAt: investment.investedAt,
          dividendsReceived: investment.dividendsReceived || 0,
        },
        {
          expectedAPY: pool.expectedAPY,
          launchedAt: pool.launchedAt,
        }
      );

      return {
        investment: {
          amount: investment.amount,
          tokens: investment.tokens,
          investedAt: investment.investedAt,
        },
        projected: {
          projectedDividends: roiData.projectedDividends,
          projectedROI: roiData.projectedROI,
          totalReturn: roiData.totalReturn,
          totalROI: roiData.totalROI,
          projectedAPY: roiData.projectedAPY,
          daysSinceInvestment: roiData.daysSinceInvestment,
        },
        actual: {
          dividendsReceived: investment.dividendsReceived || 0,
          actualROI: investment.amount > 0
            ? ((investment.dividendsReceived || 0) / investment.amount) * 100
            : 0,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get investor projected ROI:`, error);
      return null;
    }
  }

  /**
   * Calculate projected monthly dividend based on APY
   */
  calculateMonthlyProjectedDividend(investmentAmount: number, apy: number): number {
    const annualReturn = (investmentAmount * apy) / 100;
    return annualReturn / 12; // Monthly
  }

  /**
   * Calculate projected annual dividend based on APY
   */
  calculateAnnualProjectedDividend(investmentAmount: number, apy: number): number {
    return (investmentAmount * apy) / 100;
  }
}

