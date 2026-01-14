import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pool, PoolDocument } from '../schemas/pool.schema';
import { HederaService } from '../hedera/hedera.service';
import { Asset, AssetDocument } from '../schemas/asset.schema';

@Injectable()
export class PoolsService {
  private readonly logger = new Logger(PoolsService.name);

  constructor(
    @InjectModel(Pool.name) private poolModel: Model<PoolDocument>,
    @InjectModel(Asset.name) private assetModel: Model<AssetDocument>,
    private hederaService: HederaService,
  ) {}

  // ========================================
  // NEW TRUST TOKEN POOL SYSTEM
  // ========================================

  async createPool(poolData: {
    name: string;
    description: string;
    managementFee: number; // basis points (e.g., 300 = 3%)
    performanceFee: number; // basis points (e.g., 1000 = 10%)
    manager: string;
  }) {
    try {
      // Create pool on blockchain using new TRUST token system
      const poolResult = await this.hederaService.createPool({
        name: poolData.name,
        description: poolData.description,
        managementFee: poolData.managementFee,
        performanceFee: poolData.performanceFee,
      });

      // Create pool in database with simplified structure
      const pool = new this.poolModel({
        poolId: poolResult.poolId,
        name: poolData.name,
        description: poolData.description,
        manager: poolData.manager,
        managementFee: poolData.managementFee,
        performanceFee: poolData.performanceFee,
        status: 'active', // Pools are immediately active
        totalValue: 0, // Will be updated as assets are added
        totalInvestors: 0,
        totalInvested: 0,
        createdAt: new Date(),
        // Legacy fields for compatibility
        strategy: 'TRUST_TOKEN_POOL',
        assetIds: [],
        dropTokens: 0,
        tinTokens: 0,
        targetAPY: 0,
        actualAPY: 0,
        riskLevel: 'medium',
        minimumInvestment: 100, // 100 TRUST minimum
        maximumInvestment: 1000000, // 1M TRUST maximum
        lockupPeriod: 0,
        maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        poolContract: poolResult.poolId, // Use poolId as contract reference
        performanceMetrics: {
          totalReturn: 0,
          monthlyReturn: 0,
          volatility: 0,
          sharpeRatio: 0,
          maxDrawdown: 0
        },
        feeStructure: {
          managementFee: poolData.managementFee / 100, // Convert basis points to percentage
          performanceFee: poolData.performanceFee / 100,
          entryFee: 0,
          exitFee: 0
        },
        investors: [],
        distributions: [],
        compliance: {
          jurisdiction: 'Nigeria',
          regulatoryStatus: 'active',
          kycRequired: true,
          accreditationRequired: false,
          minimumInvestment: 100
        },
        tags: ['trust-token', 'pool', 'investment'],
        metadata: {
          website: '',
          whitepaper: '',
          socialMedia: {
            twitter: '',
            linkedin: '',
            telegram: ''
          },
          documents: []
        }
      });

      await pool.save();

      this.logger.log(`Pool created: ${poolData.name} (${poolResult.poolId})`);

      return {
        success: true,
        poolId: poolResult.poolId,
        pool: pool,
        transactionId: poolResult.transactionId
      };
    } catch (error) {
      this.logger.error(`Error creating pool: ${error.message}`);
      throw error;
    }
  }

  async getPool(poolId: string) {
    try {
      const pool = await this.poolModel.findOne({ poolId });
      if (!pool) {
        throw new Error('Pool not found');
      }
      return pool;
    } catch (error) {
      this.logger.error(`Error getting pool: ${error.message}`);
      throw error;
    }
  }

  async getAllPools(filters: {
    status?: string;
    riskLevel?: string;
    manager?: string;
    minAPY?: number;
    maxAPY?: number;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      const query: any = {};
      
      if (filters.status) query.status = filters.status;
      if (filters.riskLevel) query.riskLevel = filters.riskLevel;
      if (filters.manager) query.manager = filters.manager;
      if (filters.minAPY) query.targetAPY = { $gte: filters.minAPY };
      if (filters.maxAPY) query.targetAPY = { ...query.targetAPY, $lte: filters.maxAPY };

      const pools = await this.poolModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.offset || 0);

      const total = await this.poolModel.countDocuments(query);

      return {
        pools,
        total,
        limit: filters.limit || 50,
        offset: filters.offset || 0
      };
    } catch (error) {
      this.logger.error(`Error getting pools: ${error.message}`);
      throw error;
    }
  }

  // ========================================
  // NEW TRUST TOKEN INVESTMENT METHODS
  // ========================================

  async investInPool(poolId: string, investorData: {
    address: string;
    amount: string; // TRUST token amount as string
  }) {
    try {
      const pool = await this.poolModel.findOne({ poolId });
      if (!pool) {
        throw new Error('Pool not found');
      }

      if (pool.status !== 'active') {
        throw new Error('Pool not active');
      }

      const amount = parseFloat(investorData.amount);
      if (amount < pool.minimumInvestment) {
        throw new Error('Below minimum investment');
      }

      if (amount > pool.maximumInvestment) {
        throw new Error('Above maximum investment');
      }

      // Invest in pool using TRUST tokens on blockchain
      const result = await this.hederaService.investInPool(
        poolId,
        investorData.amount
      );

      // Update pool in database
      const existingInvestor = pool.investors.find(
        inv => inv.address === investorData.address
      );

      if (existingInvestor) {
        existingInvestor.amount += amount;
        existingInvestor.lastUpdate = new Date();
      } else {
        pool.investors.push({
          address: investorData.address,
          amount: amount,
          dropTokens: amount, // In TRUST token system, 1:1 ratio
          tinTokens: 0, // Not used in new system
          entryDate: new Date(),
          lastUpdate: new Date()
        });
        pool.totalInvestors++;
      }

      pool.totalInvested += amount;
      pool.totalValue += amount; // Update total value locked
      await pool.save();

      this.logger.log(`Investor added to pool ${poolId}: ${investorData.address} with ${amount} TRUST`);

      return {
        success: true,
        poolTokens: amount, // 1:1 ratio with TRUST tokens
        transactionId: result
      };
    } catch (error) {
      this.logger.error(`Error investing in pool: ${error.message}`);
      throw error;
    }
  }

  // ========================================
  // LEGACY METHODS (DEPRECATED)
  // ========================================

  async addInvestor(poolId: string, investorData: {
    address: string;
    amount: number;
  }) {
    // Redirect to new method
    return this.investInPool(poolId, {
      address: investorData.address,
      amount: investorData.amount.toString()
    });
  }

  async distributeRewards(poolId: string, amount: number) {
    try {
      const pool = await this.poolModel.findOne({ poolId });
      if (!pool) {
        throw new Error('Pool not found');
      }

      if (pool.manager !== pool.manager) {
        throw new Error('Not pool manager');
      }

      // Distribute rewards on Hedera
      const result = await this.hederaService.distributePoolRewards(
        pool.poolContract,
        amount
      );

      // Update pool in database
      const dropAmount = (amount * 70) / 100;
      const tinAmount = (amount * 30) / 100;

      pool.distributions.push({
        date: new Date(),
        amount,
        dropAmount,
        tinAmount,
        type: 'dividend'
      });

      // Update actual APY
      const timeSinceLastDistribution = Date.now() - (pool.distributions[pool.distributions.length - 2]?.date?.getTime() || pool.createdAt.getTime());
      pool.actualAPY = (amount * 365 * 24 * 60 * 60 * 1000) / (pool.totalInvested * timeSinceLastDistribution);

      await pool.save();

      this.logger.log(`Rewards distributed to pool ${poolId}: ${amount}`);

      return {
        success: true,
        dropAmount,
        tinAmount,
        transactionId: result.transactionId
      };
    } catch (error) {
      this.logger.error(`Error distributing rewards: ${error.message}`);
      throw error;
    }
  }

  async updatePoolStatus(poolId: string, status: string) {
    try {
      const pool = await this.poolModel.findOne({ poolId });
      if (!pool) {
        throw new Error('Pool not found');
      }

      // Update status on Hedera
      const result = await this.hederaService.updatePoolStatus(
        pool.poolContract,
        this.mapStatusToNumber(status)
      );

      // Update pool in database
      pool.status = status as any;
      await pool.save();

      this.logger.log(`Pool status updated: ${poolId} -> ${status}`);

      return {
        success: true,
        transactionId: result.transactionId
      };
    } catch (error) {
      this.logger.error(`Error updating pool status: ${error.message}`);
      throw error;
    }
  }

  async getPoolPerformance(poolId: string) {
    try {
      const pool = await this.poolModel.findOne({ poolId });
      if (!pool) {
        throw new Error('Pool not found');
      }

      // Get performance data from Hedera
      const performance = await this.hederaService.getPoolPerformance(pool.poolContract);

      // Update pool performance metrics
      pool.performanceMetrics = {
        totalReturn: performance.totalReturn,
        monthlyReturn: performance.monthlyReturn,
        volatility: performance.volatility,
        sharpeRatio: performance.sharpeRatio,
        maxDrawdown: performance.maxDrawdown
      };

      await pool.save();

      return pool.performanceMetrics;
    } catch (error) {
      this.logger.error(`Error getting pool performance: ${error.message}`);
      throw error;
    }
  }

  private mapRiskLevel(riskLevel: string): number {
    switch (riskLevel) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      default: return 2;
    }
  }

  private mapStatusToNumber(status: string): number {
    switch (status) {
      case 'draft': return 1;
      case 'active': return 2;
      case 'paused': return 3;
      case 'closed': return 4;
      case 'matured': return 5;
      default: return 1;
    }
  }

  private generateTags(strategy: string, riskLevel: string): string[] {
    const tags = [riskLevel];
    
    if (strategy.toLowerCase().includes('real estate')) {
      tags.push('real-estate', 'property');
    }
    if (strategy.toLowerCase().includes('agricultural')) {
      tags.push('agriculture', 'farming');
    }
    if (strategy.toLowerCase().includes('commercial')) {
      tags.push('commercial', 'business');
    }
    if (strategy.toLowerCase().includes('residential')) {
      tags.push('residential', 'housing');
    }

    return tags;
  }
}
