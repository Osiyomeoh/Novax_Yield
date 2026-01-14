import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  Client, 
  AccountId, 
  PrivateKey, 
  TokenCreateTransaction, 
  TokenType, 
  TokenSupplyType,
  TokenMintTransaction,
  TokenId,
  TransferTransaction,
  AccountBalanceQuery
} from '@hashgraph/sdk';

@Injectable()
export class TrustTokenService {
  private readonly logger = new Logger(TrustTokenService.name);
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;
  private trustTokenId: TokenId | null = null;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      const accountId = this.configService.get<string>('HEDERA_ACCOUNT_ID');
      const privateKey = this.configService.get<string>('HEDERA_PRIVATE_KEY');
      const network = this.configService.get<string>('HEDERA_NETWORK', 'testnet');

      if (!accountId || !privateKey) {
        throw new Error('Hedera credentials are required for TRUST token management');
      }

      this.operatorId = AccountId.fromString(accountId);
      
      try {
        this.operatorKey = PrivateKey.fromStringECDSA(privateKey);
        this.logger.log('Using ECDSA key format for TRUST token service');
      } catch (ecdsaError) {
        this.logger.warn('ECDSA parsing failed, trying regular format:', ecdsaError.message);
        this.operatorKey = PrivateKey.fromString(privateKey);
        this.logger.log('Using regular key format for TRUST token service');
      }
      
      this.client = Client.forName(network);
      this.client.setOperator(this.operatorId, this.operatorKey);

      this.logger.log(`TRUST token service initialized for ${network} with account ${accountId}`);
    } catch (error) {
      this.logger.error('Failed to initialize TRUST token service:', error);
      throw error;
    }
  }

  /**
   * Create the TRUST token on Hedera Token Service
   */
  async createTrustToken(): Promise<string> {
    try {
      this.logger.log('Creating TRUST token on Hedera Token Service...');

      const tokenCreateTx = new TokenCreateTransaction()
        .setTokenName('TrustBridge Token')
        .setTokenSymbol('TRUST')
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(8)
        .setInitialSupply(0) // Start with 0 supply, mint as needed
        .setTreasuryAccountId(this.operatorId)
        .setSupplyType(TokenSupplyType.Infinite) // Allow unlimited minting
        .setMaxTransactionFee(1000);

      const tokenCreateResponse = await tokenCreateTx.execute(this.client);
      const tokenCreateReceipt = await tokenCreateResponse.getReceipt(this.client);
      
      this.trustTokenId = tokenCreateReceipt.tokenId!;
      
      this.logger.log(`✅ TRUST token created successfully: ${this.trustTokenId.toString()}`);
      return this.trustTokenId.toString();
    } catch (error) {
      this.logger.error('Failed to create TRUST token:', error);
      throw error;
    }
  }

  /**
   * Mint TRUST tokens to a specific account
   */
  async mintTrustTokens(toAccountId: string, amount: number): Promise<string> {
    try {
      // Load TRUST token ID if not already loaded
      if (!this.trustTokenId) {
        const tokenId = this.getTrustTokenId();
        if (!tokenId) {
          throw new Error('TRUST token not found. Please check TRUST_TOKEN_ID environment variable.');
        }
        this.trustTokenId = TokenId.fromString(tokenId);
      }

      this.logger.log(`Minting ${amount} TRUST tokens to ${toAccountId}...`);

      const mintTx = new TokenMintTransaction()
        .setTokenId(this.trustTokenId)
        .setAmount(amount)
        .setMaxTransactionFee(1000);

      const mintResponse = await mintTx.execute(this.client);
      const mintReceipt = await mintResponse.getReceipt(this.client);
      
      this.logger.log(`✅ Minted ${amount} TRUST tokens to ${toAccountId}`);
      return mintResponse.transactionId.toString();
    } catch (error) {
      this.logger.error('Failed to mint TRUST tokens:', error);
      throw error;
    }
  }

  /**
   * Transfer TRUST tokens between accounts
   */
  async transferTrustTokens(fromAccountId: string, toAccountId: string, amount: number): Promise<string> {
    try {
      if (!this.trustTokenId) {
        throw new Error('TRUST token not created yet. Call createTrustToken() first.');
      }

      this.logger.log(`Transferring ${amount} TRUST tokens from ${fromAccountId} to ${toAccountId}...`);

      const transferTx = new TransferTransaction()
        .addTokenTransfer(
          this.trustTokenId,
          AccountId.fromString(fromAccountId),
          -amount
        )
        .addTokenTransfer(
          this.trustTokenId,
          AccountId.fromString(toAccountId),
          amount
        )
        .setMaxTransactionFee(1000);

      const transferResponse = await transferTx.execute(this.client);
      const transferReceipt = await transferResponse.getReceipt(this.client);
      
      this.logger.log(`✅ Transferred ${amount} TRUST tokens from ${fromAccountId} to ${toAccountId}`);
      return transferResponse.transactionId.toString();
    } catch (error) {
      this.logger.error('Failed to transfer TRUST tokens:', error);
      throw error;
    }
  }

  /**
   * Get TRUST token balance for an account
   */
  async getTrustTokenBalance(accountId: string): Promise<number> {
    try {
      if (!this.trustTokenId) {
        return 0;
      }

      const balanceQuery = new AccountBalanceQuery()
        .setAccountId(AccountId.fromString(accountId));

      const balance = await balanceQuery.execute(this.client);
      const tokenBalance = balance.tokens?.get(this.trustTokenId.toString());
      
      return tokenBalance ? Number(tokenBalance) : 0;
    } catch (error) {
      this.logger.error('Failed to get TRUST token balance:', error);
      return 0;
    }
  }

  /**
   * Get the TRUST token ID
   */
  getTrustTokenId(): string | null {
    return this.trustTokenId?.toString() || null;
  }

  /**
   * Burn TRUST tokens (for platform fees)
   */
  async burnTrustTokens(fromAccountId: string, amount: number): Promise<string> {
    try {
      if (!this.trustTokenId) {
        throw new Error('TRUST token not created yet. Call createTrustToken() first.');
      }

      this.logger.log(`Burning ${amount} TRUST tokens from ${fromAccountId}...`);

      // Transfer tokens to treasury account (which will burn them)
      const burnTx = new TransferTransaction()
        .addTokenTransfer(
          this.trustTokenId,
          AccountId.fromString(fromAccountId),
          -amount
        )
        .addTokenTransfer(
          this.trustTokenId,
          this.operatorId, // Treasury account
          amount
        )
        .setMaxTransactionFee(1000);

      const burnResponse = await burnTx.execute(this.client);
      const burnReceipt = await burnResponse.getReceipt(this.client);
      
      this.logger.log(`✅ Burned ${amount} TRUST tokens from ${fromAccountId}`);
      return burnResponse.transactionId.toString();
    } catch (error) {
      this.logger.error('Failed to burn TRUST tokens:', error);
      throw error;
    }
  }

  /**
   * Exchange HBAR for TRUST tokens with automatic distribution
   */
  async exchangeHbarForTrust(
    fromAccountId: string, 
    hbarAmount: number,
    treasuryAccountId: string,
    operationsAccountId: string,
    stakingAccountId: string
  ): Promise<{ transactionId: string; trustAmount: number; distribution: any }> {
    try {
      if (!this.trustTokenId) {
        throw new Error('TRUST token not created yet. Call createTrustToken() first.');
      }

      const exchangeRate = 100; // 1 HBAR = 100 TRUST tokens
      const exchangeFeeRate = 0.01; // 1% fee
      const exchangeFee = hbarAmount * exchangeFeeRate;
      const netHbarAmount = hbarAmount - exchangeFee;
      const trustAmount = netHbarAmount * exchangeRate;

      this.logger.log(`Exchanging ${hbarAmount} HBAR for ${trustAmount} TRUST tokens...`);

      // Calculate distribution percentages
      const distribution = {
        treasury: netHbarAmount * 0.6,      // 60%
        operations: netHbarAmount * 0.25,   // 25%
        staking: netHbarAmount * 0.1,      // 10%
        fees: netHbarAmount * 0.05         // 5%
      };

      // Step 1: Transfer HBAR from user to platform accounts
      const hbarTransferTx = new TransferTransaction()
        .addHbarTransfer(AccountId.fromString(fromAccountId), -hbarAmount)
        .addHbarTransfer(AccountId.fromString(treasuryAccountId), distribution.treasury)
        .addHbarTransfer(AccountId.fromString(operationsAccountId), distribution.operations)
        .addHbarTransfer(AccountId.fromString(stakingAccountId), distribution.staking)
        .addHbarTransfer(this.operatorId, distribution.fees) // Platform fee
        .setMaxTransactionFee(1000);

      const hbarTransferResponse = await hbarTransferTx.execute(this.client);
      const hbarTransferReceipt = await hbarTransferResponse.getReceipt(this.client);

      // Step 2: Mint TRUST tokens to user
      const mintTx = new TokenMintTransaction()
        .setTokenId(this.trustTokenId)
        .setAmount(trustAmount)
        .setMaxTransactionFee(1000);

      const mintResponse = await mintTx.execute(this.client);
      const mintReceipt = await mintResponse.getReceipt(this.client);

      // Step 3: Transfer TRUST tokens to user
      const trustTransferTx = new TransferTransaction()
        .addTokenTransfer(
          this.trustTokenId,
          this.operatorId, // From treasury
          -trustAmount
        )
        .addTokenTransfer(
          this.trustTokenId,
          AccountId.fromString(fromAccountId), // To user
          trustAmount
        )
        .setMaxTransactionFee(1000);

      const trustTransferResponse = await trustTransferTx.execute(this.client);
      const trustTransferReceipt = await trustTransferResponse.getReceipt(this.client);

      this.logger.log(`✅ Exchanged ${hbarAmount} HBAR for ${trustAmount} TRUST tokens`);
      this.logger.log(`HBAR Distribution:`, distribution);

      return {
        transactionId: hbarTransferResponse.transactionId.toString(),
        trustAmount,
        distribution
      };
    } catch (error) {
      this.logger.error('Failed to exchange HBAR for TRUST tokens:', error);
      throw error;
    }
  }

  /**
   * Get exchange rate and fee information
   */
  getExchangeInfo() {
    return {
      exchangeRate: 100, // 1 HBAR = 100 TRUST
      exchangeFeeRate: 0.01, // 1% fee
      minExchange: 0.5, // Minimum 0.5 HBAR
      distribution: {
        treasury: 0.6,      // 60%
        operations: 0.25,   // 25%
        staking: 0.1,       // 10%
        fees: 0.05          // 5%
      }
    };
  }

  /**
   * Initialize TRUST token if it doesn't exist
   */
  async initializeTrustToken(): Promise<string> {
    if (this.trustTokenId) {
      return this.trustTokenId.toString();
    }

    // Try to get existing TRUST token ID from config
    const existingTokenId = this.configService.get<string>('TRUST_TOKEN_ID');
    if (existingTokenId) {
      this.trustTokenId = TokenId.fromString(existingTokenId);
      this.logger.log(`Using existing TRUST token: ${existingTokenId}`);
      return existingTokenId;
    }

    // Create new TRUST token
    return await this.createTrustToken();
  }
}
