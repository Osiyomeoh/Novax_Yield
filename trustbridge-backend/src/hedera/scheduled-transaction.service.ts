import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  ScheduleCreateTransaction,
  ScheduleInfoQuery,
  ScheduleSignTransaction,
  ScheduleId,
  TransferTransaction,
  TokenId,
  AccountId,
  PrivateKey,
  Hbar,
  Timestamp,
} from '@hashgraph/sdk';

/**
 * Hedera Scheduled Transactions Service
 * For auto-executing auctions, timed listings, and delayed operations
 */

export interface ScheduledAuction {
  auctionId: string;
  assetTokenId: string;
  assetName: string;
  seller: string;
  startPrice: number;
  currentBid: number;
  highestBidder: string | null;
  endTime: Date;
  scheduleId: string | null;
  status: 'active' | 'completed' | 'cancelled';
}

@Injectable()
export class ScheduledTransactionService {
  private readonly logger = new Logger(ScheduledTransactionService.name);
  private client: Client;
  private operatorId: string;
  private operatorKey: PrivateKey;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      const network = this.configService.get<string>('HEDERA_NETWORK', 'testnet');
      
      this.operatorId = this.configService.get<string>('HEDERA_OPERATOR_ID') || this.configService.get<string>('HEDERA_ACCOUNT_ID');
      const operatorKeyString = this.configService.get<string>('HEDERA_OPERATOR_KEY') || this.configService.get<string>('HEDERA_PRIVATE_KEY');
      
      if (!this.operatorId || !operatorKeyString) {
        throw new Error('Hedera operator credentials not configured');
      }

      this.operatorKey = PrivateKey.fromStringECDSA(operatorKeyString);

      if (network === 'mainnet') {
        this.client = Client.forMainnet();
      } else {
        this.client = Client.forTestnet();
      }

      this.client.setOperator(
        AccountId.fromString(this.operatorId),
        this.operatorKey
      );

      this.client.setDefaultMaxTransactionFee(new Hbar(5));

      this.logger.log(`✅ Scheduled Transaction Service initialized for ${network}`);
    } catch (error) {
      this.logger.error('Failed to initialize Scheduled Transaction client:', error);
      throw error;
    }
  }

  /**
   * Create a scheduled auction end transaction
   * This will automatically execute when the auction ends
   */
  async createScheduledAuctionEnd(
    assetTokenId: string,
    seller: string,
    highestBidder: string,
    bidAmount: number,
    endTime: Date
  ): Promise<{
    scheduleId: string;
    transactionId: string;
  }> {
    try {
      this.logger.log(`⏰ Creating scheduled auction end for ${assetTokenId}...`);

      // Create the transfer transaction that will execute at auction end
      // Transfer TRUST tokens from buyer to seller
      const trustTokenId = TokenId.fromString(this.configService.get<string>('TRUST_TOKEN_ID'));
      
      const transferTx = new TransferTransaction()
        .addTokenTransfer(
          trustTokenId,
          AccountId.fromString(highestBidder),
          -bidAmount
        )
        .addTokenTransfer(
          trustTokenId,
          AccountId.fromString(seller),
          bidAmount
        );

      // Create scheduled transaction
      const scheduleTx = new ScheduleCreateTransaction()
        .setScheduledTransaction(transferTx)
        .setScheduleMemo(`Auction end - ${assetTokenId}`)
        .setExpirationTime(Timestamp.fromDate(endTime))
        .setWaitForExpiry(false) // Execute as soon as all signatures collected
        .setMaxTransactionFee(new Hbar(5));

      const response = await scheduleTx.execute(this.client);
      const receipt = await response.getReceipt(this.client);
      const scheduleId = receipt.scheduleId;

      this.logger.log(`✅ Scheduled transaction created: ${scheduleId.toString()}`);
      this.logger.log(`   Will execute at: ${endTime.toISOString()}`);
      this.logger.log(`   Transaction ID: ${response.transactionId.toString()}`);

      return {
        scheduleId: scheduleId.toString(),
        transactionId: response.transactionId.toString(),
      };
    } catch (error) {
      this.logger.error('Failed to create scheduled auction end:', error);
      throw error;
    }
  }

  /**
   * Sign a scheduled transaction (for multi-sig)
   */
  async signScheduledTransaction(
    scheduleId: string,
    signerKey: PrivateKey
  ): Promise<string> {
    try {
      this.logger.log(`✍️ Signing scheduled transaction: ${scheduleId}`);

      const signTx = new ScheduleSignTransaction()
        .setScheduleId(ScheduleId.fromString(scheduleId))
        .freezeWith(this.client);

      const signedTx = await signTx.sign(signerKey);
      const response = await signedTx.execute(this.client);

      this.logger.log(`✅ Scheduled transaction signed: ${response.transactionId.toString()}`);

      return response.transactionId.toString();
    } catch (error) {
      this.logger.error('Failed to sign scheduled transaction:', error);
      throw error;
    }
  }

  /**
   * Get scheduled transaction info
   */
  async getScheduleInfo(scheduleId: string): Promise<any> {
    try {
      const query = new ScheduleInfoQuery()
        .setScheduleId(ScheduleId.fromString(scheduleId));

      const info = await query.execute(this.client);

      return {
        scheduleId: info.scheduleId.toString(),
        memo: info.scheduleMemo,
        creatorAccountId: info.creatorAccountId.toString(),
        payerAccountId: info.payerAccountId?.toString(),
        expirationTime: info.expirationTime?.toDate(),
        executed: info.executed,
        deleted: info.deleted,
      };
    } catch (error) {
      this.logger.error('Failed to get schedule info:', error);
      throw error;
    }
  }

  /**
   * Create scheduled listing (list asset at specific future time)
   */
  async createScheduledListing(
    assetTokenId: string,
    listingTime: Date
  ): Promise<{
    scheduleId: string;
    transactionId: string;
  }> {
    try {
      this.logger.log(`📅 Creating scheduled listing for ${assetTokenId} at ${listingTime.toISOString()}...`);

      // Note: The actual listing logic would be in a smart contract call
      // This is a placeholder showing how scheduled transactions work
      
      // For now, we'll schedule a simple memo transaction as demonstration
      const scheduleTx = new ScheduleCreateTransaction()
        .setScheduleMemo(`Scheduled listing for ${assetTokenId}`)
        .setExpirationTime(Timestamp.fromDate(listingTime))
        .setWaitForExpiry(true) // Wait until expiration time
        .setMaxTransactionFee(new Hbar(5));

      const response = await scheduleTx.execute(this.client);
      const receipt = await response.getReceipt(this.client);
      const scheduleId = receipt.scheduleId;

      this.logger.log(`✅ Scheduled listing created: ${scheduleId.toString()}`);
      this.logger.log(`   Will execute at: ${listingTime.toISOString()}`);

      return {
        scheduleId: scheduleId.toString(),
        transactionId: response.transactionId.toString(),
      };
    } catch (error) {
      this.logger.error('Failed to create scheduled listing:', error);
      throw error;
    }
  }
}

export default ScheduledTransactionService;

