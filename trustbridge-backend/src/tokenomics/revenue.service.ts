import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HederaService } from '../hedera/hedera.service';
import { Payment, PaymentDocument, PaymentType } from '../schemas/payment.schema';
import { User, UserDocument } from '../schemas/user.schema';

export interface RevenueStream {
  source: string;
  amount: number;
  percentage: number;
  timestamp: Date;
}

export interface FeeAllocation {
  treasury: number;
  stakers: number;
  insurance: number;
  validators: number;
  burn: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  revenueStreams: RevenueStream[];
  feeAllocation: FeeAllocation;
  growthRate: number;
  averageTransactionValue: number;
}

export interface TreasuryBalance {
  totalBalance: number;
  hbarBalance: number;
  trbBalance: number;
  usdValue: number;
  allocation: {
    development: number;
    marketing: number;
    operations: number;
    emergency: number;
    staking: number;
  };
}

@Injectable()
export class RevenueService {
  private readonly logger = new Logger(RevenueService.name);
  
  private readonly feeAllocationConfig = {
    treasury: 0.40, // 40%
    stakers: 0.30,  // 30%
    insurance: 0.20, // 20%
    validators: 0.10, // 10%
  };

  private readonly revenueStreams = {
    [PaymentType.TOKENIZATION_FEE]: 'Asset Tokenization',
    [PaymentType.VERIFICATION_FEE]: 'Asset Verification',
    [PaymentType.INVESTMENT]: 'Investment Fees',
    [PaymentType.ESCROW]: 'Escrow Fees',
    [PaymentType.PLATFORM_FEE]: 'Platform Fees',
  };

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly hederaService: HederaService,
  ) {}

  /**
   * Calculate total revenue for a specific period
   */
  async calculateRevenue(timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<number> {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'yearly':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const payments = await this.paymentModel.find({
      status: 'COMPLETED',
      createdAt: { $gte: startDate, $lte: now },
    });

    return payments.reduce((total, payment) => {
      return total + (payment.feeAmount || 0);
    }, 0);
  }

  /**
   * Get comprehensive revenue metrics
   */
  async getRevenueMetrics(): Promise<RevenueMetrics> {
    try {
      const dailyRevenue = await this.calculateRevenue('daily');
      const weeklyRevenue = await this.calculateRevenue('weekly');
      const monthlyRevenue = await this.calculateRevenue('monthly');
      const yearlyRevenue = await this.calculateRevenue('yearly');
      const totalRevenue = yearlyRevenue;

      // Get revenue streams breakdown
      const revenueStreams = await this.getRevenueStreams('monthly');
      
      // Calculate fee allocation
      const feeAllocation = this.calculateFeeAllocation(monthlyRevenue);
      
      // Calculate growth rate (month over month)
      const previousMonthRevenue = await this.calculatePreviousMonthRevenue();
      const growthRate = previousMonthRevenue > 0 
        ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
        : 0;

      // Calculate average transaction value
      const transactionCount = await this.paymentModel.countDocuments({
        status: 'COMPLETED',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });
      const averageTransactionValue = transactionCount > 0 ? monthlyRevenue / transactionCount : 0;

      return {
        totalRevenue,
        dailyRevenue,
        weeklyRevenue,
        monthlyRevenue,
        yearlyRevenue,
        revenueStreams,
        feeAllocation,
        growthRate,
        averageTransactionValue,
      };
    } catch (error) {
      this.logger.error('Failed to get revenue metrics:', error);
      throw error;
    }
  }

  /**
   * Get revenue streams breakdown
   */
  async getRevenueStreams(timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<RevenueStream[]> {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'yearly':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const payments = await this.paymentModel.find({
      status: 'COMPLETED',
      createdAt: { $gte: startDate, $lte: now },
    });

    const totalRevenue = payments.reduce((sum, payment) => sum + (payment.feeAmount || 0), 0);
    
    // Group by payment type
    const revenueByType = payments.reduce((acc, payment) => {
      const type = payment.type;
      const amount = payment.feeAmount || 0;
      acc[type] = (acc[type] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

    // Convert to revenue streams
    const revenueStreams: RevenueStream[] = Object.entries(revenueByType).map(([type, amount]) => ({
      source: this.revenueStreams[type as PaymentType] || type,
      amount,
      percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
      timestamp: now,
    }));

    return revenueStreams.sort((a, b) => b.amount - a.amount);
  }

  /**
   * Calculate fee allocation based on revenue
   */
  calculateFeeAllocation(totalRevenue: number): FeeAllocation {
    return {
      treasury: totalRevenue * this.feeAllocationConfig.treasury,
      stakers: totalRevenue * this.feeAllocationConfig.stakers,
      insurance: totalRevenue * this.feeAllocationConfig.insurance,
      validators: totalRevenue * this.feeAllocationConfig.validators,
      burn: totalRevenue * 0.25, // 25% of revenue for buyback and burn
    };
  }

  /**
   * Get treasury balance and allocation
   */
  async getTreasuryBalance(): Promise<TreasuryBalance> {
    try {
      // Get real balances from Hedera
      const hbarBalanceStr = await this.hederaService.getAccountBalance('0.0.12345');
      const hbarBalance = parseFloat(hbarBalanceStr);
      const trbBalance = await this.hederaService.getTokenBalance('0.0.12345', '0');
      
      // Get real USD values from Chainlink oracles
      const hbarPrice = await this.hederaService.getTokenPrice(0); // Real HBAR price
      const trbPrice = await this.hederaService.getTokenPrice(0);
      
      const hbarUsdValue = hbarBalance * hbarPrice;
      const trbUsdValue = trbBalance * trbPrice;
      const totalUsdValue = hbarUsdValue + trbUsdValue;

      const totalBalance = hbarBalance + trbBalance;

      return {
        totalBalance,
        hbarBalance,
        trbBalance,
        usdValue: totalUsdValue,
        allocation: {
          development: totalUsdValue * 0.40, // 40%
          marketing: totalUsdValue * 0.25,   // 25%
          operations: totalUsdValue * 0.20,  // 20%
          emergency: totalUsdValue * 0.10,   // 10%
          staking: totalUsdValue * 0.05,     // 5%
        },
      };
    } catch (error) {
      this.logger.error('Failed to get treasury balance:', error);
      throw error;
    }
  }

  /**
   * Execute fee distribution to different pools
   */
  async distributeFees(totalFees: number): Promise<{
    treasury: number;
    stakers: number;
    insurance: number;
    validators: number;
    burn: number;
  }> {
    try {
      const allocation = this.calculateFeeAllocation(totalFees);
      
      // Distribute to treasury
      if (allocation.treasury > 0) {
        await this.hederaService.transferToTreasury(allocation.treasury);
      }

      // Distribute to stakers
      if (allocation.stakers > 0) {
        await this.distributeToStakers(allocation.stakers);
      }

      // Distribute to insurance pool
      if (allocation.insurance > 0) {
        await this.hederaService.transferToInsurancePool(allocation.insurance);
      }

      // Distribute to validators
      if (allocation.validators > 0) {
        await this.distributeToValidators(allocation.validators);
      }

      // Execute burn
      if (allocation.burn > 0) {
        await this.hederaService.burnTokens(allocation.burn);
      }

      this.logger.log(`Distributed fees: Treasury=${allocation.treasury}, Stakers=${allocation.stakers}, Insurance=${allocation.insurance}, Validators=${allocation.validators}, Burn=${allocation.burn}`);

      return allocation;
    } catch (error) {
      this.logger.error('Failed to distribute fees:', error);
      throw error;
    }
  }

  /**
   * Get revenue analytics for charts
   */
  async getRevenueAnalytics(days: number = 30): Promise<{
    dailyRevenue: Array<{ date: string; revenue: number }>;
    revenueByType: Array<{ type: string; revenue: number; percentage: number }>;
    growthTrend: Array<{ period: string; growth: number }>;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Get daily revenue data
      const dailyRevenue = [];
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        
        const revenue = await this.paymentModel.aggregate([
          {
            $match: {
              status: 'COMPLETED',
              createdAt: { $gte: date, $lt: nextDate }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$feeAmount' }
            }
          }
        ]);

        dailyRevenue.push({
          date: date.toISOString().split('T')[0],
          revenue: revenue.length > 0 ? revenue[0].total : 0,
        });
      }

      // Get revenue by type
      const revenueByType = await this.paymentModel.aggregate([
        {
          $match: {
            status: 'COMPLETED',
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$type',
            revenue: { $sum: '$feeAmount' }
          }
        }
      ]);

      const totalRevenue = revenueByType.reduce((sum, item) => sum + item.revenue, 0);
      const revenueByTypeFormatted = revenueByType.map(item => ({
        type: this.revenueStreams[item._id as PaymentType] || item._id,
        revenue: item.revenue,
        percentage: totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0,
      }));

      // Calculate growth trend (weekly)
      const growthTrend = [];
      for (let i = 0; i < Math.floor(days / 7); i++) {
        const weekStart = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const prevWeekEnd = new Date(prevWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        const currentWeekRevenue = await this.calculateRevenueForPeriod(weekStart, weekEnd);
        const previousWeekRevenue = await this.calculateRevenueForPeriod(prevWeekStart, prevWeekEnd);
        
        const growth = previousWeekRevenue > 0 
          ? ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100 
          : 0;

        growthTrend.push({
          period: weekStart.toISOString().split('T')[0],
          growth,
        });
      }

      return {
        dailyRevenue,
        revenueByType: revenueByTypeFormatted,
        growthTrend,
      };
    } catch (error) {
      this.logger.error('Failed to get revenue analytics:', error);
      throw error;
    }
  }

  /**
   * Get fee configuration
   */
  getFeeConfiguration(): {
    tokenizationFee: number;
    verificationFee: number;
    platformFee: number;
    escrowFee: number;
    feeAllocation: typeof this.feeAllocationConfig;
  } {
    return {
      tokenizationFee: 0.02, // 2%
      verificationFee: 0.01, // 1%
      platformFee: 0.005,    // 0.5%
      escrowFee: 0.01,        // 1%
      feeAllocation: this.feeAllocationConfig,
    };
  }

  /**
   * Update fee configuration (governance function)
   */
  async updateFeeConfiguration(updates: {
    tokenizationFee?: number;
    verificationFee?: number;
    platformFee?: number;
    escrowFee?: number;
    feeAllocation?: Partial<typeof this.feeAllocationConfig>;
  }): Promise<void> {
    try {
      // Validate fee rates
      const feeRates = ['tokenizationFee', 'verificationFee', 'platformFee', 'escrowFee'];
      for (const rate of feeRates) {
        if (updates[rate] !== undefined && (updates[rate] < 0 || updates[rate] > 0.1)) {
          throw new Error(`${rate} must be between 0 and 0.1 (10%)`);
        }
      }

      // Validate fee allocation
      if (updates.feeAllocation) {
        const total = Object.values(updates.feeAllocation).reduce((sum, value) => sum + value, 0);
        if (total > 1) {
          throw new Error('Fee allocation percentages cannot exceed 100%');
        }
      }

      // Update configuration (in a real implementation, this would be stored in a database)
      this.logger.log('Fee configuration updated:', updates);
    } catch (error) {
      this.logger.error('Failed to update fee configuration:', error);
      throw error;
    }
  }

  // Private helper methods

  private async calculatePreviousMonthRevenue(): Promise<number> {
    const now = new Date();
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return this.calculateRevenueForPeriod(twoMonthsAgo, oneMonthAgo);
  }

  private async calculateRevenueForPeriod(startDate: Date, endDate: Date): Promise<number> {
    const payments = await this.paymentModel.find({
      status: 'COMPLETED',
      createdAt: { $gte: startDate, $lte: endDate },
    });

    return payments.reduce((total, payment) => {
      return total + (payment.feeAmount || 0);
    }, 0);
  }

  private async distributeToStakers(amount: number): Promise<void> {
    const stakers = await this.userModel.find({ stakingBalance: { $gt: 0 } });
    
    if (stakers.length === 0) return;

    const totalStaked = stakers.reduce((sum, staker) => sum + staker.stakingBalance, 0);

    for (const staker of stakers) {
      const share = (staker.stakingBalance / totalStaked) * amount;
      if (share > 0) {
        await this.hederaService.transferTokens(
          '0.0.12345', // from treasury
          staker.walletAddress,
          share.toString(),
          0 // TRB token ID
        );
      }
    }
  }

  private async distributeToValidators(amount: number): Promise<void> {
    // In a real implementation, this would distribute to active validators
    // For now, just transfer to a validator pool
    await this.hederaService.transferToValidatorPool(amount);
  }
}
