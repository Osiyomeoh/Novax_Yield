import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Collection, CollectionDocument } from '../schemas/collection.schema';

@Injectable()
export class CollectionsService {
  private readonly logger = new Logger(CollectionsService.name);

  constructor(
    @InjectModel(Collection.name)
    private collectionModel: Model<CollectionDocument>,
  ) {}

  /**
   * Create a new collection
   */
  async createCollection(data: {
    name: string;
    description?: string;
    symbol?: string;
    creator: string;
    bannerImage?: string;
    profileImage?: string;
    category?: string[];
    royaltyPercentage?: number;
    socialLinks?: any;
  }): Promise<Collection> {
    try {
      const collectionId = `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const collection = new this.collectionModel({
        collectionId,
        name: data.name,
        description: data.description,
        symbol: data.symbol,
        creator: data.creator,
        bannerImage: data.bannerImage,
        profileImage: data.profileImage,
        category: data.category || [],
        royalty: {
          percentage: data.royaltyPercentage || 0,
          receiver: data.creator,
        },
        socialLinks: data.socialLinks || {},
        verified: false,
        nftTokenIds: [],
        itemCount: 0,
        ownerCount: 0,
        listedCount: 0,
        totalVolume: 0,
        floorPrice: 0,
      });

      const saved = await collection.save();
      this.logger.log(`Created collection: ${saved.collectionId}`);
      return saved;
    } catch (error) {
      this.logger.error('Error creating collection:', error);
      throw error;
    }
  }

  /**
   * Get collection by ID
   */
  async getCollection(collectionId: string): Promise<Collection | null> {
    return this.collectionModel.findOne({ collectionId }).exec();
  }

  /**
   * Get all collections with optional filters
   */
  async getCollections(filters?: {
    creator?: string;
    verified?: boolean;
    category?: string;
    sortBy?: 'volume' | 'floor' | 'items' | 'created';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    skip?: number;
  }): Promise<{ collections: Collection[]; total: number }> {
    try {
      const query: any = {};
      
      if (filters?.creator) {
        query.creator = filters.creator;
      }
      
      if (filters?.verified !== undefined) {
        query.verified = filters.verified;
      }
      
      if (filters?.category) {
        query.category = filters.category;
      }

      // Sorting
      let sort: any = { createdAt: -1 }; // Default: newest first
      
      if (filters?.sortBy === 'volume') {
        sort = { totalVolume: filters.sortOrder === 'asc' ? 1 : -1 };
      } else if (filters?.sortBy === 'floor') {
        sort = { floorPrice: filters.sortOrder === 'asc' ? 1 : -1 };
      } else if (filters?.sortBy === 'items') {
        sort = { itemCount: filters.sortOrder === 'asc' ? 1 : -1 };
      }

      const limit = filters?.limit || 50;
      const skip = filters?.skip || 0;

      const [collections, total] = await Promise.all([
        this.collectionModel.find(query).sort(sort).limit(limit).skip(skip).exec(),
        this.collectionModel.countDocuments(query).exec(),
      ]);

      return { collections, total };
    } catch (error) {
      this.logger.error('Error fetching collections:', error);
      throw error;
    }
  }

  /**
   * Add NFT to collection
   */
  async addNFTToCollection(collectionId: string, tokenId: string): Promise<Collection | null> {
    try {
      const collection = await this.collectionModel.findOne({ collectionId }).exec();
      
      if (!collection) {
        this.logger.warn(`Collection not found: ${collectionId}`);
        return null;
      }

      // Add token ID if not already in collection
      if (!collection.nftTokenIds.includes(tokenId)) {
        collection.nftTokenIds.push(tokenId);
        collection.itemCount = collection.nftTokenIds.length;
        await collection.save();
        this.logger.log(`Added NFT ${tokenId} to collection ${collectionId}`);
      }

      return collection;
    } catch (error) {
      this.logger.error('Error adding NFT to collection:', error);
      throw error;
    }
  }

  /**
   * Update collection stats (floor price, volume, etc.)
   */
  async updateCollectionStats(
    collectionId: string,
    stats: {
      floorPrice?: number;
      totalVolume?: number;
      listedCount?: number;
      ownerCount?: number;
      sales24h?: number;
      volume24h?: number;
    }
  ): Promise<Collection | null> {
    try {
      const update: any = {};
      
      if (stats.floorPrice !== undefined) {
        update.floorPrice = stats.floorPrice;
      }
      
      if (stats.totalVolume !== undefined) {
        update.totalVolume = stats.totalVolume;
      }
      
      if (stats.listedCount !== undefined) {
        update.listedCount = stats.listedCount;
      }
      
      if (stats.ownerCount !== undefined) {
        update.ownerCount = stats.ownerCount;
      }

      if (stats.sales24h !== undefined || stats.volume24h !== undefined) {
        update['stats.sales24h'] = stats.sales24h;
        update['stats.volume24h'] = stats.volume24h;
      }

      const collection = await this.collectionModel
        .findOneAndUpdate(
          { collectionId },
          { $set: update },
          { new: true }
        )
        .exec();

      if (collection) {
        this.logger.log(`Updated stats for collection: ${collectionId}`);
      }

      return collection;
    } catch (error) {
      this.logger.error('Error updating collection stats:', error);
      throw error;
    }
  }

  /**
   * Search collections by name or description
   */
  async searchCollections(searchTerm: string, limit: number = 20): Promise<Collection[]> {
    try {
      return this.collectionModel
        .find({
          $text: { $search: searchTerm },
        })
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error('Error searching collections:', error);
      throw error;
    }
  }

  /**
   * Get trending collections (by 24h volume)
   */
  async getTrendingCollections(limit: number = 10): Promise<Collection[]> {
    try {
      return this.collectionModel
        .find({ 'stats.volume24h': { $gt: 0 } })
        .sort({ 'stats.volume24h': -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error('Error fetching trending collections:', error);
      throw error;
    }
  }

  /**
   * Get collection by creator
   */
  async getCollectionsByCreator(creator: string): Promise<Collection[]> {
    try {
      return this.collectionModel
        .find({ creator })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error('Error fetching collections by creator:', error);
      throw error;
    }
  }

  /**
   * Verify collection (admin only)
   */
  async verifyCollection(collectionId: string, verified: boolean = true): Promise<Collection | null> {
    try {
      const collection = await this.collectionModel
        .findOneAndUpdate(
          { collectionId },
          { $set: { verified } },
          { new: true }
        )
        .exec();

      if (collection) {
        this.logger.log(`Collection ${collectionId} verification set to: ${verified}`);
      }

      return collection;
    } catch (error) {
      this.logger.error('Error verifying collection:', error);
      throw error;
    }
  }
}

