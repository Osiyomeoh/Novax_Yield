import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  AccountId,
  PrivateKey,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractCallQuery,
  Hbar,
  TokenId,
  TransferTransaction,
  NftId,
  AccountAllowanceApproveTransaction
} from '@hashgraph/sdk';

/**
 * Service for interacting with the TrustBridge Marketplace Smart Contract
 * Handles NFT listing, buying, and marketplace state management
 */
@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;
  private marketplaceContractId: string;
  private trustTokenId: string;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      // Get configuration
      const accountId = this.configService.get<string>('HEDERA_ACCOUNT_ID');
      const privateKey = this.configService.get<string>('HEDERA_PRIVATE_KEY');
      const network = this.configService.get<string>('HEDERA_NETWORK', 'testnet');
      
      this.marketplaceContractId = this.configService.get<string>('MARKETPLACE_CONTRACT_ID');
      this.trustTokenId = this.configService.get<string>('TRUST_TOKEN_ID');

      if (!accountId || !privateKey) {
        throw new Error('Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY');
      }

      if (!this.marketplaceContractId) {
        throw new Error('Missing MARKETPLACE_CONTRACT_ID');
      }

      // Initialize client
      this.client = network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
      this.operatorId = AccountId.fromString(accountId);
      
      try {
        this.operatorKey = PrivateKey.fromStringECDSA(privateKey);
      } catch {
        this.operatorKey = PrivateKey.fromString(privateKey);
      }

      this.client.setOperator(this.operatorId, this.operatorKey);
      
      this.logger.log('Marketplace service initialized');
      this.logger.log(`Marketplace Contract: ${this.marketplaceContractId}`);
      this.logger.log(`TRUST Token: ${this.trustTokenId}`);
    } catch (error) {
      this.logger.error('Failed to initialize marketplace service', error);
      throw error;
    }
  }

  /**
   * List an NFT for sale on the marketplace
   * @param nftTokenId The NFT token ID
   * @param serialNumber The NFT serial number
   * @param price The listing price in TRUST tokens (smallest unit)
   * @param sellerAccountId The seller's account ID
   * @returns Listing ID and transaction details
   */
  async listNFT(
    nftTokenId: string,
    serialNumber: number,
    price: number,
    sellerAccountId: string
  ): Promise<{ listingId: number; transactionId: string }> {
    try {
      this.logger.log(`Listing NFT ${nftTokenId}#${serialNumber} for ${price} TRUST`);

      // Convert NFT token ID to Solidity address
      const nftAddress = AccountId.fromString(nftTokenId).toSolidityAddress();

      // Call listNFT function on marketplace contract
      const params = new ContractFunctionParameters()
        .addAddress(nftAddress)
        .addUint256(serialNumber)
        .addUint256(price);

      const contractExecTx = new ContractExecuteTransaction()
        .setContractId(this.marketplaceContractId)
        .setGas(300000)
        .setFunction('listNFT', params)
        .setMaxTransactionFee(new Hbar(5));

      const response = await contractExecTx.execute(this.client);
      const receipt = await response.getReceipt(this.client);

      this.logger.log(`NFT listed successfully: ${response.transactionId.toString()}`);

      // Get the listing ID from contract state (would need to query)
      // For now, we'll return a placeholder
      return {
        listingId: 0, // This would be returned from contract event or query
        transactionId: response.transactionId.toString()
      };
    } catch (error) {
      this.logger.error(`Failed to list NFT: ${error.message}`, error.stack);
      throw new Error(`Failed to list NFT: ${error.message}`);
    }
  }

  /**
   * Buy an NFT from the marketplace
   * Handles atomic TRUST token payment and NFT transfer
   * @param listingId The marketplace listing ID
   * @param buyerAccountId The buyer's account ID
   * @param buyerPrivateKey Optional buyer's private key for signing
   * @returns Transaction details
   */
  async buyNFT(
    listingId: number,
    buyerAccountId: string,
    buyerPrivateKey?: string
  ): Promise<{ 
    transactionId: string; 
    seller: string; 
    price: number; 
    platformFee: number 
  }> {
    try {
      this.logger.log(`Buying NFT listing ${listingId}`);

      // First, get listing details from contract
      const listing = await this.getListing(listingId);

      if (!listing.isActive) {
        throw new Error('Listing is not active');
      }

      // Calculate fees
      const platformFee = await this.calculatePlatformFee(listing.price);

      // Step 1: Transfer TRUST tokens from buyer to seller and platform
      await this.transferTrustForPurchase(
        buyerAccountId,
        listing.seller,
        listing.price,
        platformFee,
        buyerPrivateKey
      );

      // Step 2: Call buyNFT function on marketplace contract
      const params = new ContractFunctionParameters()
        .addUint256(listingId);

      const contractExecTx = new ContractExecuteTransaction()
        .setContractId(this.marketplaceContractId)
        .setGas(300000)
        .setFunction('buyNFT', params)
        .setMaxTransactionFee(new Hbar(5));

      const response = await contractExecTx.execute(this.client);
      await response.getReceipt(this.client);

      this.logger.log(`NFT purchased successfully: ${response.transactionId.toString()}`);

      return {
        transactionId: response.transactionId.toString(),
        seller: listing.seller,
        price: listing.price,
        platformFee: platformFee
      };
    } catch (error) {
      this.logger.error(`Failed to buy NFT: ${error.message}`, error.stack);
      throw new Error(`Failed to buy NFT: ${error.message}`);
    }
  }

  /**
   * Transfer TRUST tokens for NFT purchase
   * @private
   */
  private async transferTrustForPurchase(
    buyerAccountId: string,
    sellerAccountId: string,
    totalPrice: number,
    platformFee: number,
    buyerPrivateKey?: string
  ): Promise<string> {
    try {
      const sellerAmount = totalPrice - platformFee;
      const platformTreasury = this.operatorId.toString();

      // Create transfer transaction
      const transferTx = new TransferTransaction()
        .addTokenTransfer(
          TokenId.fromString(this.trustTokenId),
          AccountId.fromString(buyerAccountId),
          -totalPrice
        )
        .addTokenTransfer(
          TokenId.fromString(this.trustTokenId),
          AccountId.fromString(sellerAccountId),
          sellerAmount
        )
        .addTokenTransfer(
          TokenId.fromString(this.trustTokenId),
          AccountId.fromString(platformTreasury),
          platformFee
        )
        .setMaxTransactionFee(new Hbar(5));

      // Sign with buyer's key if provided, otherwise operator
      if (buyerPrivateKey) {
        const buyerKey = PrivateKey.fromStringECDSA(buyerPrivateKey);
        const signedTx = await transferTx.sign(buyerKey);
        const response = await signedTx.execute(this.client);
        await response.getReceipt(this.client);
        return response.transactionId.toString();
      } else {
        const response = await transferTx.execute(this.client);
        await response.getReceipt(this.client);
        return response.transactionId.toString();
      }
    } catch (error) {
      this.logger.error('TRUST token transfer failed', error);
      throw error;
    }
  }

  /**
   * Cancel a listing
   * @param listingId The marketplace listing ID
   * @returns Transaction ID
   */
  async cancelListing(listingId: number): Promise<{ transactionId: string }> {
    try {
      this.logger.log(`Cancelling listing ${listingId}`);

      const params = new ContractFunctionParameters()
        .addUint256(listingId);

      const contractExecTx = new ContractExecuteTransaction()
        .setContractId(this.marketplaceContractId)
        .setGas(200000)
        .setFunction('cancelListing', params)
        .setMaxTransactionFee(new Hbar(3));

      const response = await contractExecTx.execute(this.client);
      await response.getReceipt(this.client);

      this.logger.log(`Listing cancelled: ${response.transactionId.toString()}`);

      return {
        transactionId: response.transactionId.toString()
      };
    } catch (error) {
      this.logger.error(`Failed to cancel listing: ${error.message}`, error.stack);
      throw new Error(`Failed to cancel listing: ${error.message}`);
    }
  }

  /**
   * Update listing price
   * @param listingId The marketplace listing ID
   * @param newPrice The new price in TRUST tokens
   * @returns Transaction ID
   */
  async updatePrice(
    listingId: number,
    newPrice: number
  ): Promise<{ transactionId: string }> {
    try {
      this.logger.log(`Updating listing ${listingId} price to ${newPrice}`);

      const params = new ContractFunctionParameters()
        .addUint256(listingId)
        .addUint256(newPrice);

      const contractExecTx = new ContractExecuteTransaction()
        .setContractId(this.marketplaceContractId)
        .setGas(200000)
        .setFunction('updatePrice', params)
        .setMaxTransactionFee(new Hbar(3));

      const response = await contractExecTx.execute(this.client);
      await response.getReceipt(this.client);

      this.logger.log(`Price updated: ${response.transactionId.toString()}`);

      return {
        transactionId: response.transactionId.toString()
      };
    } catch (error) {
      this.logger.error(`Failed to update price: ${error.message}`, error.stack);
      throw new Error(`Failed to update price: ${error.message}`);
    }
  }

  /**
   * Get listing details from marketplace contract
   * @param listingId The marketplace listing ID
   * @returns Listing details
   */
  async getListing(listingId: number): Promise<{
    seller: string;
    nftAddress: string;
    serialNumber: number;
    price: number;
    isActive: boolean;
    listedAt: number;
  }> {
    try {
      const params = new ContractFunctionParameters()
        .addUint256(listingId);

      const query = new ContractCallQuery()
        .setContractId(this.marketplaceContractId)
        .setGas(100000)
        .setFunction('getListing', params);

      const result = await query.execute(this.client);

      // Parse the result (adjust based on actual contract return values)
      // This is a placeholder - actual parsing depends on contract ABI
      const seller = result.getAddress(0);
      const nftAddress = result.getAddress(1);
      const serialNumber = result.getUint256(2).toNumber();
      const price = result.getUint256(3).toNumber();
      const isActive = result.getBool(4);
      const listedAt = result.getUint256(5).toNumber();

      return {
        seller: AccountId.fromSolidityAddress(seller).toString(),
        nftAddress: AccountId.fromSolidityAddress(nftAddress).toString(),
        serialNumber,
        price,
        isActive,
        listedAt
      };
    } catch (error) {
      this.logger.error(`Failed to get listing: ${error.message}`, error.stack);
      throw new Error(`Failed to get listing: ${error.message}`);
    }
  }

  /**
   * Check if an NFT is listed
   * @param nftTokenId The NFT token ID
   * @param serialNumber The NFT serial number
   * @returns Whether the NFT is listed and the listing ID
   */
  async isNFTListed(
    nftTokenId: string,
    serialNumber: number
  ): Promise<{ isListed: boolean; listingId: number }> {
    try {
      const nftAddress = AccountId.fromString(nftTokenId).toSolidityAddress();

      const params = new ContractFunctionParameters()
        .addAddress(nftAddress)
        .addUint256(serialNumber);

      const query = new ContractCallQuery()
        .setContractId(this.marketplaceContractId)
        .setGas(100000)
        .setFunction('isNFTListed', params);

      const result = await query.execute(this.client);

      const isListed = result.getBool(0);
      const listingId = result.getUint256(1).toNumber();

      return { isListed, listingId };
    } catch (error) {
      this.logger.error(`Failed to check NFT listing: ${error.message}`, error.stack);
      throw new Error(`Failed to check NFT listing: ${error.message}`);
    }
  }

  /**
   * Calculate platform fee for a given price
   * @param price The listing price
   * @returns Platform fee amount
   */
  async calculatePlatformFee(price: number): Promise<number> {
    try {
      const params = new ContractFunctionParameters()
        .addUint256(price);

      const query = new ContractCallQuery()
        .setContractId(this.marketplaceContractId)
        .setGas(100000)
        .setFunction('calculateFees', params);

      const result = await query.execute(this.client);

      const platformFee = result.getUint256(0).toNumber();

      return platformFee;
    } catch (error) {
      this.logger.error(`Failed to calculate fee: ${error.message}`, error.stack);
      // Fallback calculation: 2.5% fee
      return Math.floor(price * 250 / 10000);
    }
  }

  /**
   * Get marketplace configuration
   * @returns Marketplace config
   */
  async getMarketplaceConfig(): Promise<{
    trustToken: string;
    treasury: string;
    feeBps: number;
    owner: string;
    activeListings: number;
  }> {
    try {
      const query = new ContractCallQuery()
        .setContractId(this.marketplaceContractId)
        .setGas(100000)
        .setFunction('getConfig');

      const result = await query.execute(this.client);

      const trustToken = AccountId.fromSolidityAddress(result.getAddress(0)).toString();
      const treasury = AccountId.fromSolidityAddress(result.getAddress(1)).toString();
      const feeBps = result.getUint256(2).toNumber();
      const owner = AccountId.fromSolidityAddress(result.getAddress(3)).toString();
      const activeListings = result.getUint256(4).toNumber();

      return {
        trustToken,
        treasury,
        feeBps,
        owner,
        activeListings
      };
    } catch (error) {
      this.logger.error(`Failed to get marketplace config: ${error.message}`, error.stack);
      throw new Error(`Failed to get marketplace config: ${error.message}`);
    }
  }

  /**
   * Transfer NFT from marketplace escrow to buyer
   * Called after buyer has paid TRUST tokens
   */
  async transferNFTFromEscrow(
    nftTokenId: string,
    serialNumber: number,
    buyerAccountId: string
  ): Promise<{ transactionId: string }> {
    try {
      this.logger.log(`Transferring NFT from escrow: ${nftTokenId}#${serialNumber} → ${buyerAccountId}`);

      const { TransferTransaction, TokenId, AccountId } = await import('@hashgraph/sdk');

      // Transfer NFT from marketplace (escrow) to buyer
      const transferTx = await new TransferTransaction()
        .addNftTransfer(
          TokenId.fromString(nftTokenId),
          serialNumber,
          this.operatorId, // From marketplace (owner in escrow)
          AccountId.fromString(buyerAccountId) // To buyer
        )
        .setTransactionMemo(`Marketplace sale: ${nftTokenId}`)
        .freezeWith(this.client)
        .sign(this.operatorKey);

      const response = await transferTx.execute(this.client);
      const receipt = await response.getReceipt(this.client);

      this.logger.log(`✅ NFT transferred from escrow: ${response.transactionId.toString()}`);

      return {
        transactionId: response.transactionId.toString()
      };
    } catch (error) {
      this.logger.error(`Failed to transfer NFT from escrow: ${error.message}`, error.stack);
      throw new Error(`Failed to transfer NFT from escrow: ${error.message}`);
    }
  }
}

