import { 
  TokenCreateTransaction, 
  TokenType, 
  TokenSupplyType, 
  TokenMintTransaction,
  TokenAssociateTransaction,
  TokenId,
  PrivateKey,
  AccountId,
  Hbar
} from '@hashgraph/sdk';

export interface PoolTokenData {
  poolName: string;
  poolDescription: string;
  assetNFTs: string[]; // Array of RWA NFT token IDs
  totalPoolValue: number;
  tokenSupply: number;
  expectedAPY: number;
  tranches: {
    senior: {
      percentage: number; // e.g., 70%
      apy: number; // e.g., 8%
      riskLevel: 'LOW';
    };
    junior: {
      percentage: number; // e.g., 30%
      apy: number; // e.g., 15%
      riskLevel: 'HIGH';
    };
  };
  amcAccount: string;
  poolId: string;
}

export interface PoolTokenResult {
  poolTokenId: string;
  seniorTokenId: string;
  juniorTokenId: string;
  transactionId: string;
  poolId: string;
  totalSupply: number;
}

export class PoolTokenService {
  private hederaClient: any;
  private signer: any;

  constructor(hederaClient: any, signer: any) {
    this.hederaClient = hederaClient;
    this.signer = signer;
  }

  /**
   * Create pool tokens following Centrifuge model
   * Creates fungible tokens for pool shares (Senior/Junior tranches)
   */
  async createPoolTokens(
    poolData: PoolTokenData
  ): Promise<PoolTokenResult> {
    try {
      console.log('🏊 Creating pool tokens following Centrifuge model...');
      console.log('📊 Pool Data:', {
        poolName: poolData.poolName,
        assetNFTs: poolData.assetNFTs,
        totalValue: poolData.totalPoolValue,
        tranches: poolData.tranches
      });

      // Calculate token supplies for each tranche
      const seniorSupply = Math.floor(poolData.tokenSupply * (poolData.tranches.senior.percentage / 100));
      const juniorSupply = poolData.tokenSupply - seniorSupply;

      console.log('💰 Token Economics:', {
        totalSupply: poolData.tokenSupply,
        seniorSupply,
        juniorSupply,
        seniorPercentage: poolData.tranches.senior.percentage,
        juniorPercentage: poolData.tranches.junior.percentage
      });

      // Step 1: Create Senior Tranche Token
      console.log('🪙 Creating Senior Tranche Token...');
      
      const seniorTokenCreateTx = new TokenCreateTransaction()
        .setTokenName(`${poolData.poolName} Senior Pool Token`)
        .setTokenSymbol(`${poolData.poolName.slice(0, 3).toUpperCase()}S`)
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(6)
        .setInitialSupply(0)
        .setTreasuryAccountId(poolData.amcAccount)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(seniorSupply)
        .setTokenMemo(`POOL:${poolData.poolId}|TRANCHE:SENIOR|APY:${poolData.tranches.senior.apy}%|RISK:LOW`)
        .setMaxTransactionFee(new Hbar(10))
        .setTransactionValidDuration(120);

      seniorTokenCreateTx.freezeWithSigner(this.signer);
      const signedSeniorTx = await this.signer.signTransaction(seniorTokenCreateTx);
      const seniorResponse = await signedSeniorTx.execute(this.hederaClient);

      if (!seniorResponse.transactionId) {
        throw new Error('Senior token creation failed');
      }

      const seniorReceipt = await seniorResponse.getReceipt(this.hederaClient);
      const seniorTokenId = seniorReceipt.tokenId?.toString();

      if (!seniorTokenId) {
        throw new Error('Senior token creation failed - no token ID');
      }

      console.log(`✅ Senior Tranche Token created: ${seniorTokenId}`);

      // Step 2: Create Junior Tranche Token
      console.log('🪙 Creating Junior Tranche Token...');
      
      const juniorTokenCreateTx = new TokenCreateTransaction()
        .setTokenName(`${poolData.poolName} Junior Pool Token`)
        .setTokenSymbol(`${poolData.poolName.slice(0, 3).toUpperCase()}J`)
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(6)
        .setInitialSupply(0)
        .setTreasuryAccountId(poolData.amcAccount)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(juniorSupply)
        .setTokenMemo(`POOL:${poolData.poolId}|TRANCHE:JUNIOR|APY:${poolData.tranches.junior.apy}%|RISK:HIGH`)
        .setMaxTransactionFee(new Hbar(10))
        .setTransactionValidDuration(120);

      juniorTokenCreateTx.freezeWithSigner(this.signer);
      const signedJuniorTx = await this.signer.signTransaction(juniorTokenCreateTx);
      const juniorResponse = await signedJuniorTx.execute(this.hederaClient);

      if (!juniorResponse.transactionId) {
        throw new Error('Junior token creation failed');
      }

      const juniorReceipt = await juniorResponse.getReceipt(this.hederaClient);
      const juniorTokenId = juniorReceipt.tokenId?.toString();

      if (!juniorTokenId) {
        throw new Error('Junior token creation failed - no token ID');
      }

      console.log(`✅ Junior Tranche Token created: ${juniorTokenId}`);

      // Step 3: Create General Pool Token (for overall pool representation)
      console.log('🪙 Creating General Pool Token...');
      
      const poolTokenCreateTx = new TokenCreateTransaction()
        .setTokenName(`${poolData.poolName} Pool Token`)
        .setTokenSymbol(`${poolData.poolName.slice(0, 3).toUpperCase()}P`)
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(6)
        .setInitialSupply(0)
        .setTreasuryAccountId(poolData.amcAccount)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(poolData.tokenSupply)
        .setTokenMemo(`POOL:${poolData.poolId}|TOTAL:${poolData.totalPoolValue}|APY:${poolData.expectedAPY}%`)
        .setMaxTransactionFee(new Hbar(10))
        .setTransactionValidDuration(120);

      poolTokenCreateTx.freezeWithSigner(this.signer);
      const signedPoolTx = await this.signer.signTransaction(poolTokenCreateTx);
      const poolResponse = await signedPoolTx.execute(this.hederaClient);

      if (!poolResponse.transactionId) {
        throw new Error('Pool token creation failed');
      }

      const poolReceipt = await poolResponse.getReceipt(this.hederaClient);
      const poolTokenId = poolReceipt.tokenId?.toString();

      if (!poolTokenId) {
        throw new Error('Pool token creation failed - no token ID');
      }

      console.log(`✅ General Pool Token created: ${poolTokenId}`);

      // Step 4: Store pool configuration
      const poolConfig = {
        poolId: poolData.poolId,
        poolName: poolData.poolName,
        poolDescription: poolData.poolDescription,
        assetNFTs: poolData.assetNFTs,
        totalPoolValue: poolData.totalPoolValue,
        expectedAPY: poolData.expectedAPY,
        amcAccount: poolData.amcAccount,
        tokens: {
          pool: poolTokenId,
          senior: seniorTokenId,
          junior: juniorTokenId
        },
        supplies: {
          total: poolData.tokenSupply,
          senior: seniorSupply,
          junior: juniorSupply
        },
        tranches: poolData.tranches,
        createdAt: new Date().toISOString(),
        status: 'ACTIVE'
      };

      // Store in localStorage (in production, use backend)
      const existingPools = JSON.parse(localStorage.getItem('rwaPools') || '[]');
      existingPools.push(poolConfig);
      localStorage.setItem('rwaPools', JSON.stringify(existingPools));

      console.log('✅ Pool configuration stored:', poolConfig);

      return {
        poolTokenId,
        seniorTokenId,
        juniorTokenId,
        transactionId: poolResponse.transactionId.toString(),
        poolId: poolData.poolId,
        totalSupply: poolData.tokenSupply
      };

    } catch (error) {
      console.error('❌ Pool token creation failed:', error);
      throw error;
    }
  }

  /**
   * Mint pool tokens to investor
   */
  async mintPoolTokens(
    tokenId: string,
    amount: number,
    toAccount: string
  ): Promise<string> {
    try {
      console.log(`🎯 Minting ${amount} pool tokens to ${toAccount}`);

      const mintTx = new TokenMintTransaction()
        .setTokenId(TokenId.fromString(tokenId))
        .setAmount(amount)
        .setMaxTransactionFee(new Hbar(5))
        .setTransactionValidDuration(120);

      mintTx.freezeWithSigner(this.signer);
      const signedMintTx = await this.signer.signTransaction(mintTx);
      const mintResponse = await signedMintTx.execute(this.hederaClient);

      if (!mintResponse.transactionId) {
        throw new Error('Pool token minting failed');
      }

      console.log(`✅ Minted ${amount} pool tokens`);
      return mintResponse.transactionId.toString();

    } catch (error) {
      console.error('❌ Pool token minting failed:', error);
      throw error;
    }
  }

  /**
   * Get pool token balance for an account
   */
  async getPoolTokenBalance(accountId: string, tokenId: string): Promise<number> {
    try {
      const response = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`
      );
      const data = await response.json();
      
      if (data.tokens && data.tokens.length > 0) {
        return parseInt(data.tokens[0].balance) / 1000000; // Convert from tinybars
      }
      
      return 0;
    } catch (error) {
      console.error('❌ Failed to get pool token balance:', error);
      return 0;
    }
  }

  /**
   * Get pool information
   */
  async getPoolInfo(poolId: string): Promise<any> {
    const pools = JSON.parse(localStorage.getItem('rwaPools') || '[]');
    return pools.find((p: any) => p.poolId === poolId);
  }

  /**
   * Get all pools
   */
  async getAllPools(): Promise<any[]> {
    return JSON.parse(localStorage.getItem('rwaPools') || '[]');
  }
}

export const poolTokenService = new PoolTokenService(null, null);


