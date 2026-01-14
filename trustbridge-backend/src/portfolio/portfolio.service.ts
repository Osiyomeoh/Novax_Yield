import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Investment, InvestmentDocument, InvestmentModelName } from '../schemas/investment.schema';
import { HederaService } from '../hedera/hedera.service';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    @InjectModel(InvestmentModelName) private investmentModel: Model<InvestmentDocument>,
    private readonly hederaService: HederaService,
  ) {}

  async getUserPortfolio(userId: string): Promise<any> {
    // Get investment metadata from database
    const investments = await this.investmentModel.find({ userId });
    
    let totalInvested = 0;
    let totalValue = 0;
    let blockchainData = {};

    // Calculate portfolio from blockchain data
    for (const investment of investments) {
              try {
          // Get real-time token balance from blockchain (mock for now)
          const tokenBalance = investment.tokens; // Use stored tokens as fallback
          
          // Get current asset value from blockchain/oracle (mock for now)
          const currentAssetValue = investment.amount * 1.2; // Mock 20% increase
        
        const investmentValue = (tokenBalance / investment.tokens) * currentAssetValue;
        
        totalInvested += investment.amount;
        totalValue += investmentValue;
        
        blockchainData[investment.assetId] = {
          tokenBalance,
          currentValue: investmentValue,
          lastUpdated: new Date()
        };
      } catch (error) {
        this.logger.warn(`Failed to get blockchain data for asset ${investment.assetId}:`, error.message);
        // Fallback to database values
        totalInvested += investment.amount;
        totalValue += investment.amount; // Use initial amount as fallback
      }
    }
    
    const totalReturns = totalValue - totalInvested;
    
    return {
      totalInvested,
      totalValue,
      totalReturns,
      returnPercentage: totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0,
      activeInvestments: investments.filter(inv => inv.status === 'ACTIVE').length,
      investments: investments.length,
      assets: [...new Set(investments.map(inv => inv.assetId))],
      blockchainData,
      lastUpdated: new Date()
    };
  }

  async getPortfolioSummary(): Promise<any> {
    // Get all investments from database
    const investments = await this.investmentModel.find();
    
    let totalInvested = 0;
    let totalValue = 0;
    const userPortfolios = {};

    // Calculate portfolio for each user from blockchain data
    for (const investment of investments) {
      try {
        // Get real token balance from Hedera blockchain
        const tokenBalance = await this.hederaService.getTokenBalance(
          investment.userId, 
          investment.assetId
        );
        
        // Get real asset value from Hedera blockchain
        const currentAssetValue = await this.hederaService.getAssetValue(investment.assetId);
        const investmentValue = (tokenBalance / investment.tokens) * currentAssetValue;
        
        if (!userPortfolios[investment.userId]) {
          userPortfolios[investment.userId] = { invested: 0, value: 0 };
        }
        
        userPortfolios[investment.userId].invested += investment.amount;
        userPortfolios[investment.userId].value += investmentValue;
        
        totalInvested += investment.amount;
        totalValue += investmentValue;
      } catch (error) {
        this.logger.warn(`Failed to get blockchain data for portfolio summary:`, error.message);
        // Fallback to database values
        totalInvested += investment.amount;
        totalValue += investment.amount; // Use initial amount as fallback
      }
    }
    
    const totalReturns = totalValue - totalInvested;
    
    return {
      totalInvested,
      totalValue,
      totalReturns,
      returnPercentage: totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0,
      totalInvestments: investments.length,
      totalUsers: Object.keys(userPortfolios).length,
      totalAssets: [...new Set(investments.map(inv => inv.assetId))].length,
      userPortfolios,
      lastUpdated: new Date()
    };
  }
}
