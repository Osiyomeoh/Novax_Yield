import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicInfoQuery,
  TopicId,
  PrivateKey,
  AccountId,
  Hbar,
} from '@hashgraph/sdk';

/**
 * Hedera Consensus Service (HCS) for Marketplace Events
 * Creates immutable, verifiable audit trail for all marketplace actions
 */

export interface MarketplaceEvent {
  type: 'listing' | 'sale' | 'unlisting' | 'offer' | 'offer_accepted' | 'offer_rejected' | 'price_update' | 'transfer';
  assetTokenId: string;
  assetName: string;
  from?: string;
  to?: string;
  price?: number;
  oldPrice?: number;
  newPrice?: number;
  timestamp: string;
  transactionId?: string;
  metadata?: any;
}

export interface OfferMessage {
  type: 'offer' | 'counter_offer' | 'offer_message';
  assetTokenId: string;
  from: string;
  to: string;
  message: string;
  amount?: number;
  timestamp: string;
}

@Injectable()
export class HcsService {
  private readonly logger = new Logger(HcsService.name);
  private client: Client;
  private operatorId: string;
  private operatorKey: PrivateKey;
  
  // HCS Topic IDs
  private marketplaceEventsTopic: TopicId | null = null;
  private offerMessagesTopic: TopicId | null = null;

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

      // Set default max transaction fee
      this.client.setDefaultMaxTransactionFee(new Hbar(2));

      this.logger.log(`✅ HCS Service initialized for ${network}`);
      
      // Load existing topic IDs from config
      const marketplaceTopicId = this.configService.get<string>('HCS_MARKETPLACE_TOPIC_ID');
      const offerTopicId = this.configService.get<string>('HCS_OFFER_TOPIC_ID');
      
      if (marketplaceTopicId) {
        this.marketplaceEventsTopic = TopicId.fromString(marketplaceTopicId);
        this.logger.log(`📋 Loaded marketplace topic: ${marketplaceTopicId}`);
      }
      
      if (offerTopicId) {
        this.offerMessagesTopic = TopicId.fromString(offerTopicId);
        this.logger.log(`💬 Loaded offer topic: ${offerTopicId}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize HCS client:', error);
      throw error;
    }
  }

  /**
   * Create HCS topics for marketplace events
   */
  async createMarketplaceTopics(): Promise<{
    marketplaceTopicId: string;
    offerTopicId: string;
  }> {
    try {
      this.logger.log('📋 Creating HCS topics for marketplace...');

      // Create marketplace events topic
      const marketplaceTx = new TopicCreateTransaction()
        .setTopicMemo('TrustBridge Marketplace Events - Immutable Audit Trail')
        .setAdminKey(this.operatorKey)
        .setSubmitKey(this.operatorKey)
        .setMaxTransactionFee(new Hbar(5));

      const marketplaceResponse = await marketplaceTx.execute(this.client);
      const marketplaceReceipt = await marketplaceResponse.getReceipt(this.client);
      this.marketplaceEventsTopic = marketplaceReceipt.topicId;

      this.logger.log(`✅ Marketplace events topic created: ${this.marketplaceEventsTopic.toString()}`);

      // Create offer messages topic
      const offerTx = new TopicCreateTransaction()
        .setTopicMemo('TrustBridge Offer Messages - Decentralized Communication')
        .setAdminKey(this.operatorKey)
        .setSubmitKey(this.operatorKey)
        .setMaxTransactionFee(new Hbar(5));

      const offerResponse = await offerTx.execute(this.client);
      const offerReceipt = await offerResponse.getReceipt(this.client);
      this.offerMessagesTopic = offerReceipt.topicId;

      this.logger.log(`✅ Offer messages topic created: ${this.offerMessagesTopic.toString()}`);

      return {
        marketplaceTopicId: this.marketplaceEventsTopic.toString(),
        offerTopicId: this.offerMessagesTopic.toString(),
      };
    } catch (error) {
      this.logger.error('Failed to create HCS topics:', error);
      throw error;
    }
  }

  /**
   * Submit a marketplace event to HCS
   */
  async submitMarketplaceEvent(event: MarketplaceEvent): Promise<string> {
    try {
      if (!this.marketplaceEventsTopic) {
        throw new Error('Marketplace topic not initialized');
      }

      // Add timestamp if not present
      if (!event.timestamp) {
        event.timestamp = new Date().toISOString();
      }

      const message = JSON.stringify(event);
      
      this.logger.log(`📤 Submitting ${event.type} event to HCS:`, event.assetName);

      const submitTx = new TopicMessageSubmitTransaction()
        .setTopicId(this.marketplaceEventsTopic)
        .setMessage(message)
        .setMaxTransactionFee(new Hbar(2));

      const response = await submitTx.execute(this.client);
      const receipt = await response.getReceipt(this.client);

      const sequenceNumber = receipt.topicSequenceNumber.toString();
      const transactionId = response.transactionId.toString();

      this.logger.log(`✅ Event submitted to HCS: ${transactionId} (sequence: ${sequenceNumber})`);

      return transactionId;
    } catch (error) {
      this.logger.error('Failed to submit marketplace event:', error);
      // Don't throw - event submission failure shouldn't block marketplace operations
      return null;
    }
  }

  /**
   * Submit an offer message to HCS
   */
  async submitOfferMessage(message: OfferMessage): Promise<string> {
    try {
      if (!this.offerMessagesTopic) {
        throw new Error('Offer topic not initialized');
      }

      // Add timestamp if not present
      if (!message.timestamp) {
        message.timestamp = new Date().toISOString();
      }

      const messageContent = JSON.stringify(message);
      
      this.logger.log(`💬 Submitting offer message to HCS:`, message.type);

      const submitTx = new TopicMessageSubmitTransaction()
        .setTopicId(this.offerMessagesTopic)
        .setMessage(messageContent)
        .setMaxTransactionFee(new Hbar(2));

      const response = await submitTx.execute(this.client);
      const receipt = await response.getReceipt(this.client);

      const sequenceNumber = receipt.topicSequenceNumber.toString();
      const transactionId = response.transactionId.toString();

      this.logger.log(`✅ Offer message submitted: ${transactionId} (sequence: ${sequenceNumber})`);

      return transactionId;
    } catch (error) {
      this.logger.error('Failed to submit offer message:', error);
      return null;
    }
  }

  /**
   * Get topic info
   */
  async getTopicInfo(topicId: string): Promise<any> {
    try {
      const query = new TopicInfoQuery()
        .setTopicId(TopicId.fromString(topicId));

      const info = await query.execute(this.client);

      return {
        topicId: info.topicId.toString(),
        memo: info.topicMemo,
        sequenceNumber: info.sequenceNumber.toString(),
        adminKey: info.adminKey?.toString(),
        submitKey: info.submitKey?.toString(),
      };
    } catch (error) {
      this.logger.error('Failed to get topic info:', error);
      throw error;
    }
  }

  /**
   * Query marketplace events from Mirror Node
   */
  async queryMarketplaceEvents(
    limit: number = 100,
    assetTokenId?: string
  ): Promise<MarketplaceEvent[]> {
    try {
      if (!this.marketplaceEventsTopic) {
        throw new Error('Marketplace topic not initialized');
      }

      const network = this.configService.get<string>('HEDERA_NETWORK', 'testnet');
      const mirrorNodeUrl = network === 'mainnet' 
        ? 'https://mainnet-public.mirrornode.hedera.com'
        : 'https://testnet.mirrornode.hedera.com';

      const url = `${mirrorNodeUrl}/api/v1/topics/${this.marketplaceEventsTopic.toString()}/messages?limit=${limit}&order=desc`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.messages) {
        return [];
      }

      const events: MarketplaceEvent[] = data.messages
        .map((msg: any) => {
          try {
            const messageBase64 = msg.message;
            const messageString = Buffer.from(messageBase64, 'base64').toString('utf-8');
            const event = JSON.parse(messageString);
            
            // Add consensus timestamp
            event.consensusTimestamp = msg.consensus_timestamp;
            event.sequenceNumber = msg.sequence_number;
            
            return event;
          } catch (err) {
            this.logger.warn('Failed to parse HCS message:', err);
            return null;
          }
        })
        .filter(Boolean);

      // Filter by asset if specified
      if (assetTokenId) {
        return events.filter(e => e.assetTokenId === assetTokenId);
      }

      return events;
    } catch (error) {
      this.logger.error('Failed to query marketplace events:', error);
      return [];
    }
  }

  /**
   * Query offer messages from Mirror Node
   */
  async queryOfferMessages(
    assetTokenId?: string,
    accountId?: string,
    limit: number = 50
  ): Promise<OfferMessage[]> {
    try {
      if (!this.offerMessagesTopic) {
        throw new Error('Offer topic not initialized');
      }

      const network = this.configService.get<string>('HEDERA_NETWORK', 'testnet');
      const mirrorNodeUrl = network === 'mainnet' 
        ? 'https://mainnet-public.mirrornode.hedera.com'
        : 'https://testnet.mirrornode.hedera.com';

      const url = `${mirrorNodeUrl}/api/v1/topics/${this.offerMessagesTopic.toString()}/messages?limit=${limit}&order=desc`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.messages) {
        return [];
      }

      const messages: OfferMessage[] = data.messages
        .map((msg: any) => {
          try {
            const messageBase64 = msg.message;
            const messageString = Buffer.from(messageBase64, 'base64').toString('utf-8');
            const message = JSON.parse(messageString);
            
            // Add consensus timestamp
            message.consensusTimestamp = msg.consensus_timestamp;
            message.sequenceNumber = msg.sequence_number;
            
            return message;
          } catch (err) {
            this.logger.warn('Failed to parse HCS message:', err);
            return null;
          }
        })
        .filter(Boolean);

      // Filter by asset or account if specified
      let filteredMessages = messages;
      
      if (assetTokenId) {
        filteredMessages = filteredMessages.filter(m => m.assetTokenId === assetTokenId);
      }
      
      if (accountId) {
        filteredMessages = filteredMessages.filter(m => 
          m.from === accountId || m.to === accountId
        );
      }

      return filteredMessages;
    } catch (error) {
      this.logger.error('Failed to query offer messages:', error);
      return [];
    }
  }

  /**
   * Get marketplace topic ID
   */
  getMarketplaceTopicId(): string | null {
    return this.marketplaceEventsTopic?.toString() || null;
  }

  /**
   * Get offer topic ID
   */
  getOfferTopicId(): string | null {
    return this.offerMessagesTopic?.toString() || null;
  }

  /**
   * Track listing event
   */
  async trackListing(assetTokenId: string, assetName: string, seller: string, price: number, transactionId: string): Promise<void> {
    await this.submitMarketplaceEvent({
      type: 'listing',
      assetTokenId,
      assetName,
      from: seller,
      price,
      timestamp: new Date().toISOString(),
      transactionId,
    });
  }

  /**
   * Track sale event
   */
  async trackSale(assetTokenId: string, assetName: string, seller: string, buyer: string, price: number, transactionId: string): Promise<void> {
    await this.submitMarketplaceEvent({
      type: 'sale',
      assetTokenId,
      assetName,
      from: seller,
      to: buyer,
      price,
      timestamp: new Date().toISOString(),
      transactionId,
    });
  }

  /**
   * Track unlisting event
   */
  async trackUnlisting(assetTokenId: string, assetName: string, seller: string, transactionId: string): Promise<void> {
    await this.submitMarketplaceEvent({
      type: 'unlisting',
      assetTokenId,
      assetName,
      from: seller,
      timestamp: new Date().toISOString(),
      transactionId,
    });
  }

  /**
   * Track price update event
   */
  async trackPriceUpdate(assetTokenId: string, assetName: string, seller: string, oldPrice: number, newPrice: number, transactionId: string): Promise<void> {
    await this.submitMarketplaceEvent({
      type: 'price_update',
      assetTokenId,
      assetName,
      from: seller,
      oldPrice,
      newPrice,
      timestamp: new Date().toISOString(),
      transactionId,
    });
  }

  /**
   * Track offer event
   */
  async trackOffer(assetTokenId: string, assetName: string, buyer: string, seller: string, offerPrice: number): Promise<void> {
    await this.submitMarketplaceEvent({
      type: 'offer',
      assetTokenId,
      assetName,
      from: buyer,
      to: seller,
      price: offerPrice,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track offer accepted event
   */
  async trackOfferAccepted(assetTokenId: string, assetName: string, seller: string, buyer: string, price: number, transactionId: string): Promise<void> {
    await this.submitMarketplaceEvent({
      type: 'offer_accepted',
      assetTokenId,
      assetName,
      from: seller,
      to: buyer,
      price,
      timestamp: new Date().toISOString(),
      transactionId,
    });
  }

  /**
   * Track offer rejected event
   */
  async trackOfferRejected(assetTokenId: string, assetName: string, seller: string, buyer: string, price: number): Promise<void> {
    await this.submitMarketplaceEvent({
      type: 'offer_rejected',
      assetTokenId,
      assetName,
      from: seller,
      to: buyer,
      price,
      timestamp: new Date().toISOString(),
    });
  }
}

