import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetDocument, AssetStatus } from '../schemas/asset.schema';
import { AssetV2, AssetV2Document, AssetTypeV2, AssetStatusV2, VerificationLevel } from '../schemas/asset-v2.schema';
import { CreateAssetDto } from './dto/create-asset.dto';
import { ApiService } from '../api/api.service';

// New DTOs for dual asset system
export interface CreateDigitalAssetDto {
  category: number; // 6 = DIGITAL_ART, 7 = NFT, etc.
  assetType: string;
  name: string;
  location: string;
  totalValue: string;
  imageURI: string;
  description: string;
  owner: string;
  assetId?: string; // Optional - provided by frontend after blockchain creation
  transactionId?: string; // Optional - provided by frontend after blockchain creation
}

export interface CreateRWAAssetDto {
  category: number; // 0 = REAL_ESTATE, 1 = COMMODITY, etc.
  assetType: string;
  name: string;
  location: string;
  totalValue: string;
  maturityDate: number;
  evidenceHashes: string[];
  documentTypes: string[];
  imageURI: string;
  documentURI: string;
  description: string;
  owner: string;
  assetId?: string; // Optional - provided by frontend after blockchain creation
  transactionId?: string; // Optional - provided by frontend after blockchain creation
  maxInvestablePercentage?: number; // Optional - maximum percentage that can be tokenized (0-100, default: 100)
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    @InjectModel(Asset.name) private assetModel: Model<AssetDocument>,
    @InjectModel(AssetV2.name) private assetV2Model: Model<AssetV2Document>,
    private readonly apiService: ApiService,
  ) {}

  // NEW DUAL ASSET SYSTEM METHODS

  async createDigitalAsset(createDigitalAssetDto: CreateDigitalAssetDto): Promise<{ asset: AssetV2; assetId: string; transactionId: string }> {
    try {
      // Process digital asset creation (frontend handles blockchain)
      const apiResult = await this.apiService.createDigitalAsset({
        category: createDigitalAssetDto.category,
        assetType: createDigitalAssetDto.assetType,
        name: createDigitalAssetDto.name,
        location: createDigitalAssetDto.location,
        totalValue: createDigitalAssetDto.totalValue,
        imageURI: createDigitalAssetDto.imageURI,
        description: createDigitalAssetDto.description,
        owner: createDigitalAssetDto.owner,
        assetId: createDigitalAssetDto.assetId, // If provided by frontend
        transactionId: createDigitalAssetDto.transactionId, // If provided by frontend
      });

      // Create asset in database using new schema
      const asset = new this.assetV2Model({
        assetId: apiResult.assetId,
        type: AssetTypeV2.DIGITAL,
        category: this.getCategoryName(createDigitalAssetDto.category),
        assetType: createDigitalAssetDto.assetType,
        name: createDigitalAssetDto.name,
        location: createDigitalAssetDto.location,
        totalValue: parseFloat(createDigitalAssetDto.totalValue),
        owner: createDigitalAssetDto.owner,
        status: AssetStatusV2.DIGITAL_ACTIVE, // Digital assets are instantly active
        tokenizedAmount: parseFloat(createDigitalAssetDto.totalValue),
        verificationScore: 100, // Digital assets are instantly verified
        verificationLevel: VerificationLevel.MASTER, // Digital assets are instantly verified
        imageURI: createDigitalAssetDto.imageURI,
        description: createDigitalAssetDto.description,
        isTradeable: true,
        operations: [`Digital asset created: ${apiResult.transactionId}`],
        createdAt: new Date(),
        verifiedAt: new Date(), // Digital assets are instantly verified
      });

      const savedAsset = await asset.save();
      this.logger.log(`Created digital asset: ${savedAsset.assetId}`);

      return {
        asset: savedAsset,
        assetId: apiResult.assetId,
        transactionId: apiResult.transactionId
      };
    } catch (error) {
      this.logger.error(`Failed to create digital asset: ${error.message}`);
      throw new Error(`Digital asset creation failed: ${error.message}`);
    }
  }

  async createRWAAsset(createRWAAssetDto: CreateRWAAssetDto): Promise<{ asset: AssetV2; assetId: string; transactionId: string }> {
    try {
      // Validate maturity date is at least 1 year in the future
      const maturityTimestamp = createRWAAssetDto.maturityDate;
      const maturityDate = new Date(maturityTimestamp * 1000);
      const today = new Date();
      const oneYearFromNow = new Date(today);
      oneYearFromNow.setFullYear(today.getFullYear() + 1);
      
      if (maturityDate < oneYearFromNow) {
        throw new BadRequestException(
          `Maturity date must be at least 1 year from today. Provided: ${maturityDate.toLocaleDateString()}, Minimum: ${oneYearFromNow.toLocaleDateString()}`
        );
      }

      this.logger.log(`Creating RWA asset with maturityDate: ${maturityDate.toLocaleDateString()} (timestamp: ${maturityTimestamp}), maxInvestablePercentage: ${createRWAAssetDto.maxInvestablePercentage ?? 100}%`);

      // Process RWA asset creation (frontend handles blockchain)
      const apiResult = await this.apiService.createRWAAsset({
        category: createRWAAssetDto.category,
        assetType: createRWAAssetDto.assetType,
        name: createRWAAssetDto.name,
        location: createRWAAssetDto.location,
        totalValue: createRWAAssetDto.totalValue,
        maturityDate: createRWAAssetDto.maturityDate,
        evidenceHashes: createRWAAssetDto.evidenceHashes,
        documentTypes: createRWAAssetDto.documentTypes,
        imageURI: createRWAAssetDto.imageURI,
        documentURI: createRWAAssetDto.documentURI,
        description: createRWAAssetDto.description,
        owner: createRWAAssetDto.owner,
        assetId: createRWAAssetDto.assetId, // If provided by frontend
        transactionId: createRWAAssetDto.transactionId, // If provided by frontend
      });

      // Create asset in database using new schema
      const asset = new this.assetV2Model({
        assetId: apiResult.assetId,
        type: AssetTypeV2.RWA,
        category: this.getCategoryName(createRWAAssetDto.category),
        assetType: createRWAAssetDto.assetType,
        name: createRWAAssetDto.name,
        location: createRWAAssetDto.location,
        totalValue: parseFloat(createRWAAssetDto.totalValue),
        owner: createRWAAssetDto.owner,
        status: AssetStatusV2.PENDING, // RWA assets need verification
        tokenizedAmount: 0, // RWA assets are not immediately tokenized
        maxInvestablePercentage: createRWAAssetDto.maxInvestablePercentage ?? 100, // Owner-specified limit (default: 100%)
        verificationScore: 0,
        verificationLevel: VerificationLevel.BASIC, // RWA assets start at basic level
        maturityDate: maturityDate, // Use validated maturity date
        evidenceHashes: createRWAAssetDto.evidenceHashes,
        documentTypes: createRWAAssetDto.documentTypes,
        imageURI: createRWAAssetDto.imageURI,
        documentURI: createRWAAssetDto.documentURI,
        description: createRWAAssetDto.description,
        isTradeable: false, // RWA assets need verification first
        operations: [`RWA asset created: ${apiResult.transactionId}`],
        createdAt: new Date(),
      });

      const savedAsset = await asset.save();
      this.logger.log(`Created RWA asset: ${savedAsset.assetId}`);

      // Register asset ownership (if AssetOwnersService is available)
      try {
        // Note: This will be injected if AssetOwnersModule is imported
        // For now, we'll handle it gracefully if not available
        if ((this as any).assetOwnersService) {
          await (this as any).assetOwnersService.initializeOwnership(
            savedAsset.assetId,
            createRWAAssetDto.owner
          );
        }
      } catch (error) {
        this.logger.warn(`Failed to register asset ownership (non-critical): ${error.message}`);
      }

      return {
        asset: savedAsset,
        assetId: apiResult.assetId,
        transactionId: apiResult.transactionId
      };
    } catch (error) {
      this.logger.error(`Failed to create RWA asset: ${error.message}`);
      throw new Error(`RWA asset creation failed: ${error.message}`);
    }
  }

  async verifyAsset(assetId: string, verificationLevel: number): Promise<{ transactionId: string }> {
    try {
      // Process asset verification (frontend handles blockchain)
      const apiResult = await this.apiService.verifyAsset(assetId, verificationLevel);

      // Update asset in database using new schema
      const verificationLevels = [VerificationLevel.BASIC, VerificationLevel.PROFESSIONAL, VerificationLevel.EXPERT, VerificationLevel.MASTER];
      const updatedAsset = await this.assetV2Model.findOneAndUpdate(
        { assetId },
        {
          $set: {
            status: verificationLevel >= 1 ? AssetStatusV2.VERIFIED : AssetStatusV2.PENDING,
            verificationScore: verificationLevel * 25, // 25, 50, 75, 100
            verificationLevel: verificationLevels[verificationLevel],
            verifiedAt: new Date(),
            operations: [...(await this.getAssetOperations(assetId)), `Asset verified to ${verificationLevels[verificationLevel]} level: ${apiResult.transactionId}`]
          }
        },
        { new: true }
      );

      if (!updatedAsset) {
        throw new NotFoundException('Asset not found');
      }

      this.logger.log(`Verified asset ${assetId} to level ${verificationLevel}`);
      return { transactionId: apiResult.transactionId };
    } catch (error) {
      this.logger.error(`Failed to verify asset: ${error.message}`);
      throw new Error(`Asset verification failed: ${error.message}`);
    }
  }

  private getCategoryName(category: number): string {
    const categories = {
      0: 'REAL_ESTATE',
      1: 'COMMODITY',
      2: 'AGRICULTURE',
      3: 'MINING',
      4: 'ENERGY',
      5: 'INFRASTRUCTURE',
      6: 'DIGITAL_ART',
      7: 'NFT',
      8: 'DIGITAL_COLLECTIBLE'
    };
    return categories[category] || 'UNKNOWN';
  }

  private async getAssetOperations(assetId: string): Promise<string[]> {
    const asset = await this.assetModel.findOne({ assetId });
    return asset?.operations || [];
  }

  // LEGACY METHODS (DEPRECATED)

  async createAsset(createAssetDto: CreateAssetDto): Promise<Asset> {
    // Generate unique asset ID
    const assetId = `${createAssetDto.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const asset = new this.assetModel({
      ...createAssetDto,
      assetId,
      status: AssetStatus.PENDING,
      tokenizedAmount: 0,
      verificationScore: 0,
      investments: [],
      operations: [],
    });

    return asset.save();
  }

  /* async createAssetWithTokenization(createAssetDto: CreateAssetDto): Promise<{ asset: Asset; tokenId?: string; transactionId?: string }> {
    let asset: Asset;
    
    try {
      // First create the asset in the database
      asset = await this.createAsset(createAssetDto);
      
      this.logger.log(`Created asset ${asset.assetId} in database`);

      // Prepare tokenization request
      // const tokenizationRequest: TokenizationRequest = {
        assetId: asset.assetId,
        owner: createAssetDto.owner,
        tokenName: `${createAssetDto.name} Token`,
        tokenSymbol: this.generateTokenSymbol(createAssetDto.name, createAssetDto.type),
        totalSupply: createAssetDto.tokenSupply,
        enableKyc: true,
        enableFreeze: true,
        metadata: {
          assetType: createAssetDto.type,
          location: createAssetDto.location,
          totalValue: createAssetDto.totalValue,
          expectedAPY: createAssetDto.expectedAPY,
          maturityDate: createAssetDto.maturityDate,
        }
      };

      // Create token on Hedera
      // const tokenizationResult = await this.hederaService.createAssetToken(tokenizationRequest);
      
      this.logger.log(`Created Hedera token ${tokenizationResult.tokenId} for asset ${asset.assetId}`);

      // Update asset with token information
      const updatedAsset = await this.assetModel.findByIdAndUpdate(
        (asset as any)._id,
        {
          $set: {
            tokenId: tokenizationResult.tokenId,
            status: AssetStatus.ACTIVE,
            tokenizedAmount: createAssetDto.tokenSupply,
            operations: [`Token created on Hedera: ${tokenizationResult.transactionId}`]
          }
        },
        { new: true }
      );

      return {
        asset: updatedAsset,
        tokenId: tokenizationResult.tokenId,
        transactionId: tokenizationResult.transactionId
      };

    } catch (error) {
      this.logger.error(`Failed to create asset with tokenization: ${error.message}`);
      
      // If tokenization fails, still return the asset but mark as pending
      if (asset) {
        const failedAsset = await this.assetModel.findById((asset as any)._id);
        if (failedAsset) {
          await this.assetModel.findByIdAndUpdate((asset as any)._id, {
            $set: {
              status: AssetStatus.PENDING,
              operations: [`Tokenization failed: ${error.message}`]
            }
          });
        }
      }
      
      throw new Error(`Asset created but tokenization failed: ${error.message}`);
    }
  } */

  private generateTokenSymbol(name: string, type: string): string {
    // Generate a 3-5 character symbol from the asset name and type
    const typePrefix = type.substring(0, 2).toUpperCase();
    const nameWords = name.split(' ').map(word => word.charAt(0).toUpperCase()).join('');
    return `${typePrefix}${nameWords}`.substring(0, 5);
  }

  async getAssets(
    filter?: {
      type?: string;
      status?: string;
      country?: string;
      minValue?: number;
      maxValue?: number;
    },
    limit: number = 20,
    offset: number = 0,
  ): Promise<Asset[]> {
    const query: any = {};
    
    if (filter?.type) query.type = filter.type;
    if (filter?.status) query.status = filter.status;
    if (filter?.country) query['location.country'] = new RegExp(filter.country, 'i');
    if (filter?.minValue) query.totalValue = { $gte: filter.minValue };
    if (filter?.maxValue) query.totalValue = { ...query.totalValue, $lte: filter.maxValue };

    return this.assetModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .exec();
  }

  async getAssetById(id: string): Promise<Asset> {
    // Validate that id is a valid ObjectId
    if (!id || typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new BadRequestException('Invalid asset ID format');
    }
    
    const asset = await this.assetModel.findById(id).exec();
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    return asset;
  }

  async getAssetByAssetId(assetId: string): Promise<Asset> {
    const asset = await this.assetModel.findOne({ assetId }).exec();
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    return asset;
  }

  async getFeaturedAssets(limit: number = 10): Promise<Asset[]> {
    return this.assetModel
      .find({ 
        status: AssetStatus.ACTIVE,
        verificationScore: { $gte: 80 }
      })
      .sort({ expectedAPY: -1, verificationScore: -1 })
      .limit(limit)
      .exec();
  }

  async getAssetsByOwner(owner: string): Promise<Asset[]> {
    return this.assetModel
      .find({ owner })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get all assets from database (both Asset and AssetV2 models)
   */
  async getAllAssets(status?: string): Promise<any[]> {
    try {
      // Build query for filtering by status
      const query: any = {};
      if (status && status !== 'ALL') {
        query.status = status;
      }

      // Fetch from both Asset and AssetV2 models
      const [legacyAssets, v2Assets] = await Promise.all([
        this.assetModel.find(query).sort({ createdAt: -1 }).exec(),
        this.assetV2Model.find(query).sort({ createdAt: -1 }).exec()
      ]);

      // Transform both to a unified format
      const allAssets = [
        ...legacyAssets.map((asset: any) => ({
          assetId: asset.assetId,
          id: asset._id?.toString(),
          name: asset.name,
          description: asset.description || '',
          type: asset.type || 'RWA',
          category: asset.category || '',
          status: asset.status || 'PENDING',
          totalValue: asset.totalValue || 0,
          value: asset.totalValue || 0,
          location: asset.location || { country: 'Unknown', region: 'Unknown' },
          owner: asset.owner,
          creator: asset.owner,
          expectedAPY: asset.expectedAPY || 0,
          apy: asset.expectedAPY || 0,
          maturityDate: asset.maturityDate || new Date().toISOString(),
          verificationScore: asset.verificationScore || 0,
          verificationLevel: asset.verificationLevel || 0,
          imageURI: asset.imageURI || asset.displayImage || asset.image,
          displayImage: asset.displayImage || asset.imageURI || asset.image,
          image: asset.image || asset.imageURI || asset.displayImage,
          documentURI: asset.documentURI || '',
          evidenceFiles: asset.evidenceFiles || [],
          legalDocuments: asset.legalDocuments || [],
          createdAt: asset.createdAt || new Date(),
          verifiedAt: asset.verifiedAt,
          isTradeable: asset.isTradeable || false,
        })),
        ...v2Assets.map((asset: any) => ({
          assetId: asset.assetId,
          id: asset._id?.toString(),
          name: asset.name,
          description: asset.description || '',
          type: asset.type || 'RWA',
          category: asset.category || '',
          status: asset.status || 'PENDING',
          totalValue: asset.totalValue || 0,
          value: asset.totalValue || 0,
          location: asset.location || { country: 'Unknown', region: 'Unknown' },
          owner: asset.owner,
          creator: asset.owner,
          expectedAPY: asset.expectedAPY || 0,
          apy: asset.expectedAPY || 0,
          maturityDate: asset.maturityDate || new Date().toISOString(),
          verificationScore: asset.verificationScore || 0,
          verificationLevel: asset.verificationLevel || 0,
          imageURI: asset.imageURI || asset.displayImage,
          displayImage: asset.displayImage || asset.imageURI,
          image: asset.imageURI || asset.displayImage,
          documentURI: asset.documentURI || '',
          evidenceHashes: asset.evidenceHashes || [],
          documentTypes: asset.documentTypes || [],
          evidenceFiles: asset.evidenceFiles || [],
          legalDocuments: asset.legalDocuments || [],
          createdAt: asset.createdAt || new Date(),
          verifiedAt: asset.verifiedAt,
          isTradeable: asset.isTradeable || false,
        }))
      ];

      this.logger.log(`Fetched ${allAssets.length} assets (${legacyAssets.length} legacy + ${v2Assets.length} v2)`);
      return allAssets;
    } catch (error) {
      this.logger.error(`Failed to get all assets: ${error.message}`);
      throw error;
    }
  }

  async getDetailedStats() {
    const [assetStats, typeStats, statusStats] = await Promise.all([
      this.assetModel.aggregate([
        {
          $group: {
            _id: null,
            totalValueLocked: { $sum: '$totalValue' },
            totalAssets: { $sum: 1 },
            averageAPY: { $avg: '$expectedAPY' },
            averageVerificationScore: { $avg: '$verificationScore' },
            totalTokenized: { $sum: '$tokenizedAmount' }
          }
        }
      ]),
      this.assetModel.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalValue: { $sum: '$totalValue' },
            averageAPY: { $avg: '$expectedAPY' }
          }
        }
      ]),
      this.assetModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const stats = assetStats[0] || {};
    
    return {
      overview: {
        totalValueLocked: stats.totalValueLocked || 0,
        totalAssets: stats.totalAssets || 0,
        averageAPY: stats.averageAPY || 0,
        averageVerificationScore: stats.averageVerificationScore || 0,
        totalTokenized: stats.totalTokenized || 0
      },
      byType: typeStats,
      byStatus: statusStats,
      timestamp: new Date()
    };
  }

  // BLOCKCHAIN STATE VERIFICATION

  async getNFTBlockchainState(tokenId: string, serialNumber: string): Promise<{
    owner: string;
    isListed: boolean;
    isInEscrow: boolean;
    marketplaceAccount: string;
    seller?: string;
  }> {
    try {
      const marketplaceAccount = '0.0.6916959'; // Your marketplace account
      
      // Query Hedera Mirror Node for NFT ownership
      const mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com';
      const response = await fetch(`${mirrorNodeUrl}/api/v1/tokens/${tokenId}/nfts/${serialNumber}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch NFT state: ${response.statusText}`);
      }
      
      const data = await response.json();
      const currentOwner = data.account_id;
      
      // NFT is listed if it's currently owned by the marketplace (in escrow)
      const isInEscrow = currentOwner === marketplaceAccount;
      const isListed = isInEscrow;
      
      // If in escrow, find who listed it (who transferred to marketplace)
      let seller: string | undefined;
      if (isInEscrow) {
        try {
          // Query NFT transaction history to find the transfer to marketplace
          const historyResponse = await fetch(`${mirrorNodeUrl}/api/v1/tokens/${tokenId}/nfts/${serialNumber}/transactions?limit=20&order=desc`);
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            
            // Find the most recent transfer TO the marketplace (listing transaction)
            const listingTx = historyData.transactions?.find((tx: any) => 
              tx.receiver_account_id === marketplaceAccount && 
              tx.sender_account_id !== marketplaceAccount
            );
            
            if (listingTx) {
              // Get detailed transaction to access nft_transfers
              const txDetailResponse = await fetch(`${mirrorNodeUrl}/api/v1/transactions/${listingTx.transaction_id}`);
              if (txDetailResponse.ok) {
                const txDetail = await txDetailResponse.json();
                
                // Find the NFT transfer in the detailed transaction
                const nftTransfer = txDetail.transactions?.[0]?.nft_transfers?.find((transfer: any) =>
                  transfer.token_id === tokenId &&
                  transfer.serial_number === parseInt(serialNumber) &&
                  transfer.receiver_account_id === marketplaceAccount
                );
                
                if (nftTransfer) {
                  seller = nftTransfer.sender_account_id;
                  this.logger.log(`✅ Found seller: ${seller} from transaction ${listingTx.transaction_id}`);
                }
              }
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch seller from transaction history:`, error);
        }
      }
      
      this.logger.log(`NFT ${tokenId}-${serialNumber} state: owner=${currentOwner}, isListed=${isListed}, isInEscrow=${isInEscrow}, seller=${seller}`);
      
      return {
        owner: currentOwner,
        isListed,
        isInEscrow,
        marketplaceAccount,
        seller
      };
    } catch (error) {
      this.logger.error(`Failed to get NFT blockchain state:`, error);
      throw error;
    }
  }
}
