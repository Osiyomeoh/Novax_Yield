import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface ActivityEvent {
  id: string;
  type: 'sale' | 'listing' | 'offer' | 'transfer' | 'mint';
  timestamp: string;
  transactionId: string;
  nftContract: string;
  tokenId: string;
  serialNumber: string;
  from: string;
  to: string;
  price?: number;
  currency?: string;
  metadata?: any;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);
  private readonly mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com/api/v1';

  /**
   * Get activity for a specific NFT
   */
  async getNFTActivity(tokenId: string, serialNumber: string, limit: number = 50): Promise<ActivityEvent[]> {
    try {
      const url = `${this.mirrorNodeUrl}/tokens/${tokenId}/nfts/${serialNumber}/transactions?limit=${limit}&order=desc`;
      
      this.logger.log(`Fetching NFT activity: ${url}`);
      const response = await axios.get(url);
      
      if (!response.data || !response.data.transactions) {
        return [];
      }

      const activities: ActivityEvent[] = [];

      for (const tx of response.data.transactions) {
        const activity = this.parseTransaction(tx, tokenId, serialNumber);
        if (activity) {
          activities.push(activity);
        }
      }

      return activities;
    } catch (error) {
      this.logger.error('Error fetching NFT activity:', error.message);
      return [];
    }
  }

  /**
   * Get activity for a user (all their NFT transactions)
   */
  async getUserActivity(accountId: string, limit: number = 100): Promise<ActivityEvent[]> {
    try {
      // Get all NFTs owned by user
      const nftsUrl = `${this.mirrorNodeUrl}/accounts/${accountId}/nfts?limit=100`;
      const nftsResponse = await axios.get(nftsUrl);
      
      if (!nftsResponse.data || !nftsResponse.data.nfts) {
        return [];
      }

      const activities: ActivityEvent[] = [];

      // Get transactions for each NFT
      for (const nft of nftsResponse.data.nfts.slice(0, 20)) { // Limit to 20 NFTs to avoid too many requests
        const nftActivities = await this.getNFTActivity(nft.token_id, nft.serial_number, 10);
        activities.push(...nftActivities);
      }

      // Sort by timestamp descending
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return activities.slice(0, limit);
    } catch (error) {
      this.logger.error('Error fetching user activity:', error.message);
      return [];
    }
  }

  /**
   * Get recent marketplace activity (sales, listings)
   */
  async getMarketplaceActivity(marketplaceAccount: string, limit: number = 50): Promise<ActivityEvent[]> {
    try {
      // Query transactions involving the marketplace account
      const url = `${this.mirrorNodeUrl}/accounts/${marketplaceAccount}/transactions?limit=${limit}&order=desc&transactiontype=cryptotransfer`;
      
      const response = await axios.get(url);
      
      if (!response.data || !response.data.transactions) {
        return [];
      }

      const activities: ActivityEvent[] = [];

      for (const tx of response.data.transactions) {
        // Parse marketplace transactions
        if (tx.transfers && tx.transfers.length > 0) {
          const activity = this.parseMarketplaceTransaction(tx, marketplaceAccount);
          if (activity) {
            activities.push(activity);
          }
        }
      }

      return activities;
    } catch (error) {
      this.logger.error('Error fetching marketplace activity:', error.message);
      return [];
    }
  }

  /**
   * Get collection activity (all NFTs in a collection)
   */
  async getCollectionActivity(tokenId: string, limit: number = 50): Promise<ActivityEvent[]> {
    try {
      // Get NFT info for the collection
      const nftInfoUrl = `${this.mirrorNodeUrl}/tokens/${tokenId}/nfts?limit=100`;
      const nftInfoResponse = await axios.get(nftInfoUrl);
      
      if (!nftInfoResponse.data || !nftInfoResponse.data.nfts) {
        return [];
      }

      const activities: ActivityEvent[] = [];

      // Get recent transactions for first 10 NFTs (to avoid rate limits)
      for (const nft of nftInfoResponse.data.nfts.slice(0, 10)) {
        const nftActivities = await this.getNFTActivity(tokenId, nft.serial_number, 5);
        activities.push(...nftActivities);
      }

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return activities.slice(0, limit);
    } catch (error) {
      this.logger.error('Error fetching collection activity:', error.message);
      return [];
    }
  }

  /**
   * Parse a transaction into an activity event
   */
  private parseTransaction(tx: any, tokenId: string, serialNumber: string): ActivityEvent | null {
    try {
      const type = this.determineTransactionType(tx);
      
      if (!type) {
        return null;
      }

      // Extract sender and receiver
      let from = 'unknown';
      let to = 'unknown';

      if (tx.nft_transfers && tx.nft_transfers.length > 0) {
        const nftTransfer = tx.nft_transfers.find(
          (t: any) => t.token_id === tokenId && t.serial_number === serialNumber
        );
        
        if (nftTransfer) {
          from = nftTransfer.sender_account_id || 'unknown';
          to = nftTransfer.receiver_account_id || 'unknown';
        }
      }

      // Try to extract price from TRUST token transfers
      let price: number | undefined;
      let currency: string | undefined;

      if (tx.token_transfers && tx.token_transfers.length > 0) {
        const trustTransfer = tx.token_transfers.find(
          (t: any) => t.token_id === process.env.TRUST_TOKEN_ID
        );
        
        if (trustTransfer && trustTransfer.amount) {
          price = Math.abs(trustTransfer.amount) / 1e8; // Convert from tinybar
          currency = 'TRUST';
        }
      }

      return {
        id: `${tx.transaction_id}_${tokenId}_${serialNumber}`,
        type,
        timestamp: tx.consensus_timestamp,
        transactionId: tx.transaction_id,
        nftContract: tokenId,
        tokenId,
        serialNumber,
        from,
        to,
        price,
        currency,
        metadata: tx,
      };
    } catch (error) {
      this.logger.warn('Error parsing transaction:', error.message);
      return null;
    }
  }

  /**
   * Determine transaction type
   */
  private determineTransactionType(tx: any): 'sale' | 'listing' | 'offer' | 'transfer' | 'mint' | null {
    // Check for minting (receiver is not marketplace)
    if (tx.nft_transfers && tx.nft_transfers.length > 0) {
      const nftTransfer = tx.nft_transfers[0];
      
      // Mint: sender is null or treasury
      if (!nftTransfer.sender_account_id || nftTransfer.sender_account_id === '0.0.0') {
        return 'mint';
      }

      // Sale: involves TRUST token transfer
      if (tx.token_transfers && tx.token_transfers.length > 0) {
        const hasTrustTransfer = tx.token_transfers.some(
          (t: any) => t.token_id === process.env.TRUST_TOKEN_ID
        );
        
        if (hasTrustTransfer) {
          return 'sale';
        }
      }

      // Transfer: just NFT movement
      return 'transfer';
    }

    return null;
  }

  /**
   * Parse marketplace-specific transaction
   */
  private parseMarketplaceTransaction(tx: any, marketplaceAccount: string): ActivityEvent | null {
    // Check if this is a listing (NFT transferred TO marketplace)
    if (tx.nft_transfers && tx.nft_transfers.length > 0) {
      const toMarketplace = tx.nft_transfers.find(
        (t: any) => t.receiver_account_id === marketplaceAccount
      );
      
      if (toMarketplace) {
        return {
          id: `${tx.transaction_id}_listing`,
          type: 'listing',
          timestamp: tx.consensus_timestamp,
          transactionId: tx.transaction_id,
          nftContract: toMarketplace.token_id,
          tokenId: toMarketplace.token_id,
          serialNumber: toMarketplace.serial_number,
          from: toMarketplace.sender_account_id,
          to: marketplaceAccount,
        };
      }

      // Check if this is a sale (NFT transferred FROM marketplace)
      const fromMarketplace = tx.nft_transfers.find(
        (t: any) => t.sender_account_id === marketplaceAccount
      );
      
      if (fromMarketplace) {
        // Extract price
        let price: number | undefined;
        if (tx.token_transfers && tx.token_transfers.length > 0) {
          const trustTransfer = tx.token_transfers.find(
            (t: any) => t.token_id === process.env.TRUST_TOKEN_ID
          );
          
          if (trustTransfer) {
            price = Math.abs(trustTransfer.amount) / 1e8;
          }
        }

        return {
          id: `${tx.transaction_id}_sale`,
          type: 'sale',
          timestamp: tx.consensus_timestamp,
          transactionId: tx.transaction_id,
          nftContract: fromMarketplace.token_id,
          tokenId: fromMarketplace.token_id,
          serialNumber: fromMarketplace.serial_number,
          from: marketplaceAccount,
          to: fromMarketplace.receiver_account_id,
          price,
          currency: 'TRUST',
        };
      }
    }

    return null;
  }

  /**
   * Get price history for an NFT
   */
  async getNFTPriceHistory(tokenId: string, serialNumber: string): Promise<{ timestamp: string; price: number }[]> {
    try {
      const activities = await this.getNFTActivity(tokenId, serialNumber, 100);
      
      const priceHistory = activities
        .filter(a => a.type === 'sale' && a.price)
        .map(a => ({
          timestamp: a.timestamp,
          price: a.price!,
        }))
        .reverse(); // Oldest first for chart

      return priceHistory;
    } catch (error) {
      this.logger.error('Error fetching price history:', error.message);
      return [];
    }
  }
}

