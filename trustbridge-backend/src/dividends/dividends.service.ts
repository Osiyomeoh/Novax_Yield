import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DividendDistribution, DividendDistributionDocument, DividendStatus, DividendType } from '../schemas/dividend-distribution.schema';
import { PoolTokenHoldings, PoolTokenHoldingsDocument } from '../schemas/pool-token-holdings.schema';
import { AMCPool, AMCPoolDocument } from '../schemas/amc-pool.schema';
import { MantleService } from '../mantle/mantle.service';
import { AdminService } from '../admin/admin.service';

export interface CreateDividendDto {
  poolId: string;
  dividendType: DividendType;
  totalDividendAmount: number;
  distributionDate: string;
  recordDate: string;
  description: string;
  sourceOfFunds: string;
  metadata?: {
    previousDividendId?: string;
    dividendYield?: number;
    payoutRatio?: number;
    frequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'SPECIAL';
    taxWithholding?: number;
    currency?: string;
    exchangeRate?: number;
  };
}

export interface ClaimDividendDto {
  distributionId: string;
  holderAddress: string;
}

export interface DividendStats {
  totalDistributions: number;
  totalDistributed: number;
  totalClaimed: number;
  totalUnclaimed: number;
  averageDividendYield: number;
  distributionsThisYear: number;
  distributionsThisMonth: number;
  pendingDistributions: number;
}

@Injectable()
export class DividendsService {
  private readonly logger = new Logger(DividendsService.name);

  constructor(
    @InjectModel(DividendDistribution.name) private dividendDistributionModel: Model<DividendDistributionDocument>,
    @InjectModel(PoolTokenHoldings.name) private poolTokenHoldingsModel: Model<PoolTokenHoldingsDocument>,
    @InjectModel(AMCPool.name) private amcPoolModel: Model<AMCPoolDocument>,
    private mantleService: MantleService,
    private adminService: AdminService,
  ) {}

  /**
   * Create a new dividend distribution
   */
  async createDividendDistribution(createDividendDto: CreateDividendDto, adminAddress: string): Promise<DividendDistribution> {
    try {
      // Verify admin has permission
      const adminRole = await this.adminService.checkAdminStatus(adminAddress);
      if (!adminRole.isAmcAdmin && !adminRole.isSuperAdmin && !adminRole.isPlatformAdmin) {
        throw new BadRequestException('Only AMC Admins can create dividend distributions');
      }

      // Validate pool exists
      const pool = await this.amcPoolModel.findOne({ poolId: createDividendDto.poolId });
      if (!pool) {
        throw new NotFoundException('Pool not found');
      }

      // Get eligible token holders at record date
      const recordDate = new Date(createDividendDto.recordDate);
      const eligibleHoldings = await this.poolTokenHoldingsModel.find({
        poolId: createDividendDto.poolId,
        isActive: true,
        totalTokens: { $gt: 0 },
        firstInvestmentDate: { $lte: recordDate }
      });

      if (eligibleHoldings.length === 0) {
        throw new BadRequestException('No eligible token holders found for dividend distribution');
      }

      // Calculate total eligible tokens
      const totalTokensEligible = eligibleHoldings.reduce((sum, holding) => sum + holding.totalTokens, 0);
      
      // Calculate per-token rate
      const perTokenRate = createDividendDto.totalDividendAmount / totalTokensEligible;

      // Generate unique distribution ID
      const distributionId = `DIV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create recipients list
      const recipients = eligibleHoldings.map(holding => ({
        holderAddress: holding.holderAddress,
        tokenAmount: holding.totalTokens,
        dividendAmount: holding.totalTokens * perTokenRate,
        perTokenRate,
        isClaimed: false,
        claimedAt: null,
        claimTransactionHash: '',
        transactionHash: '' // Will be updated after Mantle transaction completes
      }));

      // Create dividend distribution
      const dividendDistribution = new this.dividendDistributionModel({
        distributionId,
        poolId: createDividendDto.poolId,
        poolName: pool.name,
        createdBy: adminAddress,
        dividendType: createDividendDto.dividendType,
        status: DividendStatus.PENDING,
        totalDividendAmount: createDividendDto.totalDividendAmount,
        perTokenRate,
        totalTokensEligible,
        totalRecipients: recipients.length,
        distributionDate: new Date(createDividendDto.distributionDate),
        recordDate,
        description: createDividendDto.description,
        sourceOfFunds: createDividendDto.sourceOfFunds,
        recipients,
        totalClaimed: 0,
        totalUnclaimed: createDividendDto.totalDividendAmount,
        claimCount: 0,
        metadata: {
          previousDividendId: createDividendDto.metadata?.previousDividendId || '',
          dividendYield: createDividendDto.metadata?.dividendYield || 0,
          payoutRatio: createDividendDto.metadata?.payoutRatio || 0,
          frequency: createDividendDto.metadata?.frequency || 'SPECIAL',
          taxWithholding: createDividendDto.metadata?.taxWithholding || 0,
          currency: createDividendDto.metadata?.currency || 'USD',
          exchangeRate: createDividendDto.metadata?.exchangeRate || 1
        },
        auditTrail: [{
          action: 'CREATED',
          timestamp: new Date(),
          performedBy: adminAddress,
          details: 'Dividend distribution created'
        }]
      });

      const savedDistribution = await dividendDistribution.save();
      this.logger.log(`Created dividend distribution: ${distributionId} for pool ${createDividendDto.poolId}`);

      return savedDistribution;
    } catch (error) {
      this.logger.error('Failed to create dividend distribution:', error);
      throw error;
    }
  }

  /**
   * Execute dividend distribution
   */
  async executeDividendDistribution(distributionId: string, adminAddress: string): Promise<DividendDistribution> {
    try {
      // Verify admin has permission
      const adminRole = await this.adminService.checkAdminStatus(adminAddress);
      if (!adminRole.isAmcAdmin && !adminRole.isSuperAdmin && !adminRole.isPlatformAdmin) {
        throw new BadRequestException('Only AMC Admins can execute dividend distributions');
      }

      const distribution = await this.dividendDistributionModel.findOne({ distributionId });
      if (!distribution) {
        throw new NotFoundException('Dividend distribution not found');
      }

      if (distribution.status !== DividendStatus.PENDING) {
        throw new BadRequestException('Dividend distribution is not in pending status');
      }

      // Check if distribution date has arrived
      if (new Date() < distribution.distributionDate) {
        throw new BadRequestException('Distribution date has not arrived yet');
      }

      // Update status to distributing
      distribution.status = DividendStatus.DISTRIBUTING;
      distribution.distributedAt = new Date();
      
      distribution.auditTrail.push({
        action: 'EXECUTION_STARTED',
        timestamp: new Date(),
        performedBy: adminAddress,
        details: 'Dividend distribution execution started'
      });

      await distribution.save();

      // Update token holdings for all recipients
      for (const recipient of distribution.recipients) {
        await this.updateTokenHoldingsForDividend(recipient, distribution);
      }

      // Update distribution status
      distribution.status = DividendStatus.DISTRIBUTED;
      distribution.completedAt = new Date();
      
      distribution.auditTrail.push({
        action: 'EXECUTION_COMPLETED',
        timestamp: new Date(),
        performedBy: adminAddress,
        details: 'Dividend distribution execution completed'
      });

      const updatedDistribution = await distribution.save();
      this.logger.log(`Executed dividend distribution: ${distributionId}`);

      return updatedDistribution;
    } catch (error) {
      this.logger.error('Failed to execute dividend distribution:', error);
      throw error;
    }
  }

  /**
   * Claim dividend for a holder
   */
  async claimDividend(claimDto: ClaimDividendDto): Promise<DividendDistribution> {
    try {
      const distribution = await this.dividendDistributionModel.findOne({ distributionId: claimDto.distributionId });
      if (!distribution) {
        throw new NotFoundException('Dividend distribution not found');
      }

      if (distribution.status !== DividendStatus.DISTRIBUTED) {
        throw new BadRequestException('Dividend distribution is not available for claiming');
      }

      const recipient = distribution.recipients.find(r => r.holderAddress === claimDto.holderAddress);
      if (!recipient) {
        throw new NotFoundException('Recipient not found in dividend distribution');
      }

      if (recipient.isClaimed) {
        throw new BadRequestException('Dividend has already been claimed');
      }

      // Mark dividend as claimed
      recipient.isClaimed = true;
      recipient.claimedAt = new Date();
      recipient.claimTransactionHash = ''; // TODO: Add actual transaction hash
      recipient.claimTransactionHash = ''; // Will be updated after Mantle transaction completes

      // Update distribution totals
      distribution.totalClaimed += recipient.dividendAmount;
      distribution.totalUnclaimed -= recipient.dividendAmount;
      distribution.claimCount += 1;

      // Update token holdings
      await this.updateTokenHoldingsForClaim(claimDto.holderAddress, distribution.poolId, recipient);

      await distribution.save();
      this.logger.log(`Claimed dividend ${claimDto.distributionId} for ${claimDto.holderAddress}`);

      return distribution;
    } catch (error) {
      this.logger.error('Failed to claim dividend:', error);
      throw error;
    }
  }

  /**
   * Get dividend distributions for a pool
   */
  async getPoolDividendDistributions(poolId: string): Promise<DividendDistribution[]> {
    try {
      return await this.dividendDistributionModel
        .find({ poolId })
        .sort({ distributionDate: -1 });
    } catch (error) {
      this.logger.error('Failed to get pool dividend distributions:', error);
      throw error;
    }
  }

  /**
   * Get user's dividend distributions
   */
  async getUserDividendDistributions(holderAddress: string): Promise<DividendDistribution[]> {
    try {
      return await this.dividendDistributionModel
        .find({ 
          'recipients.holderAddress': holderAddress,
          status: DividendStatus.DISTRIBUTED
        })
        .sort({ distributionDate: -1 });
    } catch (error) {
      this.logger.error('Failed to get user dividend distributions:', error);
      throw error;
    }
  }

  /**
   * Get dividend statistics
   */
  async getDividendStats(poolId?: string): Promise<DividendStats> {
    try {
      const query = poolId ? { poolId } : {};
      
      const distributions = await this.dividendDistributionModel.find(query);
      
      const totalDistributions = distributions.length;
      const totalDistributed = distributions.reduce((sum, d) => sum + d.totalDividendAmount, 0);
      const totalClaimed = distributions.reduce((sum, d) => sum + d.totalClaimed, 0);
      const totalUnclaimed = distributions.reduce((sum, d) => sum + d.totalUnclaimed, 0);
      
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      
      const distributionsThisYear = distributions.filter(d => 
        new Date(d.distributionDate).getFullYear() === currentYear
      ).length;
      
      const distributionsThisMonth = distributions.filter(d => {
        const distDate = new Date(d.distributionDate);
        return distDate.getFullYear() === currentYear && distDate.getMonth() === currentMonth;
      }).length;
      
      const pendingDistributions = distributions.filter(d => 
        d.status === DividendStatus.PENDING
      ).length;
      
      const averageDividendYield = distributions.length > 0 ? 
        distributions.reduce((sum, d) => sum + (d.metadata.dividendYield || 0), 0) / distributions.length : 0;

      return {
        totalDistributions,
        totalDistributed,
        totalClaimed,
        totalUnclaimed,
        averageDividendYield,
        distributionsThisYear,
        distributionsThisMonth,
        pendingDistributions
      };
    } catch (error) {
      this.logger.error('Failed to get dividend stats:', error);
      throw error;
    }
  }

  /**
   * Cancel dividend distribution
   */
  async cancelDividendDistribution(distributionId: string, adminAddress: string): Promise<DividendDistribution> {
    try {
      // Verify admin has permission
      const adminRole = await this.adminService.checkAdminStatus(adminAddress);
      if (!adminRole.isAmcAdmin && !adminRole.isSuperAdmin && !adminRole.isPlatformAdmin) {
        throw new BadRequestException('Only AMC Admins can cancel dividend distributions');
      }

      const distribution = await this.dividendDistributionModel.findOne({ distributionId });
      if (!distribution) {
        throw new NotFoundException('Dividend distribution not found');
      }

      if (distribution.status === DividendStatus.DISTRIBUTED) {
        throw new BadRequestException('Cannot cancel already distributed dividend');
      }

      distribution.status = DividendStatus.CANCELLED;
      distribution.cancelledAt = new Date();
      
      distribution.auditTrail.push({
        action: 'CANCELLED',
        timestamp: new Date(),
        performedBy: adminAddress,
        details: 'Dividend distribution cancelled'
      });

      const updatedDistribution = await distribution.save();
      this.logger.log(`Cancelled dividend distribution: ${distributionId}`);

      return updatedDistribution;
    } catch (error) {
      this.logger.error('Failed to cancel dividend distribution:', error);
      throw error;
    }
  }

  /**
   * Update token holdings for dividend distribution
   */
  private async updateTokenHoldingsForDividend(recipient: any, distribution: DividendDistribution): Promise<void> {
    try {
      const holding = await this.poolTokenHoldingsModel.findOne({
        holderAddress: recipient.holderAddress,
        poolId: distribution.poolId
      });

      if (holding) {
        holding.totalDividendsReceived += recipient.dividendAmount;
        holding.totalDividendsUnclaimed += recipient.dividendAmount;
        holding.lastActivityDate = new Date();

        await holding.save();
      }
    } catch (error) {
      this.logger.error('Failed to update token holdings for dividend:', error);
    }
  }

  /**
   * Update token holdings for dividend claim
   */
  private async updateTokenHoldingsForClaim(holderAddress: string, poolId: string, recipient: any): Promise<void> {
    try {
      const holding = await this.poolTokenHoldingsModel.findOne({
        holderAddress,
        poolId
      });

      if (holding) {
        holding.totalDividendsClaimed += recipient.dividendAmount;
        holding.totalDividendsUnclaimed -= recipient.dividendAmount;
        holding.lastActivityDate = new Date();

        await holding.save();
      }
    } catch (error) {
      this.logger.error('Failed to update token holdings for claim:', error);
    }
  }

  /**
   * Get upcoming dividend distributions
   */
  async getUpcomingDividendDistributions(): Promise<DividendDistribution[]> {
    try {
      return await this.dividendDistributionModel
        .find({
          status: DividendStatus.PENDING,
          distributionDate: { $gt: new Date() }
        })
        .sort({ distributionDate: 1 });
    } catch (error) {
      this.logger.error('Failed to get upcoming dividend distributions:', error);
      throw error;
    }
  }

  /**
   * Get dividend distribution by ID
   */
  async getDividendDistribution(distributionId: string): Promise<DividendDistribution> {
    try {
      const distribution = await this.dividendDistributionModel.findOne({ distributionId });
      if (!distribution) {
        throw new NotFoundException('Dividend distribution not found');
      }
      return distribution;
    } catch (error) {
      this.logger.error('Failed to get dividend distribution:', error);
      throw error;
    }
  }
}
