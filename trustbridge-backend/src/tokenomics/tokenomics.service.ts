import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HederaService } from '../hedera/hedera.service';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { User, UserDocument } from '../schemas/user.schema';

export interface TokenomicsConfig {
  totalSupply: number;
  initialCirculating: number;
  communityAllocation: number;
  teamAllocation: number;
  investorAllocation: number;
  treasuryAllocation: number;
  buybackRate: number;
  burnRate: number;
  stakingRewardRate: number;
}

export interface TokenDistribution {
  community: number;
  team: number;
  investors: number;
  treasury: number;
  staking: number;
  liquidity: number;
}

export interface BuybackData {
  totalRevenue: number;
  buybackAmount: number;
  burnAmount: number;
  stakerRewards: number;
  timestamp: Date;
}

export interface StakingReward {
  userId: string;
  stakedAmount: number;
  rewardAmount: number;
  apy: number;
  lockPeriod: number;
  timestamp: Date;
}

@Injectable()
export class TokenomicsService {
  private readonly logger = new Logger(TokenomicsService.name);
  
  private readonly tokenomicsConfig: TokenomicsConfig = {
    totalSupply: 1_000_000_000, // 1B TRB
    initialCirculating: 200_000_000, // 200M TRB
    communityAllocation: 0.40, // 40%
    teamAllocation: 0.20, // 20%
    investorAllocation: 0.25, // 25%
    treasuryAllocation: 0.15, // 15%
    buybackRate: 0.50, // 50% of revenue
    burnRate: 0.25, // 25% of buybacks
    stakingRewardRate: 0.25, // 25% of buybacks
  };

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly hederaService: HederaService,
  ) {}

  /**
   * Get current tokenomics configuration
   */
  getTokenomicsConfig(): TokenomicsConfig {
    return this.tokenomicsConfig;
  }

  /**
   * Calculate token distribution based on current config
   */
  calculateTokenDistribution(): TokenDistribution {
    const total = this.tokenomicsConfig.totalSupply;
    
    return {
      community: Math.floor(total * this.tokenomicsConfig.communityAllocation),
      team: Math.floor(total * this.tokenomicsConfig.teamAllocation),
      investors: Math.floor(total * this.tokenomicsConfig.investorAllocation),
      treasury: Math.floor(total * this.tokenomicsConfig.treasuryAllocation),
      staking: 0, // Calculated dynamically
      liquidity: 0, // Calculated dynamically
    };
  }

  /**
   * Calculate protocol revenue from all sources
   */
  async calculateProtocolRevenue(timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<number> {
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
   * Execute token buyback and burn mechanism
   */
  async executeBuybackAndBurn(): Promise<BuybackData> {
    try {
      // Calculate total revenue for buyback
      const totalRevenue = await this.calculateProtocolRevenue('monthly');
      const buybackAmount = totalRevenue * this.tokenomicsConfig.buybackRate;
      const burnAmount = buybackAmount * this.tokenomicsConfig.burnRate;
      const stakerRewards = buybackAmount * this.tokenomicsConfig.stakingRewardRate;

      this.logger.log(`Executing buyback: ${buybackAmount} TRB, Burn: ${burnAmount} TRB, Staker Rewards: ${stakerRewards} TRB`);

      // Execute buyback on Hedera (real blockchain implementation)
      if (buybackAmount > 0) {
        await this.hederaService.buybackTokens(buybackAmount);
      }

      // Execute burn on Hedera (real blockchain implementation)
      if (burnAmount > 0) {
        await this.hederaService.burnTokens(burnAmount);
      }

      // Distribute staker rewards
      if (stakerRewards > 0) {
        await this.distributeStakerRewards(stakerRewards);
      }

      const buybackData: BuybackData = {
        totalRevenue,
        buybackAmount,
        burnAmount,
        stakerRewards,
        timestamp: new Date(),
      };

      this.logger.log('Buyback and burn executed successfully:', buybackData);
      return buybackData;

    } catch (error) {
      this.logger.error('Failed to execute buyback and burn:', error);
      throw error;
    }
  }

  /**
   * Distribute staking rewards to all stakers
   */
  async distributeStakerRewards(totalRewards: number): Promise<void> {
    try {
      // Get all users with staked tokens
      const stakers = await this.userModel.find({
        stakingBalance: { $gt: 0 }
      });

      if (stakers.length === 0) {
        this.logger.log('No stakers found for reward distribution');
        return;
      }

      // Calculate total staked amount
      const totalStaked = stakers.reduce((sum, staker) => sum + staker.stakingBalance, 0);

      // Distribute rewards proportionally
      for (const staker of stakers) {
        const rewardAmount = (staker.stakingBalance / totalStaked) * totalRewards;
        
        if (rewardAmount > 0) {
          // Update user's staking rewards
          await this.userModel.findByIdAndUpdate(staker._id, {
            $inc: { stakingRewards: rewardAmount }
          });

          // Transfer rewards on Hedera (real blockchain implementation)
          await this.hederaService.transferTokens(
            '0.0.12345', // from treasury
            staker.walletAddress,
            rewardAmount.toString(),
            0 // TRB token ID
          );

          this.logger.log(`Distributed ${rewardAmount} TRB rewards to ${staker.walletAddress}`);
        }
      }

      this.logger.log(`Distributed ${totalRewards} TRB rewards to ${stakers.length} stakers`);
    } catch (error) {
      this.logger.error('Failed to distribute staker rewards:', error);
      throw error;
    }
  }

  /**
   * Calculate staking rewards for a user
   */
  async calculateStakingRewards(userId: string): Promise<StakingReward> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const stakedAmount = user.stakingBalance;
    const lockPeriod = 365; // days (assuming 1 year lock)
    const apy = this.calculateAPY(lockPeriod);
    
    // Calculate reward based on staked amount and APY
    const rewardAmount = (stakedAmount * apy) / 100;

    return {
      userId,
      stakedAmount,
      rewardAmount,
      apy,
      lockPeriod,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate APY based on lock period
   */
  private calculateAPY(lockPeriodDays: number): number {
    if (lockPeriodDays <= 30) return 5; // 5% APY
    if (lockPeriodDays <= 90) return 10; // 10% APY
    if (lockPeriodDays <= 180) return 15; // 15% APY
    return 25; // 25% APY for 365+ days
  }

  /**
   * Get tokenomics metrics
   */
  async getTokenomicsMetrics(): Promise<{
    totalSupply: number;
    circulatingSupply: number;
    burnedTokens: number;
    stakedTokens: number;
    treasuryBalance: number;
    marketCap: number;
    stakingAPY: number;
    inflationRate: number;
    deflationRate: number;
  }> {
    try {
      // Get total staked tokens
      const stakers = await this.userModel.find({ stakingBalance: { $gt: 0 } });
      const stakedTokens = stakers.reduce((sum, staker) => sum + staker.stakingBalance, 0);

      // Get treasury balance (real blockchain implementation)
      const treasuryBalance = await this.hederaService.getTokenBalance('0.0.12345', '0');

      // Calculate circulating supply
      const circulatingSupply = this.tokenomicsConfig.initialCirculating - stakedTokens;

      // Get current token price (real blockchain implementation)
      const tokenPrice = await this.hederaService.getTokenPrice(0);
      const marketCap = circulatingSupply * tokenPrice;

      // Calculate inflation/deflation rates
      const monthlyRevenue = await this.calculateProtocolRevenue('monthly');
      const monthlyBuyback = monthlyRevenue * this.tokenomicsConfig.buybackRate;
      const monthlyBurn = monthlyBuyback * this.tokenomicsConfig.burnRate;
      const deflationRate = (monthlyBurn / circulatingSupply) * 100;

      return {
        totalSupply: this.tokenomicsConfig.totalSupply,
        circulatingSupply,
        burnedTokens: 0, // Would track burned tokens
        stakedTokens,
        treasuryBalance,
        marketCap,
        stakingAPY: this.calculateAPY(365),
        inflationRate: 0, // No inflation in this model
        deflationRate,
      };
    } catch (error) {
      this.logger.error('Failed to get tokenomics metrics:', error);
      throw error;
    }
  }

  /**
   * Update tokenomics parameters (governance function)
   */
  async updateTokenomicsParameters(updates: Partial<TokenomicsConfig>): Promise<void> {
    try {
      // Validate updates
      if (updates.buybackRate !== undefined && (updates.buybackRate < 0 || updates.buybackRate > 1)) {
        throw new Error('Buyback rate must be between 0 and 1');
      }

      if (updates.burnRate !== undefined && (updates.burnRate < 0 || updates.burnRate > 1)) {
        throw new Error('Burn rate must be between 0 and 1');
      }

      if (updates.stakingRewardRate !== undefined && (updates.stakingRewardRate < 0 || updates.stakingRewardRate > 1)) {
        throw new Error('Staking reward rate must be between 0 and 1');
      }

      // Update configuration
      Object.assign(this.tokenomicsConfig, updates);

      this.logger.log('Tokenomics parameters updated:', updates);
    } catch (error) {
      this.logger.error('Failed to update tokenomics parameters:', error);
      throw error;
    }
  }

  /**
   * Get staking leaderboard
   */
  async getStakingLeaderboard(limit: number = 50): Promise<Array<{
    walletAddress: string;
    stakedAmount: number;
    stakingRewards: number;
    apy: number;
    rank: number;
  }>> {
    const stakers = await this.userModel.find({
      stakingBalance: { $gt: 0 }
    })
    .sort({ stakingBalance: -1 })
    .limit(limit);

    return stakers.map((staker, index) => ({
      walletAddress: staker.walletAddress,
      stakedAmount: staker.stakingBalance,
      stakingRewards: staker.stakingRewards,
      apy: this.calculateAPY(365), // Assuming 1 year lock
      rank: index + 1,
    }));
  }

  /**
   * Get token distribution analytics
   */
  async getTokenDistributionAnalytics(): Promise<{
    distribution: TokenDistribution;
    stakingStats: {
      totalStakers: number;
      totalStaked: number;
      averageStake: number;
      topStaker: string;
      topStakeAmount: number;
    };
    revenueStats: {
      daily: number;
      weekly: number;
      monthly: number;
      yearly: number;
    };
  }> {
    const distribution = this.calculateTokenDistribution();
    
    const stakers = await this.userModel.find({ stakingBalance: { $gt: 0 } });
    const totalStaked = stakers.reduce((sum, staker) => sum + staker.stakingBalance, 0);
    const topStaker = stakers.reduce((max, staker) => 
      staker.stakingBalance > max.stakingBalance ? staker : max, 
      { stakingBalance: 0, walletAddress: '' }
    );

    const revenueStats = {
      daily: await this.calculateProtocolRevenue('daily'),
      weekly: await this.calculateProtocolRevenue('weekly'),
      monthly: await this.calculateProtocolRevenue('monthly'),
      yearly: await this.calculateProtocolRevenue('yearly'),
    };

    return {
      distribution,
      stakingStats: {
        totalStakers: stakers.length,
        totalStaked,
        averageStake: stakers.length > 0 ? totalStaked / stakers.length : 0,
        topStaker: topStaker.walletAddress,
        topStakeAmount: topStaker.stakingBalance,
      },
      revenueStats,
    };
  }
}
