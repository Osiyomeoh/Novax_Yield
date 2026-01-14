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
  Hbar
} from '@hashgraph/sdk';

@Injectable()
export class HscsContractService {
  private readonly logger = new Logger(HscsContractService.name);
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;

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

      if (!accountId || !privateKey) {
        throw new Error('Hedera credentials are required for HSCS contract service');
      }

      this.operatorId = AccountId.fromString(accountId);
      
      try {
        this.operatorKey = PrivateKey.fromStringECDSA(privateKey);
        this.logger.log('Using ECDSA key format for HSCS contract service');
      } catch (ecdsaError) {
        this.logger.warn('ECDSA parsing failed, trying regular format:', ecdsaError.message);
        this.operatorKey = PrivateKey.fromString(privateKey);
        this.logger.log('Using regular key format for HSCS contract service');
      }
      
      this.client = Client.forName(network);
      this.client.setOperator(this.operatorId, this.operatorKey);

      // Load contract addresses from config
      this.loadContractAddresses();

      this.logger.log(`HSCS contract service initialized for ${network} with account ${accountId}`);
    } catch (error) {
      this.logger.error('Failed to initialize HSCS contract service:', error);
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
   * Exchange HBAR for TRUST tokens using HSCS contract
   */
  async exchangeHbarForTrust(
    fromAccountId: string,
    hbarAmount: number,
    treasuryAccountId: string,
    operationsAccountId: string,
    stakingAccountId: string
  ): Promise<{ transactionId: string; trustAmount: number; distribution: any }> {
    try {
      if (!this.trustTokenExchangeContract) {
        throw new Error('Exchange contract not deployed or configured');
      }

      this.logger.log(`Exchanging ${hbarAmount} HBAR for TRUST tokens via HSCS contract...`);

      // Call the exchange function on the smart contract
      const contractCall = new ContractExecuteTransaction()
        .setContractId(this.trustTokenExchangeContract)
        .setGas(500000)
        .setPayableAmount(Hbar.fromTinybars(hbarAmount * 100000000)) // Convert to tinybars
        .setFunction("exchangeHbarForTrust");

      const contractResponse = await contractCall.execute(this.client);
      const contractReceipt = await contractResponse.getReceipt(this.client);

      // Get the exchange info
      const exchangeInfo = await this.getExchangeInfo();

      const trustAmount = exchangeInfo.calculateTrustAmount(hbarAmount);
      const distribution = {
        treasury: hbarAmount * 0.6,
        operations: hbarAmount * 0.25,
        staking: hbarAmount * 0.1,
        fees: hbarAmount * 0.05
      };

      this.logger.log(`✅ Exchanged ${hbarAmount} HBAR for ${trustAmount} TRUST tokens via HSCS`);

      return {
        transactionId: contractResponse.transactionId.toString(),
        trustAmount,
        distribution
      };
    } catch (error) {
      this.logger.error('Failed to exchange HBAR for TRUST tokens via HSCS:', error);
      throw error;
    }
  }

  /**
   * Burn TRUST tokens using HSCS contract
   */
  async burnTrustTokens(
    fromAccountId: string,
    amount: number,
    reason: string = "NFT_CREATION"
  ): Promise<string> {
    try {
      if (!this.trustTokenBurnerContract) {
        throw new Error('Burner contract not deployed or configured');
      }

      this.logger.log(`Burning ${amount} TRUST tokens via HSCS contract...`);

      // Call the burn function on the smart contract
      const contractCall = new ContractExecuteTransaction()
        .setContractId(this.trustTokenBurnerContract)
        .setGas(300000)
        .setFunction("burnForNftCreation", new ContractFunctionParameters()
          .addUint256(amount)
          .addString(reason)
        );

      const contractResponse = await contractCall.execute(this.client);
      const contractReceipt = await contractResponse.getReceipt(this.client);

      this.logger.log(`✅ Burned ${amount} TRUST tokens via HSCS`);

      return contractResponse.transactionId.toString();
    } catch (error) {
      this.logger.error('Failed to burn TRUST tokens via HSCS:', error);
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
        throw new Error('Burner contract not deployed or configured');
      }

      // Call the calculate function on the smart contract
      const contractCall = new ContractCallQuery()
        .setContractId(this.trustTokenBurnerContract)
        .setGas(100000)
        .setFunction("calculateNftCreationFee", new ContractFunctionParameters()
          .addString(verificationLevel)
          .addString(rarity)
        );

      const contractResponse = await contractCall.execute(this.client);
      const fee = contractResponse.getUint256(0);

      return Number(fee);
    } catch (error) {
      this.logger.error('Failed to calculate NFT creation fee via HSCS:', error);
      // Return default fee if contract call fails
      return this.getDefaultFee(verificationLevel, rarity);
    }
  }

  /**
   * Get exchange information from HSCS contract
   */
  async getExchangeInfo(): Promise<any> {
    try {
      if (!this.trustTokenExchangeContract) {
        return this.getDefaultExchangeInfo();
      }

      // Call the getExchangeStats function on the smart contract
      const contractCall = new ContractCallQuery()
        .setContractId(this.trustTokenExchangeContract)
        .setGas(100000)
        .setFunction("getExchangeStats");

      const contractResponse = await contractCall.execute(this.client);
      
      return {
        totalHbarReceived: Number(contractResponse.getUint256(0)),
        totalTrustMinted: Number(contractResponse.getUint256(1)),
        totalExchanges: Number(contractResponse.getUint256(2)),
        contractBalance: Number(contractResponse.getUint256(3)),
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
    } catch (error) {
      this.logger.error('Failed to get exchange info via HSCS:', error);
      return this.getDefaultExchangeInfo();
    }
  }

  /**
   * Stake TRUST tokens using HSCS contract
   */
  async stakeTrustTokens(
    fromAccountId: string,
    amount: number,
    duration: number
  ): Promise<string> {
    try {
      if (!this.trustTokenStakingContract) {
        throw new Error('Staking contract not deployed or configured');
      }

      this.logger.log(`Staking ${amount} TRUST tokens for ${duration} seconds via HSCS contract...`);

      // Call the stake function on the smart contract
      const contractCall = new ContractExecuteTransaction()
        .setContractId(this.trustTokenStakingContract)
        .setGas(400000)
        .setFunction("stake", new ContractFunctionParameters()
          .addUint256(amount)
          .addUint256(duration)
        );

      const contractResponse = await contractCall.execute(this.client);
      const contractReceipt = await contractResponse.getReceipt(this.client);

      this.logger.log(`✅ Staked ${amount} TRUST tokens via HSCS`);

      return contractResponse.transactionId.toString();
    } catch (error) {
      this.logger.error('Failed to stake TRUST tokens via HSCS:', error);
      throw error;
    }
  }

  /**
   * Get default exchange info (fallback)
   */
  private getDefaultExchangeInfo() {
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

  /**
   * Get default fee calculation (fallback)
   */
  private getDefaultFee(verificationLevel: string, rarity: string): number {
    const baseFee = 50;
    const verificationMultiplier = verificationLevel === 'premium' ? 2 : 1;
    const rarityMultiplier = rarity === 'legendary' ? 3 : 
                            rarity === 'epic' ? 2 : 1;
    return baseFee * verificationMultiplier * rarityMultiplier;
  }

  /**
   * Set contract addresses (for deployment)
   */
  setContractAddresses(
    exchangeContractId: string,
    burnerContractId: string,
    stakingContractId: string
  ): void {
    this.trustTokenExchangeContract = ContractId.fromString(exchangeContractId);
    this.trustTokenBurnerContract = ContractId.fromString(burnerContractId);
    this.trustTokenStakingContract = ContractId.fromString(stakingContractId);
    
    this.logger.log('Contract addresses updated:', {
      exchange: exchangeContractId,
      burner: burnerContractId,
      staking: stakingContractId
    });
  }
}
