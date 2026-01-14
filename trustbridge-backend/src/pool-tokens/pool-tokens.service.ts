import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PoolTokenHoldings, PoolTokenHoldingsDocument, TokenTransferType } from '../schemas/pool-token-holdings.schema';
import { AMCPool, AMCPoolDocument } from '../schemas/amc-pool.schema';
import { HederaService } from '../hedera/hedera.service';

export interface TransferTokensDto {
  fromAddress: string;
  toAddress: string;
  amount: number;
  transferType: TokenTransferType;
  description?: string;
  referenceId?: string;
}

export interface ClaimDividendDto {
  holderAddress: string;
  poolId: string;
  dividendId: string;
}

export interface StakeTokensDto {
  holderAddress: string;
  poolId: string;
  amount: number;
  duration?: number; // days
}

@Injectable()
export class PoolTokensService {
  private readonly logger = new Logger(PoolTokensService.name);

  constructor(
    @InjectModel(PoolTokenHoldings.name) private poolTokenHoldingsModel: Model<PoolTokenHoldingsDocument>,
    @InjectModel(AMCPool.name) private amcPoolModel: Model<AMCPoolDocument>,
    private hederaService: HederaService,
  ) {}

  /**
   * Get user's pool token holdings
   */
  async getUserHoldings(holderAddress: string): Promise<PoolTokenHoldings[]> {
    try {
      return await this.poolTokenHoldingsModel.find({ 
        holderAddress,
        isActive: true 
      }).sort({ lastActivityDate: -1 });
    } catch (error) {
      this.logger.error('Failed to get user holdings:', error);
      throw error;
    }
  }

  /**
   * Get specific pool token holding
   */
  async getPoolHolding(holderAddress: string, poolId: string): Promise<PoolTokenHoldings> {
    try {
      const holding = await this.poolTokenHoldingsModel.findOne({ 
        holderAddress,
        poolId 
      });

      if (!holding) {
        throw new NotFoundException('Pool token holding not found');
      }

      return holding;
    } catch (error) {
      this.logger.error('Failed to get pool holding:', error);
      throw error;
    }
  }

  /**
   * Update token holdings after investment
   */
  async updateHoldingsAfterInvestment(
    holderAddress: string,
    poolId: string,
    tokenAmount: number,
    pricePerToken: number,
    totalValue: number
  ): Promise<PoolTokenHoldings> {
    try {
      const pool = await this.amcPoolModel.findOne({ poolId });
      if (!pool) {
        throw new NotFoundException('Pool not found');
      }

      let holding = await this.poolTokenHoldingsModel.findOne({ 
        holderAddress,
        poolId 
      });

      const transferId = `TRANSFER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (holding) {
        // Update existing holding
        const newTotalTokens = holding.totalTokens + tokenAmount;
        const newTotalInvested = holding.totalInvested + totalValue;
        const newAverageBuyPrice = newTotalInvested / newTotalTokens;

        holding.totalTokens = newTotalTokens;
        holding.availableTokens = holding.availableTokens + tokenAmount;
        holding.totalInvested = newTotalInvested;
        holding.averageBuyPrice = newAverageBuyPrice;
        holding.lastActivityDate = new Date();

        // Add transfer record
        holding.transfers.push({
          transferId,
          type: TokenTransferType.INVESTMENT,
          fromAddress: 'POOL_TREASURY',
          toAddress: holderAddress,
          amount: tokenAmount,
          pricePerToken,
          totalValue,
          transactionHash: '',
          hederaTransactionId: '',
          description: 'Pool token purchase',
          transferDate: new Date(),
          fees: 0,
          referenceId: ''
        });

        await this.poolTokenHoldingsModel.findByIdAndUpdate((holding as any)._id, holding);
      } else {
        // Create new holding
        holding = new this.poolTokenHoldingsModel({
          holderAddress,
          poolId,
          poolTokenId: pool.hederaTokenId,
          poolName: pool.name,
          totalTokens: tokenAmount,
          availableTokens: tokenAmount,
          lockedTokens: 0,
          totalInvested: totalValue,
          totalDividendsReceived: 0,
          totalDividendsClaimed: 0,
          totalDividendsUnclaimed: 0,
          averageBuyPrice: pricePerToken,
          currentValue: 0,
          unrealizedPnL: 0,
          realizedPnL: 0,
          totalPnL: 0,
          roi: 0,
          transfers: [{
            transferId,
            type: TokenTransferType.INVESTMENT,
            fromAddress: 'POOL_TREASURY',
            toAddress: holderAddress,
            amount: tokenAmount,
            pricePerToken,
            totalValue,
            transactionHash: '',
            hederaTransactionId: '',
            description: 'Pool token purchase',
            transferDate: new Date(),
            fees: 0,
            referenceId: ''
          }],
          dividends: [],
          firstInvestmentDate: new Date(),
          lastActivityDate: new Date(),
          isActive: true,
          metadata: {
            riskLevel: pool.metadata.riskLevel,
            poolType: pool.type,
            expectedAPY: pool.expectedAPY,
            maturityDate: pool.maturityDate,
            isTradeable: pool.isTradeable,
            lastPriceUpdate: new Date(),
            priceChange24h: 0
          },
          stakingRecords: []
        });

        await this.poolTokenHoldingsModel.findByIdAndUpdate((holding as any)._id, holding);
      }

      // Update current value and PnL
      await this.updateHoldingValue(holding);

      this.logger.log(`Updated holdings for ${holderAddress} in pool ${poolId}: +${tokenAmount} tokens`);
      return holding;
    } catch (error) {
      this.logger.error('Failed to update holdings after investment:', error);
      throw error;
    }
  }

  /**
   * Transfer tokens between addresses
   */
  async transferTokens(transferDto: TransferTokensDto): Promise<PoolTokenHoldings> {
    try {
      const { fromAddress, toAddress, amount, transferType, description, referenceId } = transferDto;

      if (fromAddress === toAddress) {
        throw new BadRequestException('Cannot transfer tokens to the same address');
      }

      // Get sender's holding
      const senderHolding = await this.poolTokenHoldingsModel.findOne({ 
        holderAddress: fromAddress,
        isActive: true 
      });

      if (!senderHolding) {
        throw new NotFoundException('Sender does not have token holdings');
      }

      if (senderHolding.availableTokens < amount) {
        throw new BadRequestException('Insufficient token balance');
      }

      // Update sender's holding
      senderHolding.availableTokens -= amount;
      senderHolding.lastActivityDate = new Date();

      // Get receiver's holding
      let receiverHolding = await this.poolTokenHoldingsModel.findOne({ 
        holderAddress: toAddress,
        poolId: senderHolding.poolId 
      });

      const transferId = `TRANSFER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const currentPrice = senderHolding.metadata.lastPriceUpdate ? 
        await this.getCurrentPoolPrice(senderHolding.poolId) : senderHolding.averageBuyPrice;

      if (receiverHolding) {
        // Update existing receiver holding
        receiverHolding.totalTokens += amount;
        receiverHolding.availableTokens += amount;
        receiverHolding.lastActivityDate = new Date();

        // Recalculate average buy price
        const newTotalInvested = receiverHolding.totalInvested + (amount * currentPrice);
        receiverHolding.averageBuyPrice = newTotalInvested / receiverHolding.totalTokens;
        receiverHolding.totalInvested = newTotalInvested;
      } else {
        // Create new receiver holding
        const pool = await this.amcPoolModel.findOne({ poolId: senderHolding.poolId });
        if (!pool) {
          throw new NotFoundException('Pool not found');
        }

        receiverHolding = new this.poolTokenHoldingsModel({
          holderAddress: toAddress,
          poolId: senderHolding.poolId,
          poolTokenId: senderHolding.poolTokenId,
          poolName: senderHolding.poolName,
          totalTokens: amount,
          availableTokens: amount,
          lockedTokens: 0,
          totalInvested: amount * currentPrice,
          totalDividendsReceived: 0,
          totalDividendsClaimed: 0,
          totalDividendsUnclaimed: 0,
          averageBuyPrice: currentPrice,
          currentValue: 0,
          unrealizedPnL: 0,
          realizedPnL: 0,
          totalPnL: 0,
          roi: 0,
          transfers: [],
          dividends: [],
          firstInvestmentDate: new Date(),
          lastActivityDate: new Date(),
          isActive: true,
          metadata: senderHolding.metadata,
          stakingRecords: []
        });
      }

      // Add transfer records to both holdings
      const transferRecord = {
        transferId,
        type: transferType,
        fromAddress,
        toAddress,
        amount,
        pricePerToken: currentPrice,
        totalValue: amount * currentPrice,
        transactionHash: '',
        hederaTransactionId: '',
        description: description || `Token transfer`,
        transferDate: new Date(),
        fees: 0,
        referenceId: referenceId || ''
      };

      senderHolding.transfers.push(transferRecord);
      receiverHolding.transfers.push(transferRecord);

      await Promise.all([senderHolding.save(), receiverHolding.save()]);

      // Update values
      await Promise.all([
        this.updateHoldingValue(senderHolding),
        this.updateHoldingValue(receiverHolding)
      ]);

      this.logger.log(`Transferred ${amount} tokens from ${fromAddress} to ${toAddress}`);
      return receiverHolding;
    } catch (error) {
      this.logger.error('Failed to transfer tokens:', error);
      throw error;
    }
  }

  /**
   * Update dividend distribution
   */
  async updateDividendDistribution(
    poolId: string,
    dividendAmount: number,
    perToken: number,
    description: string
  ): Promise<void> {
    try {
      const holdings = await this.poolTokenHoldingsModel.find({ 
        poolId,
        isActive: true,
        totalTokens: { $gt: 0 }
      });

      const dividendId = `DIVIDEND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      for (const holding of holdings) {
        const dividendAmount = holding.totalTokens * perToken;
        
        holding.totalDividendsReceived += dividendAmount;
        holding.totalDividendsUnclaimed += dividendAmount;
        holding.lastActivityDate = new Date();

        holding.dividends.push({
          dividendId,
          poolId,
          amount: dividendAmount,
          perToken,
          distributedAt: new Date(),
          transactionHash: '',
          description,
          isClaimed: false,
          claimedAt: null
        });

        await this.poolTokenHoldingsModel.findByIdAndUpdate((holding as any)._id, holding);
      }

      this.logger.log(`Distributed dividends to ${holdings.length} holders in pool ${poolId}`);
    } catch (error) {
      this.logger.error('Failed to update dividend distribution:', error);
      throw error;
    }
  }

  /**
   * Claim dividends
   */
  async claimDividends(claimDto: ClaimDividendDto): Promise<PoolTokenHoldings> {
    try {
      const { holderAddress, poolId, dividendId } = claimDto;

      const holding = await this.poolTokenHoldingsModel.findOne({ 
        holderAddress,
        poolId 
      });

      if (!holding) {
        throw new NotFoundException('Pool token holding not found');
      }

      const dividend = holding.dividends.find(d => d.dividendId === dividendId && !d.isClaimed);
      if (!dividend) {
        throw new NotFoundException('Dividend not found or already claimed');
      }

      dividend.isClaimed = true;
      dividend.claimedAt = new Date();
      holding.totalDividendsClaimed += dividend.amount;
      holding.totalDividendsUnclaimed -= dividend.amount;
      holding.lastActivityDate = new Date();

      await this.poolTokenHoldingsModel.findByIdAndUpdate((holding as any)._id, holding);
      await this.updateHoldingValue(holding);

      this.logger.log(`Claimed dividend ${dividendId} for ${holderAddress}`);
      return holding;
    } catch (error) {
      this.logger.error('Failed to claim dividends:', error);
      throw error;
    }
  }

  /**
   * Stake tokens for rewards
   */
  async stakeTokens(stakeDto: StakeTokensDto): Promise<PoolTokenHoldings> {
    try {
      const { holderAddress, poolId, amount, duration } = stakeDto;

      const holding = await this.poolTokenHoldingsModel.findOne({ 
        holderAddress,
        poolId 
      });

      if (!holding) {
        throw new NotFoundException('Pool token holding not found');
      }

      if (holding.availableTokens < amount) {
        throw new BadRequestException('Insufficient available tokens for staking');
      }

      const stakingId = `STAKING_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Move tokens from available to locked
      holding.availableTokens -= amount;
      holding.lockedTokens += amount;
      holding.lastActivityDate = new Date();

      holding.stakingRecords.push({
        stakingId,
        amount,
        stakedAt: new Date(),
        rewards: 0,
        status: 'ACTIVE'
      });

      await this.poolTokenHoldingsModel.findByIdAndUpdate((holding as any)._id, holding);
      await this.updateHoldingValue(holding);

      this.logger.log(`Staked ${amount} tokens for ${holderAddress} in pool ${poolId}`);
      return holding;
    } catch (error) {
      this.logger.error('Failed to stake tokens:', error);
      throw error;
    }
  }

  /**
   * Unstake tokens
   */
  async unstakeTokens(
    holderAddress: string,
    poolId: string,
    stakingId: string
  ): Promise<PoolTokenHoldings> {
    try {
      const holding = await this.poolTokenHoldingsModel.findOne({ 
        holderAddress,
        poolId 
      });

      if (!holding) {
        throw new NotFoundException('Pool token holding not found');
      }

      const stakingRecord = holding.stakingRecords.find(s => s.stakingId === stakingId && s.status === 'ACTIVE');
      if (!stakingRecord) {
        throw new NotFoundException('Active staking record not found');
      }

      // Move tokens from locked to available
      holding.lockedTokens -= stakingRecord.amount;
      holding.availableTokens += stakingRecord.amount;
      holding.lastActivityDate = new Date();

      stakingRecord.status = 'UNSTAKED';
      stakingRecord.unstakedAt = new Date();

      await this.poolTokenHoldingsModel.findByIdAndUpdate((holding as any)._id, holding);
      await this.updateHoldingValue(holding);

      this.logger.log(`Unstaked ${stakingRecord.amount} tokens for ${holderAddress}`);
      return holding;
    } catch (error) {
      this.logger.error('Failed to unstake tokens:', error);
      throw error;
    }
  }

  /**
   * Update holding value and PnL
   */
  private async updateHoldingValue(holding: PoolTokenHoldings): Promise<void> {
    try {
      const currentPrice = await this.getCurrentPoolPrice(holding.poolId);
      holding.currentValue = holding.totalTokens * currentPrice;
      holding.unrealizedPnL = holding.currentValue - holding.totalInvested;
      holding.totalPnL = holding.unrealizedPnL + holding.realizedPnL;
      holding.roi = holding.totalInvested > 0 ? (holding.totalPnL / holding.totalInvested) * 100 : 0;

      holding.metadata.lastPriceUpdate = new Date();
      await this.poolTokenHoldingsModel.findByIdAndUpdate((holding as any)._id, holding);
    } catch (error) {
      this.logger.error('Failed to update holding value:', error);
    }
  }

  /**
   * Get current pool price
   */
  private async getCurrentPoolPrice(poolId: string): Promise<number> {
    try {
      const pool = await this.amcPoolModel.findOne({ poolId });
      return pool?.currentPrice || 0;
    } catch (error) {
      this.logger.error('Failed to get current pool price:', error);
      return 0;
    }
  }

  /**
   * Get portfolio summary
   */
  async getPortfolioSummary(holderAddress: string): Promise<any> {
    try {
      const holdings = await this.poolTokenHoldingsModel.find({ 
        holderAddress,
        isActive: true 
      });

      const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
      const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
      const totalPnL = holdings.reduce((sum, h) => sum + h.totalPnL, 0);
      const totalDividends = holdings.reduce((sum, h) => sum + h.totalDividendsReceived, 0);
      const totalDividendsClaimed = holdings.reduce((sum, h) => sum + h.totalDividendsClaimed, 0);
      const totalDividendsUnclaimed = holdings.reduce((sum, h) => sum + h.totalDividendsUnclaimed, 0);

      return {
        totalHoldings: holdings.length,
        totalInvested,
        totalValue,
        totalPnL,
        totalDividends,
        totalDividendsClaimed,
        totalDividendsUnclaimed,
        roi: totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0,
        holdings: holdings.map(h => ({
          poolId: h.poolId,
          poolName: h.poolName,
          totalTokens: h.totalTokens,
          availableTokens: h.availableTokens,
          lockedTokens: h.lockedTokens,
          currentValue: h.currentValue,
          totalPnL: h.totalPnL,
          roi: h.roi,
          totalDividendsUnclaimed: h.totalDividendsUnclaimed
        }))
      };
    } catch (error) {
      this.logger.error('Failed to get portfolio summary:', error);
      throw error;
    }
  }
}
