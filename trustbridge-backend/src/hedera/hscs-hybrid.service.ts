import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  Client, 
  AccountId, 
  PrivateKey, 
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  ContractId,
  Hbar,
  TransferTransaction,
  TokenId,
  TokenMintTransaction,
  TokenBurnTransaction
} from '@hashgraph/sdk';

@Injectable()
export class HscsHybridService {
  private readonly logger = new Logger(HscsHybridService.name);
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;
  private trustTokenId: TokenId;

  // Contract addresses (deployed on Hedera testnet)
  private trustTokenExchangeContract: ContractId | null = null;
  private trustTokenBurnerContract: ContractId | null = null;
  private trustTokenStakingContract: ContractId | null = null;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      const accountId = this.configService.get<string>('HEDERA_ACCOUNT_ID');
      const privateKey = this.configService.get<string>('HEDERA_PRIVATE_KEY');
      const network = this.configService.get<string>('HEDERA_NETWORK', 'testnet');
      const trustTokenIdStr = this.configService.get<string>('TRUST_TOKEN_ID');

      if (!accountId || !privateKey || !trustTokenIdStr) {
        throw new Error('Hedera credentials and TRUST_TOKEN_ID are required for HSCS hybrid service');
      }

      this.operatorId = AccountId.fromString(accountId);
      this.trustTokenId = TokenId.fromString(trustTokenIdStr);
      
      try {
        this.operatorKey = PrivateKey.fromStringECDSA(privateKey);
        this.logger.log('Using ECDSA key format for HSCS hybrid service');
      } catch (ecdsaError) {
        this.logger.warn('ECDSA parsing failed, trying regular format:', ecdsaError.message);
        this.operatorKey = PrivateKey.fromString(privateKey);
        this.logger.log('Using regular key format for HSCS hybrid service');
      }
      
      this.client = Client.forName(network);
      this.client.setOperator(this.operatorId, this.operatorKey);

      // Load deployed contract addresses
      this.loadContractAddresses();

      this.logger.log(`HSCS Hybrid service initialized for ${network} with account ${accountId}`);
    } catch (error) {
      this.logger.error('Failed to initialize HSCS hybrid service:', error);
      throw error;
    }
  }

  private loadContractAddresses(): void {
    const exchangeContractId = this.configService.get<string>('TRUST_TOKEN_EXCHANGE_CONTRACT_ID');
    const burnerContractId = this.configService.get<string>('TRUST_TOKEN_BURNER_CONTRACT_ID');
    const stakingContractId = this.configService.get<string>('TRUST_TOKEN_STAKING_CONTRACT_ID');

    if (exchangeContractId) {
      this.trustTokenExchangeContract = ContractId.fromString(exchangeContractId);
      this.logger.log(`Loaded exchange contract: ${exchangeContractId}`);
    }

    if (burnerContractId) {
      this.trustTokenBurnerContract = ContractId.fromString(burnerContractId);
      this.logger.log(`Loaded burner contract: ${burnerContractId}`);
    }

    if (stakingContractId) {
      this.trustTokenStakingContract = ContractId.fromString(stakingContractId);
      this.logger.log(`Loaded staking contract: ${stakingContractId}`);
    }
  }

  /**
   * Hybrid HBAR to TRUST exchange using HSCS + HTS
   * Step 1: Calculate exchange details via HSCS contract
   * Step 2: Transfer HBAR to platform accounts (HSCS)
   * Step 3: Mint TRUST tokens via HTS
   */
  async exchangeHbarForTrust(
    fromAccountId: string,
    hbarAmount: number,
    treasuryAccountId: string,
    operationsAccountId: string,
    stakingAccountId: string,
    fromAccountPrivateKey?: string
  ): Promise<{ transactionId: string; trustAmount: number; distribution: any }> {
    try {
      this.logger.log(`🔄 Starting hybrid HBAR to TRUST exchange: ${hbarAmount} HBAR`);

      // Step 1: Calculate exchange details via HSCS contract
      const exchangeInfo = await this.getExchangeInfo();
      const exchangeRate = exchangeInfo.exchangeRate || 100; // 1 HBAR = 100 TRUST tokens
      const exchangeFeeRate = exchangeInfo.exchangeFeeRate || 0.01; // 1% fee
      
      const exchangeFee = hbarAmount * exchangeFeeRate;
      const netHbarAmount = hbarAmount - exchangeFee;
      const trustAmount = netHbarAmount * exchangeRate;

      const distribution = {
        treasury: netHbarAmount * 0.6,      // 60%
        operations: netHbarAmount * 0.25,   // 25%
        staking: netHbarAmount * 0.1,      // 10%
        fees: netHbarAmount * 0.05         // 5%
      };

      this.logger.log(`📊 Exchange calculation: ${hbarAmount} HBAR → ${trustAmount} TRUST tokens (fee: ${exchangeFee} HBAR)`);

      // Convert HBAR to tinybars (1 HBAR = 100,000,000 tinybars)
      const hbarInTinybars = Math.floor(hbarAmount * 100000000);
      const netHbarInTinybars = Math.floor(netHbarAmount * 100000000);
      const distributionInTinybars = {
        treasury: Math.floor(distribution.treasury * 100000000),
        operations: Math.floor(distribution.operations * 100000000),
        staking: Math.floor(distribution.staking * 100000000),
        fees: Math.floor(distribution.fees * 100000000)
      };

      this.logger.log(`📊 Tinybars: ${hbarInTinybars} → ${netHbarInTinybars} (distribution: ${JSON.stringify(distributionInTinybars)})`);

      // Step 2: Transfer HBAR from user account to platform accounts
      let hbarDistributionResponse;
      
      if (fromAccountPrivateKey) {
        // Real HBAR transfer: Use user's private key to sign the transaction
        this.logger.log(`Using real HBAR transfer with user's private key from ${fromAccountId}`);
        
        let userPrivateKey;
        try {
          userPrivateKey = PrivateKey.fromStringECDSA(fromAccountPrivateKey);
        } catch (ecdsaError) {
          userPrivateKey = PrivateKey.fromString(fromAccountPrivateKey);
        }
        
        // Create HBAR distribution transaction
        const hbarDistributionTx = new TransferTransaction()
          .addHbarTransfer(AccountId.fromString(fromAccountId), -hbarInTinybars)
          .addHbarTransfer(this.operatorId, hbarInTinybars) // Transfer to operator (treasury)
          .setMaxTransactionFee(new Hbar(10))
          .freezeWith(this.client);

        // Sign with user's key
        hbarDistributionTx.sign(userPrivateKey);
        
        hbarDistributionResponse = await hbarDistributionTx.execute(this.client);
        const hbarDistributionReceipt = await hbarDistributionResponse.getReceipt(this.client);
        
        this.logger.log(`✅ Real HBAR transfer successful: ${hbarDistributionResponse.transactionId.toString()}`);
        this.logger.log(`Transferred ${hbarAmount} HBAR from ${fromAccountId} to treasury`);
      } else {
        // Fallback: Simulate the transfer for testing
        this.logger.log(`No private key provided, simulating HBAR distribution: ${hbarAmount} HBAR from ${fromAccountId}`);
        this.logger.log(`Distribution: Treasury ${distribution.treasury}, Operations ${distribution.operations}, Staking ${distribution.staking}, Fees ${distribution.fees}`);
        
        const simulatedTransactionId = `simulated-${Date.now()}`;
        this.logger.log(`✅ HBAR distribution simulated: ${simulatedTransactionId}`);
        
        // Create a mock response object
        hbarDistributionResponse = {
          transactionId: { toString: () => simulatedTransactionId }
        };
      }

      // Step 3: Mint TRUST tokens via HTS
      const mintTx = new TokenMintTransaction()
        .setTokenId(this.trustTokenId)
        .setAmount(trustAmount)
        .setMaxTransactionFee(new Hbar(5));

      const mintResponse = await mintTx.execute(this.client);
      const mintReceipt = await mintResponse.getReceipt(this.client);

      this.logger.log(`✅ TRUST tokens minted: ${mintResponse.transactionId.toString()}`);

      // Step 4: Transfer TRUST tokens to user
      const transferTx = new TransferTransaction()
        .addTokenTransfer(this.trustTokenId, this.operatorId, -trustAmount)
        .addTokenTransfer(this.trustTokenId, AccountId.fromString(fromAccountId), trustAmount)
        .setMaxTransactionFee(new Hbar(5))
        .freezeWith(this.client);

      const transferResponse = await transferTx.execute(this.client);
      const transferReceipt = await transferResponse.getReceipt(this.client);

      this.logger.log(`✅ TRUST tokens transferred to user: ${transferResponse.transactionId.toString()}`);

      this.logger.log(`🎉 Exchange completed: ${hbarAmount} HBAR → ${trustAmount} TRUST tokens`);

      return {
        transactionId: hbarDistributionResponse.transactionId.toString(),
        trustAmount,
        distribution
      };
    } catch (error) {
      this.logger.error('Failed to exchange HBAR for TRUST tokens:', error);
      throw error;
    }
  }

  /**
   * Burn TRUST tokens for platform fees using HTS
   * For testing: Transfer tokens to treasury and burn them
   * In production: User would sign the transfer transaction
   */
  async burnTrustTokens(
    fromAccountId: string,
    amount: number,
    reason: string = "NFT_CREATION",
    fromAccountPrivateKey?: string
  ): Promise<string> {
    try {
      this.logger.log(`🔥 Burning ${amount} TRUST tokens for ${reason}...`);

      if (fromAccountPrivateKey) {
        // Real burning: Transfer tokens from user to treasury, then burn
        this.logger.log(`Using real token transfer for burning from ${fromAccountId}`);
        
        let userPrivateKey;
        try {
          userPrivateKey = PrivateKey.fromStringECDSA(fromAccountPrivateKey);
        } catch (ecdsaError) {
          userPrivateKey = PrivateKey.fromString(fromAccountPrivateKey);
        }

        // Step 1: Transfer TRUST tokens from user to treasury
        this.logger.log(`Step 1: Transferring ${amount} TRUST tokens from ${fromAccountId} to treasury...`);
        
        const transferTx = new TransferTransaction()
          .addTokenTransfer(this.trustTokenId, AccountId.fromString(fromAccountId), -amount)
          .addTokenTransfer(this.trustTokenId, this.operatorId, amount)
          .setMaxTransactionFee(new Hbar(10))
          .freezeWith(this.client);

        // Sign with user's key
        transferTx.sign(userPrivateKey);
        
        const transferResponse = await transferTx.execute(this.client);
        const transferReceipt = await transferResponse.getReceipt(this.client);
        
        this.logger.log(`✅ Token transfer successful: ${transferResponse.transactionId.toString()}`);

        // Step 2: Burn the tokens from treasury (remove from circulation)
        this.logger.log(`Step 2: Burning ${amount} TRUST tokens from treasury...`);
        
        const burnTx = new TokenBurnTransaction()
          .setTokenId(this.trustTokenId)
          .setAmount(amount)
          .setMaxTransactionFee(new Hbar(5));

        const burnResponse = await burnTx.execute(this.client);
        const burnReceipt = await burnResponse.getReceipt(this.client);

        this.logger.log(`✅ Successfully burned ${amount} TRUST tokens: ${burnResponse.transactionId.toString()}`);
        this.logger.log(`Total transaction: Transfer ${transferResponse.transactionId.toString()} + Burn ${burnResponse.transactionId.toString()}`);

        return burnResponse.transactionId.toString();
      } else {
        // Fallback: Simulate burning for testing
        this.logger.log(`No private key provided, simulating burning by minting to treasury...`);
        
        // Step 1: Mint tokens to treasury (simulating user payment)
        const mintTx = new TokenMintTransaction()
          .setTokenId(this.trustTokenId)
          .setAmount(amount)
          .setMaxTransactionFee(new Hbar(5));

        const mintResponse = await mintTx.execute(this.client);
        const mintReceipt = await mintResponse.getReceipt(this.client);

        this.logger.log(`✅ Minting successful: ${mintResponse.transactionId.toString()}`);

        // Step 2: Burn the tokens from treasury (remove from circulation)
        this.logger.log(`Step 2: Burning ${amount} TRUST tokens from treasury...`);
        
        const burnTx = new TokenBurnTransaction()
          .setTokenId(this.trustTokenId)
          .setAmount(amount)
          .setMaxTransactionFee(new Hbar(5));

        const burnResponse = await burnTx.execute(this.client);
        const burnReceipt = await burnResponse.getReceipt(this.client);

        this.logger.log(`✅ Successfully burned ${amount} TRUST tokens: ${burnResponse.transactionId.toString()}`);
        this.logger.log(`Total transaction: Mint ${mintResponse.transactionId.toString()} + Burn ${burnResponse.transactionId.toString()}`);

        return burnResponse.transactionId.toString();
      }
    } catch (error) {
      this.logger.error('Failed to burn TRUST tokens:', error);
      throw error;
    }
  }

  /**
   * Calculate NFT creation fee using HSCS contract
   */
  async calculateNftCreationFee(
    verificationLevel: string,
    rarity: string
  ): Promise<number> {
    try {
      if (!this.trustTokenBurnerContract) {
        this.logger.warn('Burner contract not available, using default calculation');
        return this.calculateDefaultFee(verificationLevel, rarity);
      }

      this.logger.log(`Calculating NFT creation fee for ${verificationLevel} ${rarity}...`);

      const params = new ContractFunctionParameters()
        .addString(verificationLevel)
        .addString(rarity);

      const query = new ContractCallQuery()
        .setContractId(this.trustTokenBurnerContract)
        .setGas(100000)
        .setFunction("calculateNftCreationFee", params);

      const result = await query.execute(this.client);
      const fee = result.getInt256(0).toNumber();

      this.logger.log(`✅ NFT creation fee calculated: ${fee} TRUST tokens`);
      return fee;
    } catch (error) {
      this.logger.error('Failed to calculate NFT creation fee via HSCS, using default:', error);
      return this.calculateDefaultFee(verificationLevel, rarity);
    }
  }

  /**
   * Get exchange information from HSCS contract
   */
  async getExchangeInfo(): Promise<any> {
    try {
      if (!this.trustTokenExchangeContract) {
        this.logger.warn('Exchange contract not available, using default values');
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

      const query = new ContractCallQuery()
        .setContractId(this.trustTokenExchangeContract)
        .setGas(100000)
        .setFunction("getExchangeInfo", new ContractFunctionParameters());

      const result = await query.execute(this.client);
      
      return {
        exchangeRate: result.getInt256(0).toNumber(),
        exchangeFeeRate: result.getInt256(1).toNumber() / 10000, // Convert from basis points
        minExchange: result.getInt256(2).toNumber() / 100000000, // Convert from wei
        distribution: {
          treasury: result.getInt256(3).toNumber() / 10000,
          operations: result.getInt256(4).toNumber() / 10000,
          staking: result.getInt256(5).toNumber() / 10000,
          fees: result.getInt256(6).toNumber() / 10000
        }
      };
    } catch (error) {
      this.logger.error('Failed to get exchange info from HSCS contract:', error);
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
   * Default fee calculation (fallback)
   */
  private calculateDefaultFee(verificationLevel: string, rarity: string): number {
    const baseCost = 50; // 50 TRUST tokens
    const verificationMultiplier = verificationLevel === 'premium' ? 2 : 1;
    const rarityMultiplier = rarity === 'legendary' ? 3 :
                            rarity === 'epic' ? 2 : 1;
    
    return baseCost * verificationMultiplier * rarityMultiplier;
  }

  /**
   * Get TRUST token balance for an account
   */
  async getTrustTokenBalance(accountId: string): Promise<number> {
    try {
      const balanceQuery = new (require('@hashgraph/sdk').AccountBalanceQuery)()
        .setAccountId(AccountId.fromString(accountId));

      const balance = await balanceQuery.execute(this.client);
      const tokenBalance = balance.tokens.get(this.trustTokenId.toString());
      
      return tokenBalance ? tokenBalance.toNumber() : 0;
    } catch (error) {
      this.logger.error('Failed to get TRUST token balance:', error);
      return 0;
    }
  }

  /**
   * Stake TRUST tokens using HSCS contract
   * For testing: Simulate staking by minting tokens to staking contract
   * In production: User would sign the transfer transaction
   */
  async stakeTrustTokens(
    accountId: string,
    amount: number,
    duration: number
  ): Promise<string> {
    try {
      this.logger.log(`Staking ${amount} TRUST tokens for ${duration} days...`);

      // For testing purposes, simulate staking by minting tokens to treasury
      // In production, this would be a transfer from user to staking contract
      
      this.logger.log(`Step 1: Minting ${amount} TRUST tokens to treasury (simulating staking)...`);
      
      // Step 1: Mint tokens to treasury (simulating user staking)
      const mintTx = new TokenMintTransaction()
        .setTokenId(this.trustTokenId)
        .setAmount(amount)
        .setMaxTransactionFee(new Hbar(5));

      const mintResponse = await mintTx.execute(this.client);
      const mintReceipt = await mintResponse.getReceipt(this.client);

      this.logger.log(`✅ Staking simulation successful: ${mintResponse.transactionId.toString()}`);

      return mintResponse.transactionId.toString();
    } catch (error) {
      this.logger.error('Failed to stake TRUST tokens:', error);
      throw error;
    }
  }
}
