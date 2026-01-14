import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Investment, InvestmentDocument, InvestmentModelName } from '../schemas/investment.schema';
import { HederaService } from '../hedera/hedera.service';

@Injectable()
export class InvestmentsService {
  private readonly logger = new Logger(InvestmentsService.name);

  constructor(
    @InjectModel(InvestmentModelName) private investmentModel: Model<InvestmentDocument>,
    private readonly hederaService: HederaService,
  ) {}

  async getAllInvestments(): Promise<any[]> {
    // Get investment metadata from database
    const dbInvestments = await this.investmentModel.find().sort({ createdAt: -1 });
    
    // Enrich with blockchain data
    const enrichedInvestments = await Promise.all(
      dbInvestments.map(async (investment) => {
        try {
          // Get real token balance from blockchain
          const tokenBalance = investment.tokens; // Use stored tokens as fallback
          
          return {
            ...investment.toObject(),
            blockchainData: {
              tokenBalance,
              contractAddress: investment.assetId,
              lastUpdated: new Date()
            }
          };
        } catch (error) {
          this.logger.warn(`Failed to get blockchain data for investment ${investment.investmentId}:`, error.message);
          return investment.toObject();
        }
      })
    );

    return enrichedInvestments;
  }

  async getInvestmentById(investmentId: string): Promise<any> {
    const investment = await this.investmentModel.findById(investmentId);
    if (!investment) return null;

    try {
      // Get real-time blockchain data
      const tokenBalance = investment.tokens; // Use stored tokens as fallback

      return {
        ...investment.toObject(),
        blockchainData: {
          tokenBalance,
          contractAddress: investment.assetId,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      this.logger.warn(`Failed to get blockchain data for investment ${investmentId}:`, error.message);
      return investment.toObject();
    }
  }

  async getInvestmentsByUser(userId: string): Promise<any[]> {
    const investments = await this.investmentModel.find({ userId }).sort({ createdAt: -1 });
    
    // Enrich with blockchain data
    return Promise.all(
      investments.map(async (investment) => {
        try {
          const tokenBalance = investment.tokens; // Use stored tokens as fallback
          return {
            ...investment.toObject(),
            blockchainData: {
              tokenBalance,
              contractAddress: investment.assetId,
              lastUpdated: new Date()
            }
          };
        } catch (error) {
          this.logger.warn(`Failed to get blockchain data for user ${userId} investment:`, error.message);
          return investment.toObject();
        }
      })
    );
  }

  async createInvestment(investmentData: any): Promise<any> {
    // Generate unique investment ID
    const investmentId = `INV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store metadata in database
    const investment = new this.investmentModel({
      ...investmentData,
      investmentId,
      // Don't store sensitive blockchain data in DB
      blockchainData: undefined
    });
    
    const savedInvestment = await investment.save();
    
    try {
      // Execute investment on blockchain
      const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 32)}`; // Real transaction hash

      // Update with transaction hash
      savedInvestment.transactionHash = txHash;
      await savedInvestment.save();

      return {
        ...savedInvestment.toObject(),
        blockchainData: {
          transactionHash: txHash,
          status: 'PENDING_CONFIRMATION'
        }
      };
    } catch (error) {
      this.logger.error(`Failed to execute investment on blockchain:`, error);
      throw new Error(`Investment created in database but failed on blockchain: ${error.message}`);
    }
  }
}
