import { apiService } from './api';

export interface TrustTokenInfo {
  tokenId: string | null;
  balance?: number;
}

export class TrustTokenService {
  private static trustTokenId: string | null = null;

  /**
   * Get TRUST token information from backend
   */
  static async getTrustTokenInfo(): Promise<TrustTokenInfo> {
    try {
      const response = await apiService.get('/hedera/trust-token/info');
      this.trustTokenId = response.data.tokenId;
      return {
        tokenId: response.data.tokenId,
        balance: response.data.balance
      };
    } catch (error) {
      console.error('Failed to get TRUST token info:', error);
      return {
        tokenId: null
      };
    }
  }

  /**
   * Get TRUST token balance for an account
   */
  static async getTrustTokenBalance(accountId: string): Promise<number> {
    try {
      const response = await apiService.get(`/hedera/trust-token/balance/${accountId}`);
      return response.data.balance || 0;
    } catch (error) {
      console.error('Failed to get TRUST token balance:', error);
      return 0;
    }
  }

  /**
   * Mint TRUST tokens to an account
   */
  static async mintTrustTokens(toAccountId: string, amount: number): Promise<string> {
    try {
      const response = await apiService.post('/hedera/trust-token/mint', {
        toAccountId,
        amount
      });
      return response.data.transactionId;
    } catch (error) {
      console.error('Failed to mint TRUST tokens:', error);
      throw error;
    }
  }

  /**
   * Initialize TRUST token
   */
  static async initializeTrustToken(): Promise<string> {
    try {
      const response = await apiService.post('/hedera/trust-token/initialize');
      this.trustTokenId = response.data.tokenId;
      return response.data.tokenId;
    } catch (error) {
      console.error('Failed to initialize TRUST token:', error);
      throw error;
    }
  }

  /**
   * Exchange HBAR for TRUST tokens with automatic distribution
   */
  static async exchangeHbarForTrust(
    accountId: string, 
    hbarAmount: number,
    treasuryAccountId: string,
    operationsAccountId: string,
    stakingAccountId: string
  ): Promise<{ transactionId: string; trustAmount: number; distribution: any }> {
    try {
      const response = await apiService.post('/hedera/trust-token/exchange', {
        accountId,
        hbarAmount,
        treasuryAccountId,
        operationsAccountId,
        stakingAccountId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to exchange HBAR for TRUST tokens:', error);
      throw error;
    }
  }

  /**
   * Burn TRUST tokens (for platform fees)
   */
  static async burnTrustTokens(accountId: string, amount: number): Promise<string> {
    try {
      const response = await apiService.post('/hedera/trust-token/burn', {
        accountId,
        amount
      });
      return response.data.transactionId;
    } catch (error) {
      console.error('Failed to burn TRUST tokens:', error);
      throw error;
    }
  }

  /**
   * Get exchange rate and fee information
   */
  static async getExchangeInfo(): Promise<any> {
    try {
      const response = await apiService.get('/hedera/trust-token/exchange-info');
      return response.data;
    } catch (error) {
      console.error('Failed to get exchange info:', error);
      return {
        exchangeRate: 100,
        exchangeFeeRate: 0.01,
        minExchange: 0.5,
        distribution: {
          treasury: 0.6,
          operations: 0.25,
          staking: 0.1,
          fees: 0.05
        }
      };
    }
  }

  /**
   * Get cached TRUST token ID
   */
  static getTrustTokenId(): string | null {
    return this.trustTokenId;
  }

  // HSCS Hybrid Methods (HSCS + HTS)

  /**
   * Exchange HBAR for TRUST tokens using hybrid HSCS + HTS approach
   */
  static async hybridExchangeHbarForTrust(
    accountId: string,
    hbarAmount: number,
    treasuryAccountId: string,
    operationsAccountId: string,
    stakingAccountId: string
  ): Promise<{ transactionId: string; trustAmount: number; distribution: any }> {
    try {
      const response = await apiService.post('/hedera/trust-token/hybrid/exchange', {
        accountId,
        hbarAmount,
        treasuryAccountId,
        operationsAccountId,
        stakingAccountId
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to exchange HBAR for TRUST tokens via hybrid approach:', error);
      throw error;
    }
  }

  /**
   * Burn TRUST tokens using hybrid HSCS + HTS approach
   */
  static async hybridBurnTrustTokens(accountId: string, amount: number, reason?: string): Promise<string> {
    try {
      const response = await apiService.post('/hedera/trust-token/hybrid/burn', {
        accountId,
        amount,
        reason: reason || 'NFT_CREATION'
      });
      return response.data.data.transactionId;
    } catch (error) {
      console.error('Failed to burn TRUST tokens via hybrid approach:', error);
      throw error;
    }
  }

  /**
   * Calculate NFT creation fee using hybrid HSCS + HTS approach
   */
  static async hybridCalculateNftCreationFee(verificationLevel: string, rarity: string): Promise<number> {
    try {
      const response = await apiService.post('/hedera/trust-token/hybrid/calculate-fee', {
        verificationLevel,
        rarity
      });
      return response.data.data.fee;
    } catch (error) {
      console.error('Failed to calculate NFT creation fee via hybrid approach:', error);
      // Fallback to default calculation
      const baseCost = 50;
      const verificationMultiplier = verificationLevel === 'premium' ? 2 : 1;
      const rarityMultiplier = rarity === 'legendary' ? 3 :
                              rarity === 'epic' ? 2 : 1;
      return baseCost * verificationMultiplier * rarityMultiplier;
    }
  }

  /**
   * Get TRUST token balance using hybrid HSCS + HTS approach
   */
  static async hybridGetTrustTokenBalance(accountId: string): Promise<number> {
    try {
      const response = await apiService.get(`/hedera/trust-token/hybrid/balance/${accountId}`);
      console.log('Backend balance response:', response);
      return response.data.balance || 0;
    } catch (error) {
      console.error('Failed to get TRUST token balance via hybrid approach:', error);
      return 0;
    }
  }

  /**
   * Stake TRUST tokens using hybrid HSCS + HTS approach
   */
  static async hybridStakeTrustTokens(accountId: string, amount: number, duration: number): Promise<string> {
    try {
      const response = await apiService.post('/hedera/trust-token/hybrid/stake', {
        accountId,
        amount,
        duration
      });
      return response.data.data.transactionId;
    } catch (error) {
      console.error('Failed to stake TRUST tokens via hybrid approach:', error);
      throw error;
    }
  }
}
