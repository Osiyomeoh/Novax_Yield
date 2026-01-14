import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HederaService } from '../hedera/hedera.service';
import { User, UserDocument } from '../schemas/user.schema';

export enum StakingType {
  ATTESTOR = 'ATTESTOR',
  VALIDATOR = 'VALIDATOR',
  LIQUIDITY = 'LIQUIDITY',
  GOVERNANCE = 'GOVERNANCE',
}

export interface StakingPosition {
  userId: string;
  stakingType: StakingType;
  amount: number;
  lockPeriod: number;
  startDate: Date;
  endDate: Date;
  apy: number;
  rewards: number;
  isActive: boolean;
}

export interface StakingReward {
  userId: string;
  stakingType: StakingType;
  rewardAmount: number;
  apy: number;
  timestamp: Date;
}

export interface StakingStats {
  totalStaked: number;
  totalStakers: number;
  averageStake: number;
  totalRewards: number;
  averageAPY: number;
  stakingBreakdown: {
    [key in StakingType]: {
      amount: number;
      stakers: number;
      apy: number;
    };
  };
}

@Injectable()
export class StakingService {
  private readonly logger = new Logger(StakingService.name);
  
  private readonly stakingConfig = {
    minStakeAmount: {
      [StakingType.ATTESTOR]: 10000, // 10,000 TRB
      [StakingType.VALIDATOR]: 100000, // 100,000 TRB
      [StakingType.LIQUIDITY]: 5000, // 5,000 TRB
      [StakingType.GOVERNANCE]: 1000, // 1,000 TRB
    },
    maxLockPeriod: 365, // 365 days
    minLockPeriod: 30, // 30 days
    apyRates: {
      [StakingType.ATTESTOR]: { min: 8, max: 25 },
      [StakingType.VALIDATOR]: { min: 12, max: 30 },
      [StakingType.LIQUIDITY]: { min: 15, max: 35 },
      [StakingType.GOVERNANCE]: { min: 5, max: 20 },
    },
  };

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly hederaService: HederaService,
  ) {}

  /**
   * Stake tokens for a specific purpose
   */
  async stakeTokens(
    userId: string,
    stakingType: StakingType,
    amount: number,
    lockPeriod: number
  ): Promise<StakingPosition> {
    try {
      // Validate staking parameters
      this.validateStakingParameters(stakingType, amount, lockPeriod);

      // Check user's token balance
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const tokenBalance = await this.hederaService.getTokenBalance(user.walletAddress, '0');
      if (tokenBalance < amount) {
        throw new Error('Insufficient token balance');
      }

      // Calculate APY based on lock period and staking type
      const apy = this.calculateAPY(stakingType, lockPeriod);

      // Create staking position
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + lockPeriod * 24 * 60 * 60 * 1000);

      const stakingPosition: StakingPosition = {
        userId,
        stakingType,
        amount,
        lockPeriod,
        startDate,
        endDate,
        apy,
        rewards: 0,
        isActive: true,
      };

      // Transfer tokens to staking contract on Hedera
      await this.hederaService.stakeTokens(
        user.walletAddress,
        stakingType,
        amount,
        lockPeriod
      );

      // Update user's staking balance
      await this.userModel.findByIdAndUpdate(userId, {
        $inc: { stakingBalance: amount }
      });

      this.logger.log(`User ${userId} staked ${amount} TRB for ${stakingType} (${lockPeriod} days)`);
      return stakingPosition;

    } catch (error) {
      this.logger.error('Failed to stake tokens:', error);
      throw error;
    }
  }

  /**
   * Unstake tokens and claim rewards
   */
  async unstakeTokens(userId: string, stakingType: StakingType): Promise<{
    unstakedAmount: number;
    rewards: number;
    totalReceived: number;
  }> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has staked tokens
      if (user.stakingBalance <= 0) {
        throw new Error('No staked tokens to unstake');
      }

      // Calculate rewards
      const rewards = await this.calculateStakingRewards(userId, stakingType);
      const unstakedAmount = user.stakingBalance;
      const totalReceived = unstakedAmount + rewards;

      // Unstake tokens from Hedera contract
      await this.hederaService.unstakeTokens(
        user.walletAddress,
        stakingType,
        unstakedAmount
      );

      // Update user's staking balance and rewards
      await this.userModel.findByIdAndUpdate(userId, {
        $set: { 
          stakingBalance: 0,
          stakingRewards: user.stakingRewards + rewards
        }
      });

      this.logger.log(`User ${userId} unstaked ${unstakedAmount} TRB and claimed ${rewards} TRB rewards`);
      
      return {
        unstakedAmount,
        rewards,
        totalReceived,
      };

    } catch (error) {
      this.logger.error('Failed to unstake tokens:', error);
      throw error;
    }
  }

  /**
   * Calculate staking rewards for a user
   */
  async calculateStakingRewards(userId: string, stakingType: StakingType): Promise<number> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user || user.stakingBalance <= 0) {
        return 0;
      }

      // Calculate time staked (assuming 1 year for simplicity)
      const timeStaked = 365; // days
      const apy = this.calculateAPY(stakingType, timeStaked);
      
      // Calculate rewards
      const rewards = (user.stakingBalance * apy) / 100;
      
      return rewards;
    } catch (error) {
      this.logger.error('Failed to calculate staking rewards:', error);
      return 0;
    }
  }

  /**
   * Get user's staking positions
   */
  async getUserStakingPositions(userId: string): Promise<StakingPosition[]> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // For now, return a single position based on user's staking balance
      if (user.stakingBalance <= 0) {
        return [];
      }

      const positions: StakingPosition[] = [];
      
      // Add positions for each staking type the user is participating in
      if (user.stakingBalance >= this.stakingConfig.minStakeAmount[StakingType.ATTESTOR]) {
        positions.push({
          userId,
          stakingType: StakingType.ATTESTOR,
          amount: user.stakingBalance,
          lockPeriod: 365,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          apy: this.calculateAPY(StakingType.ATTESTOR, 365),
          rewards: user.stakingRewards,
          isActive: true,
        });
      }

      return positions;
    } catch (error) {
      this.logger.error('Failed to get user staking positions:', error);
      return [];
    }
  }

  /**
   * Get staking statistics
   */
  async getStakingStats(): Promise<StakingStats> {
    try {
      const stakers = await this.userModel.find({ stakingBalance: { $gt: 0 } });
      const totalStaked = stakers.reduce((sum, staker) => sum + staker.stakingBalance, 0);
      const totalRewards = stakers.reduce((sum, staker) => sum + staker.stakingRewards, 0);
      const averageStake = stakers.length > 0 ? totalStaked / stakers.length : 0;

      // Calculate staking breakdown by type
      const stakingBreakdown = {
        [StakingType.ATTESTOR]: { amount: 0, stakers: 0, apy: 0 },
        [StakingType.VALIDATOR]: { amount: 0, stakers: 0, apy: 0 },
        [StakingType.LIQUIDITY]: { amount: 0, stakers: 0, apy: 0 },
        [StakingType.GOVERNANCE]: { amount: 0, stakers: 0, apy: 0 },
      };

      // Categorize stakers by staking type based on amount
      for (const staker of stakers) {
        const amount = staker.stakingBalance;
        
        if (amount >= this.stakingConfig.minStakeAmount[StakingType.VALIDATOR]) {
          stakingBreakdown[StakingType.VALIDATOR].amount += amount;
          stakingBreakdown[StakingType.VALIDATOR].stakers += 1;
          stakingBreakdown[StakingType.VALIDATOR].apy = this.calculateAPY(StakingType.VALIDATOR, 365);
        } else if (amount >= this.stakingConfig.minStakeAmount[StakingType.ATTESTOR]) {
          stakingBreakdown[StakingType.ATTESTOR].amount += amount;
          stakingBreakdown[StakingType.ATTESTOR].stakers += 1;
          stakingBreakdown[StakingType.ATTESTOR].apy = this.calculateAPY(StakingType.ATTESTOR, 365);
        } else if (amount >= this.stakingConfig.minStakeAmount[StakingType.LIQUIDITY]) {
          stakingBreakdown[StakingType.LIQUIDITY].amount += amount;
          stakingBreakdown[StakingType.LIQUIDITY].stakers += 1;
          stakingBreakdown[StakingType.LIQUIDITY].apy = this.calculateAPY(StakingType.LIQUIDITY, 365);
        } else if (amount >= this.stakingConfig.minStakeAmount[StakingType.GOVERNANCE]) {
          stakingBreakdown[StakingType.GOVERNANCE].amount += amount;
          stakingBreakdown[StakingType.GOVERNANCE].stakers += 1;
          stakingBreakdown[StakingType.GOVERNANCE].apy = this.calculateAPY(StakingType.GOVERNANCE, 365);
        }
      }

      // Calculate average APY
      const totalAPY = Object.values(stakingBreakdown).reduce((sum, type) => sum + type.apy, 0);
      const averageAPY = Object.values(stakingBreakdown).filter(type => type.stakers > 0).length > 0 
        ? totalAPY / Object.values(stakingBreakdown).filter(type => type.stakers > 0).length 
        : 0;

      return {
        totalStaked,
        totalStakers: stakers.length,
        averageStake,
        totalRewards,
        averageAPY,
        stakingBreakdown,
      };
    } catch (error) {
      this.logger.error('Failed to get staking stats:', error);
      throw error;
    }
  }

  /**
   * Get staking leaderboard
   */
  async getStakingLeaderboard(limit: number = 50): Promise<Array<{
    walletAddress: string;
    stakedAmount: number;
    stakingType: StakingType;
    apy: number;
    rewards: number;
    rank: number;
  }>> {
    try {
      const stakers = await this.userModel.find({ stakingBalance: { $gt: 0 } })
        .sort({ stakingBalance: -1 })
        .limit(limit);

      return stakers.map((staker, index) => {
        let stakingType = StakingType.GOVERNANCE;
        if (staker.stakingBalance >= this.stakingConfig.minStakeAmount[StakingType.VALIDATOR]) {
          stakingType = StakingType.VALIDATOR;
        } else if (staker.stakingBalance >= this.stakingConfig.minStakeAmount[StakingType.ATTESTOR]) {
          stakingType = StakingType.ATTESTOR;
        } else if (staker.stakingBalance >= this.stakingConfig.minStakeAmount[StakingType.LIQUIDITY]) {
          stakingType = StakingType.LIQUIDITY;
        }

        return {
          walletAddress: staker.walletAddress,
          stakedAmount: staker.stakingBalance,
          stakingType,
          apy: this.calculateAPY(stakingType, 365),
          rewards: staker.stakingRewards,
          rank: index + 1,
        };
      });
    } catch (error) {
      this.logger.error('Failed to get staking leaderboard:', error);
      return [];
    }
  }

  /**
   * Distribute staking rewards to all stakers
   */
  async distributeStakingRewards(totalRewards: number): Promise<void> {
    try {
      const stakers = await this.userModel.find({ stakingBalance: { $gt: 0 } });
      
      if (stakers.length === 0) {
        this.logger.log('No stakers found for reward distribution');
        return;
      }

      const totalStaked = stakers.reduce((sum, staker) => sum + staker.stakingBalance, 0);

      for (const staker of stakers) {
        const rewardAmount = (staker.stakingBalance / totalStaked) * totalRewards;
        
        if (rewardAmount > 0) {
          // Update user's staking rewards
          await this.userModel.findByIdAndUpdate(staker._id, {
            $inc: { stakingRewards: rewardAmount }
          });

          // Transfer rewards on Hedera
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
      this.logger.error('Failed to distribute staking rewards:', error);
      throw error;
    }
  }

  /**
   * Get staking configuration
   */
  getStakingConfig(): typeof this.stakingConfig {
    return this.stakingConfig;
  }

  // Private helper methods

  private validateStakingParameters(stakingType: StakingType, amount: number, lockPeriod: number): void {
    if (amount < this.stakingConfig.minStakeAmount[stakingType]) {
      throw new Error(`Minimum stake amount for ${stakingType} is ${this.stakingConfig.minStakeAmount[stakingType]} TRB`);
    }

    if (lockPeriod < this.stakingConfig.minLockPeriod || lockPeriod > this.stakingConfig.maxLockPeriod) {
      throw new Error(`Lock period must be between ${this.stakingConfig.minLockPeriod} and ${this.stakingConfig.maxLockPeriod} days`);
    }
  }

  private calculateAPY(stakingType: StakingType, lockPeriod: number): number {
    const apyRange = this.stakingConfig.apyRates[stakingType];
    const minAPY = apyRange.min;
    const maxAPY = apyRange.max;
    
    // Calculate APY based on lock period (longer lock = higher APY)
    const lockPeriodRatio = lockPeriod / this.stakingConfig.maxLockPeriod;
    const apy = minAPY + (maxAPY - minAPY) * lockPeriodRatio;
    
    return Math.round(apy * 100) / 100; // Round to 2 decimal places
  }
}
