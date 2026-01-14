import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoyaltyPayment, CreatorRoyaltyStats } from '../schemas/royalty.schema';

@Injectable()
export class RoyaltiesService {
  private readonly logger = new Logger(RoyaltiesService.name);

  constructor(
    @InjectModel(RoyaltyPayment.name)
    private royaltyPaymentModel: Model<RoyaltyPayment>,
    @InjectModel(CreatorRoyaltyStats.name)
    private creatorStatsModel: Model<CreatorRoyaltyStats>,
  ) {}

  /**
   * Record a royalty payment
   */
  async recordRoyaltyPayment(data: {
    transactionId: string;
    nftContract: string;
    tokenId: string;
    salePrice: number;
    royaltyAmount: number;
    royaltyPercentage: number;
    creator: string;
    seller: string;
    buyer: string;
  }): Promise<RoyaltyPayment> {
    try {
      const payment = new this.royaltyPaymentModel({
        ...data,
        timestamp: new Date(),
        status: 'paid',
      });

      const saved = await payment.save();
      this.logger.log(`Recorded royalty payment: ${saved.transactionId}`);

      // Update creator stats
      await this.updateCreatorStats(data.creator, data.royaltyAmount, data.nftContract);

      return saved;
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate transaction ID - already recorded
        this.logger.warn(`Royalty payment already recorded: ${data.transactionId}`);
        return null;
      }
      this.logger.error('Error recording royalty payment:', error);
      throw error;
    }
  }

  /**
   * Update creator stats
   */
  private async updateCreatorStats(
    creator: string,
    royaltyAmount: number,
    nftContract: string,
  ): Promise<void> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

      await this.creatorStatsModel.findOneAndUpdate(
        { creator },
        {
          $inc: {
            totalEarned: royaltyAmount,
            salesCount: 1,
            [`monthlyEarnings.${currentMonth}`]: royaltyAmount,
          },
          $addToSet: { nftContracts: nftContract },
        },
        { upsert: true, new: true }
      );

      // Recalculate average
      const stats = await this.creatorStatsModel.findOne({ creator });
      if (stats) {
        stats.averageRoyalty = stats.totalEarned / stats.salesCount;
        await stats.save();
      }
    } catch (error) {
      this.logger.error('Error updating creator stats:', error);
    }
  }

  /**
   * Get royalty payments for creator
   */
  async getCreatorRoyaltyPayments(
    creator: string,
    options?: {
      limit?: number;
      skip?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ payments: RoyaltyPayment[]; total: number }> {
    try {
      const query: any = { creator };

      if (options?.startDate || options?.endDate) {
        query.timestamp = {};
        if (options.startDate) query.timestamp.$gte = options.startDate;
        if (options.endDate) query.timestamp.$lte = options.endDate;
      }

      const limit = options?.limit || 50;
      const skip = options?.skip || 0;

      const [payments, total] = await Promise.all([
        this.royaltyPaymentModel
          .find(query)
          .sort({ timestamp: -1 })
          .limit(limit)
          .skip(skip)
          .exec(),
        this.royaltyPaymentModel.countDocuments(query).exec(),
      ]);

      return { payments, total };
    } catch (error) {
      this.logger.error('Error fetching creator royalty payments:', error);
      throw error;
    }
  }

  /**
   * Get creator stats
   */
  async getCreatorStats(creator: string): Promise<CreatorRoyaltyStats | null> {
    try {
      return this.creatorStatsModel.findOne({ creator }).exec();
    } catch (error) {
      this.logger.error('Error fetching creator stats:', error);
      throw error;
    }
  }

  /**
   * Get royalty payments for NFT
   */
  async getNFTRoyaltyHistory(
    nftContract: string,
    tokenId: string
  ): Promise<RoyaltyPayment[]> {
    try {
      return this.royaltyPaymentModel
        .find({ nftContract, tokenId })
        .sort({ timestamp: -1 })
        .exec();
    } catch (error) {
      this.logger.error('Error fetching NFT royalty history:', error);
      throw error;
    }
  }

  /**
   * Get top earning creators
   */
  async getTopCreators(limit: number = 10): Promise<CreatorRoyaltyStats[]> {
    try {
      return this.creatorStatsModel
        .find()
        .sort({ totalEarned: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error('Error fetching top creators:', error);
      throw error;
    }
  }

  /**
   * Get monthly earnings for creator
   */
  async getMonthlyEarnings(creator: string, months: number = 12): Promise<any> {
    try {
      const stats = await this.creatorStatsModel.findOne({ creator }).exec();
      
      if (!stats) {
        return {};
      }

      // Get last N months
      const result: any = {};
      const now = new Date();
      
      for (let i = 0; i < months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7);
        result[monthKey] = stats.monthlyEarnings[monthKey] || 0;
      }

      return result;
    } catch (error) {
      this.logger.error('Error fetching monthly earnings:', error);
      throw error;
    }
  }
}

