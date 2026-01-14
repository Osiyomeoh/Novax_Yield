import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { AMCPool, AMCPoolDocument, PoolStatus, PoolType } from '../schemas/amc-pool.schema';
import { Asset, AssetDocument } from '../schemas/asset.schema';
import { AssetV2, AssetV2Document } from '../schemas/asset-v2.schema';
import { MantleService } from '../mantle/mantle.service';
import { AdminService } from '../admin/admin.service';
import { Inject, Optional, forwardRef } from '@nestjs/common';
import { ROICalculationService } from './roi-calculation.service';

export interface CreateAMCPoolDto {
  name: string;
  description: string;
  type: PoolType;
  assets: {
    assetId: string;
    name: string;
    value: number;
    percentage: number;
  }[];
  totalValue: number;
  tokenSupply: number;
  tokenPrice: number;
  minimumInvestment: number;
  expectedAPY: number;
  maturityDate: string;
  imageURI?: string;
  documentURI?: string;
  riskFactors?: string[];
  terms?: string[];
  isTradeable?: boolean;
  metadata?: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    liquidity: 'HIGH' | 'MEDIUM' | 'LOW';
    diversification: number;
    geographicDistribution: string[];
    sectorDistribution: { [key: string]: number };
  };
}

export interface InvestInPoolDto {
  poolId: string;
  amount: number; // Amount in TRUST tokens (as wei, will be converted)
  investorAddress: string;
  transactionHash?: string; // Optional: if TRUST tokens already sent on-chain
  trancheType?: 'SENIOR' | 'JUNIOR'; // Optional: for tranche-specific investment
}

export interface DistributeDividendDto {
  poolId: string;
  amount: number;
  description?: string;
}

@Injectable()
export class AMCPoolsService {
  private readonly logger = new Logger(AMCPoolsService.name);

  constructor(
    @InjectModel(AMCPool.name) private amcPoolModel: Model<AMCPoolDocument>,
    @InjectModel(Asset.name) private assetModel: Model<AssetDocument>,
    @InjectModel(AssetV2.name) private assetV2Model: Model<AssetV2Document>,
    private mantleService: MantleService,
    private adminService: AdminService,
    private configService: ConfigService,
    private roiCalculationService: ROICalculationService,
    // Optional: AssetOwnersService (will be undefined if module not loaded)
    @Optional() private assetOwnersService?: any,
  ) {}

  /**
   * Create a new AMC pool (directly on Mantle blockchain)
   */
  async createPool(createPoolDto: CreateAMCPoolDto, adminWallet: string): Promise<AMCPool> {
    try {
      this.logger.log('Creating pool on Mantle blockchain with data:', JSON.stringify(createPoolDto, null, 2));
      
      // Verify admin has permission to create pools
      const adminRole = await this.adminService.checkAdminStatus(adminWallet);
      if (!adminRole.isAmcAdmin && !adminRole.isSuperAdmin && !adminRole.isPlatformAdmin) {
        throw new BadRequestException('Only AMC Admins can create pools');
      }

      // Log asset IDs being sent for debugging
      this.logger.log(`📋 Assets received for pool creation: ${createPoolDto.assets.map(a => `${a.name} (${a.assetId})`).join(', ')}`);
      
      // Validate assets exist and are approved
      await this.validatePoolAssets(createPoolDto.assets);
      
      // 🛡️ VALIDATION: Check tokenization limits for each asset
      for (const poolAsset of createPoolDto.assets) {
        try {
          const asset = await this.mantleService.getAsset(poolAsset.assetId);
          const assetTotalValue = Number(ethers.formatEther(asset.totalValue || 0n));
          
          // Calculate what percentage of asset is being tokenized
          const tokenizedPercentage = (poolAsset.value / assetTotalValue) * 100;
          
          // Get maxInvestablePercentage from blockchain (source of truth)
          // Fallback to database if on-chain value is not available (for backward compatibility)
          let maxInvestablePercentage = 100; // Default to 100% if not specified
          try {
            // ✅ PRIMARY: Get from on-chain asset (source of truth)
            if (asset.maxInvestablePercentage !== undefined && asset.maxInvestablePercentage !== null) {
              maxInvestablePercentage = Number(asset.maxInvestablePercentage);
              this.logger.log(`✅ Using on-chain maxInvestablePercentage: ${maxInvestablePercentage}% for asset ${poolAsset.assetId}`);
            } else {
              // Fallback to database (for assets created before this update)
              const dbAsset = await this.assetV2Model.findOne({ assetId: poolAsset.assetId });
              if (dbAsset && dbAsset.maxInvestablePercentage !== undefined) {
                maxInvestablePercentage = dbAsset.maxInvestablePercentage;
                this.logger.log(`⚠️ Using database maxInvestablePercentage (fallback): ${maxInvestablePercentage}% for asset ${poolAsset.assetId}`);
              } else if (asset.metadata?.maxInvestablePercentage !== undefined) {
                // Last resort: metadata
                maxInvestablePercentage = asset.metadata.maxInvestablePercentage;
                this.logger.log(`⚠️ Using metadata maxInvestablePercentage (fallback): ${maxInvestablePercentage}% for asset ${poolAsset.assetId}`);
              }
            }
          } catch (error) {
            this.logger.warn(`Could not fetch maxInvestablePercentage: ${error.message}, defaulting to 100%`);
          }
          
          if (tokenizedPercentage > maxInvestablePercentage) {
            throw new BadRequestException(
              `Cannot tokenize ${tokenizedPercentage.toFixed(2)}% of asset ${poolAsset.assetId} (${poolAsset.name}). ` +
              `Owner specified maximum investable percentage: ${maxInvestablePercentage}%. ` +
              `Please reduce the asset value in the pool or contact the asset owner.`
            );
          }
          
          // Check if asset is already tokenized beyond limit
          // Get current tokenized percentage from ownership records if available
          const assetOwnersService = (this as any).assetOwnersService;
          if (assetOwnersService) {
            try {
              const ownerData = await assetOwnersService.getOwnerAssets(asset.originalOwner);
              const ownershipRecord = ownerData.assets?.find((a: any) => a.assetId === poolAsset.assetId);
              if (ownershipRecord) {
                const currentTokenized = ownershipRecord.tokenizedPercentage || 0;
                const newTotalTokenized = currentTokenized + tokenizedPercentage;
                
                if (newTotalTokenized > maxInvestablePercentage) {
                  throw new BadRequestException(
                    `Cannot tokenize additional ${tokenizedPercentage.toFixed(2)}% of asset ${poolAsset.assetId}. ` +
                    `Current tokenized: ${currentTokenized.toFixed(2)}%, ` +
                    `New total would be: ${newTotalTokenized.toFixed(2)}%, ` +
                    `Maximum allowed: ${maxInvestablePercentage}%`
                  );
                }
              }
            } catch (error) {
              // Non-critical: ownership service might not be available
              this.logger.warn(`Could not check existing tokenization: ${error.message}`);
            }
          }
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          this.logger.warn(`Could not validate tokenization limit for asset ${poolAsset.assetId}: ${error.message}`);
        }
      }

      // Calculate total value from assets
      const calculatedTotalValue = createPoolDto.assets.reduce((sum, asset) => sum + asset.value, 0);
      if (Math.abs(calculatedTotalValue - createPoolDto.totalValue) > 0.01) {
        throw new BadRequestException('Total value must match sum of asset values');
      }

      // Create pool directly on Mantle blockchain
      this.logger.log(`Creating Mantle pool on-chain: ${createPoolDto.name}`);
      
      // Calculate management and performance fees (default to 3% and 10% if not set)
      const managementFee = 300; // 3% in basis points
      const performanceFee = 1000; // 10% in basis points
      
      // Calculate tranche percentages from pool metadata or use defaults
      const seniorPercentage = 7000; // 70% in basis points
      const seniorAPY = Math.floor(createPoolDto.expectedAPY * 100); // Convert to basis points
      const juniorAPY = Math.floor(createPoolDto.expectedAPY * 1.875 * 100); // Junior typically gets ~1.875x of senior APY
      
      // Generate pool symbol from name
      const poolSymbol = createPoolDto.name
        .split(' ')
        .map(word => word.substring(0, 1).toUpperCase())
        .join('')
        .substring(0, 5) || 'POOL';
      
      // Create pool with tranches on Mantle
      // CRITICAL: Only save to database if on-chain creation succeeds
      let poolResult;
      try {
        poolResult = await this.mantleService.createPoolWithTranches({
          name: createPoolDto.name,
          description: createPoolDto.description,
          managementFee,
          performanceFee,
          seniorPercentage,
          seniorAPY,
          juniorAPY,
          seniorSymbol: `${poolSymbol}S`, // Senior tranche symbol
          juniorSymbol: `${poolSymbol}J`  // Junior tranche symbol
        }, adminWallet);
      } catch (onChainError: any) {
        this.logger.error(`❌ Failed to create pool on-chain: ${onChainError.message}`);
        this.logger.error('Pool will NOT be saved to database - on-chain creation failed');
        throw new BadRequestException(`Failed to create pool on blockchain: ${onChainError.message}. Pool not saved to database.`);
      }
      
      // Validate poolResult has required fields before proceeding
      if (!poolResult || !poolResult.poolId || !poolResult.txHash) {
        this.logger.error('❌ Invalid pool result from on-chain creation');
        this.logger.error('Pool result:', JSON.stringify(poolResult, null, 2));
        throw new BadRequestException('Invalid pool creation result. Pool not saved to database.');
      }
      
      this.logger.log(`✅ Successfully created Mantle pool on-chain: ${poolResult.poolId}`);
      this.logger.log(`Transaction hash: ${poolResult.txHash}`);
      this.logger.log(`Senior tranche ID: ${poolResult.seniorTrancheId}`);
      this.logger.log(`Junior tranche ID: ${poolResult.juniorTrancheId}`);

      // Add assets to pool on-chain
      // CRITICAL: Re-validate asset status right before adding (status might have changed)
      this.logger.log(`Adding ${createPoolDto.assets.length} assets to pool on-chain...`);
      const assetAddResults: string[] = [];
      const assetAddErrors: string[] = [];
      
      for (const poolAsset of createPoolDto.assets) {
        try {
          // Convert assetId to bytes32 if needed
          const assetIdBytes32 = poolAsset.assetId.startsWith('0x') && poolAsset.assetId.length === 66
            ? poolAsset.assetId
            : ethers.id(poolAsset.assetId);
          
          // Re-check asset status right before adding (double-check on-chain status)
          // Use bytes32 format for getAsset to ensure consistency
          this.logger.log(`Re-checking asset ${poolAsset.assetId} (bytes32: ${assetIdBytes32}) status before adding to pool...`);
          
          let onChainAsset;
          let assetStatus: number;
          
          try {
            // Try with bytes32 format first (most reliable)
            onChainAsset = await this.mantleService.getAsset(assetIdBytes32);
            
            // Extract status - handle different return formats
            // Status is at index 19 in the struct (after tokenId at 18)
            if (typeof onChainAsset.status === 'number' && !isNaN(onChainAsset.status)) {
              assetStatus = onChainAsset.status;
              this.logger.log(`✅ Status extracted as number: ${assetStatus}`);
            } else if (typeof onChainAsset.status === 'bigint') {
              assetStatus = Number(onChainAsset.status);
              this.logger.log(`✅ Status extracted from bigint: ${onChainAsset.status} -> ${assetStatus}`);
            } else if (typeof onChainAsset.status === 'string') {
              assetStatus = parseInt(onChainAsset.status, 10);
              this.logger.log(`✅ Status extracted from string: "${onChainAsset.status}" -> ${assetStatus}`);
            } else {
              // Try to get status from array indices (if struct returned as array)
              // Status is at index 19, but also try 17 (frontend fallback) and 18 (tokenId)
              if (onChainAsset[19] !== undefined) {
                assetStatus = typeof onChainAsset[19] === 'bigint' ? Number(onChainAsset[19]) : Number(onChainAsset[19] || 0);
                this.logger.log(`✅ Status extracted from index [19]: ${assetStatus}`);
              } else if (onChainAsset[17] !== undefined) {
                // Check if it's a valid status (0-10) and not an address
                const val17 = typeof onChainAsset[17] === 'bigint' ? Number(onChainAsset[17]) : Number(onChainAsset[17] || 0);
                if (val17 <= 10) {
                  assetStatus = val17;
                  this.logger.log(`⚠️ Status extracted from index [17] (might be wrong): ${assetStatus}`);
                } else {
                  assetStatus = 0;
                  this.logger.warn(`⚠️ Index [17] value ${val17} is not a valid status, defaulting to 0`);
                }
              } else {
                assetStatus = 0;
                this.logger.error(`❌ Could not extract status from any source. onChainAsset.status=${onChainAsset.status}, [17]=${onChainAsset[17]}, [19]=${onChainAsset[19]}`);
              }
            }
            
            this.logger.log(`📊 Asset ${poolAsset.assetId} on-chain status: ${assetStatus} (expected 6)`);
            this.logger.log(`   Asset details: name=${onChainAsset.name}, currentOwner=${onChainAsset.currentOwner}`);
            this.logger.log(`   Status type: ${typeof onChainAsset.status}, raw value: ${onChainAsset.status}`);
          } catch (getAssetError: any) {
            const errorMsg = `Failed to fetch asset ${poolAsset.assetId} from blockchain: ${getAssetError.message}`;
            this.logger.error(`❌ ${errorMsg}`);
            assetAddErrors.push(errorMsg);
            continue; // Skip this asset
          }
          
          if (assetStatus !== 6) {
            const errorMsg = `Asset ${poolAsset.assetId} is not ACTIVE_AMC_MANAGED (status ${assetStatus}, expected 6). Cannot add to pool.`;
            this.logger.error(`❌ ${errorMsg}`);
            this.logger.error(`Asset name: ${onChainAsset.name}, Current owner: ${onChainAsset.currentOwner}`);
            assetAddErrors.push(errorMsg);
            continue; // Skip this asset
          }
          
          this.logger.log(`✅ Asset ${poolAsset.assetId} confirmed ACTIVE_AMC_MANAGED (status 6), adding to pool...`);
          
          const addAssetResult = await this.mantleService.addAssetToPool(
            poolResult.poolId,
            assetIdBytes32,
            adminWallet
          );
          assetAddResults.push(addAssetResult.txHash);
          this.logger.log(`✅ Added asset ${poolAsset.assetId} to pool ${poolResult.poolId}: ${addAssetResult.txHash}`);
        } catch (assetError: any) {
          const errorMsg = `Failed to add asset ${poolAsset.assetId} to pool: ${assetError.message}`;
          this.logger.error(`❌ ${errorMsg}`);
          assetAddErrors.push(errorMsg);
          // Don't throw - we'll log warnings but continue (assets can be added later)
        }
      }
      
      this.logger.log(`Added ${assetAddResults.length}/${createPoolDto.assets.length} assets to pool on-chain`);
      
      // CRITICAL: If no assets were added and we expected assets, fail the operation
      // The pool exists on-chain but is empty, which is not useful
      if (assetAddResults.length === 0 && createPoolDto.assets.length > 0) {
        this.logger.error(`❌ CRITICAL ERROR: Pool created on-chain but NO assets were added. The pool is empty.`);
        this.logger.error(`This usually means assets are not in ACTIVE_AMC_MANAGED status (status 6).`);
        this.logger.error(`Pool ID: ${poolResult.poolId}. Pool will NOT be saved to database.`);
        this.logger.error(`Please ensure all assets are in ACTIVE_AMC_MANAGED status before creating a pool.`);
        
        // Throw error to prevent saving empty pool to database
        throw new BadRequestException(
          `Pool created on-chain but no assets could be added. ` +
          `All assets must be in ACTIVE_AMC_MANAGED status (status 6). ` +
          `Pool ID: ${poolResult.poolId}. ` +
          `Please delete this pool on-chain and recreate with properly activated assets. ` +
          `Pool not saved to database.`
        );
      }
      
      // Warn if some assets failed but at least one succeeded
      if (assetAddErrors.length > 0 && assetAddResults.length > 0) {
        this.logger.warn(`⚠️  Some assets could not be added to the pool. Errors: ${assetAddErrors.join('; ')}`);
        this.logger.warn(`Pool saved with ${assetAddResults.length}/${createPoolDto.assets.length} assets.`);
      }

      // Store pool metadata in database ONLY after successful on-chain creation
      // CRITICAL: This code only runs if poolResult is valid and on-chain creation succeeded
      // The database entry is a reference - source of truth is on-chain
      this.logger.log(`Saving pool to database (on-chain poolId: ${poolResult.poolId})`);
      
      const pool = new this.amcPoolModel({
        poolId: poolResult.poolId, // Use on-chain poolId (bytes32 as hex string)
        name: createPoolDto.name,
        description: createPoolDto.description,
        createdBy: adminWallet,
        createdByName: 'AMC Admin',
        type: createPoolDto.type,
        status: PoolStatus.ACTIVE, // Immediately active since created on-chain
        assets: createPoolDto.assets,
        totalValue: createPoolDto.totalValue,
        tokenSupply: createPoolDto.tokenSupply,
        tokenPrice: createPoolDto.tokenPrice,
        minimumInvestment: createPoolDto.minimumInvestment,
        expectedAPY: createPoolDto.expectedAPY,
        maturityDate: new Date(createPoolDto.maturityDate),
        imageURI: createPoolDto.imageURI || '',
        documentURI: createPoolDto.documentURI || '',
        riskFactors: createPoolDto.riskFactors || [],
        terms: createPoolDto.terms || [],
        isTradeable: createPoolDto.isTradeable || true,
        hederaContractId: poolResult.poolId, // Store on-chain poolId
        launchedAt: new Date(),
        metadata: {
          ...(createPoolDto.metadata || {}),
          seniorTrancheId: poolResult.seniorTrancheId,
          juniorTrancheId: poolResult.juniorTrancheId,
          mantlePoolId: poolResult.poolId,
          riskLevel: createPoolDto.metadata?.riskLevel || 'MEDIUM',
          liquidity: createPoolDto.metadata?.liquidity || 'MEDIUM',
          diversification: createPoolDto.assets.length,
          geographicDistribution: createPoolDto.metadata?.geographicDistribution || [],
          sectorDistribution: createPoolDto.metadata?.sectorDistribution || {}
        },
        operations: [
          `Pool created on-chain by ${adminWallet}`,
          `Mantle transaction: ${poolResult.txHash}`,
          `Senior tranche ID: ${poolResult.seniorTrancheId}`,
          `Junior tranche ID: ${poolResult.juniorTrancheId}`
        ]
      });

      try {
        const savedPool = await pool.save();
        this.logger.log(`✅ Saved pool to database: ${savedPool.poolId} (on-chain poolId: ${poolResult.poolId})`);
        
        // Update asset ownership records for tokenization
        // Calculate tokenization percentage for each asset
        try {
          // Try to get AssetOwnersService if available (optional dependency)
          const assetOwnersService = (this as any).assetOwnersService;
          if (assetOwnersService && typeof assetOwnersService.updateOwnershipAfterTokenization === 'function') {
            const totalPoolValue = createPoolDto.totalValue;
            for (const poolAsset of createPoolDto.assets) {
              try {
                // Get asset to check maxInvestablePercentage
                const asset = await this.mantleService.getAsset(poolAsset.assetId);
                const assetTotalValue = Number(ethers.formatEther(asset.totalValue || 0n));
                
                // Calculate tokenization percentage for this asset
                const assetValue = poolAsset.value;
                const tokenizedPercentage = (assetValue / assetTotalValue) * 100;
                
                // 🛡️ VALIDATION: Check if tokenization exceeds owner's specified limit
                // Get maxInvestablePercentage from asset metadata or database
                // For now, we'll check if tokenizedPercentage exceeds a reasonable limit
                // In production, this should come from asset.maxInvestablePercentage field
                const maxInvestablePercentage = asset.metadata?.maxInvestablePercentage || 100;
                
                if (tokenizedPercentage > maxInvestablePercentage) {
                  this.logger.warn(
                    `⚠️ Tokenization percentage (${tokenizedPercentage.toFixed(2)}%) exceeds ` +
                    `owner's specified limit (${maxInvestablePercentage}%) for asset ${poolAsset.assetId}`
                  );
                  // Still proceed but log warning - AMC should be aware
                }
                
                // Capital raised is proportional to asset value in pool
                const capitalRaised = assetValue;
                
                await assetOwnersService.updateOwnershipAfterTokenization(
                  poolAsset.assetId,
                  tokenizedPercentage,
                  capitalRaised,
                  poolResult.poolId
                );
                this.logger.log(`Updated ownership for asset ${poolAsset.assetId} after tokenization: ${tokenizedPercentage.toFixed(2)}%`);
              } catch (assetOwnerError) {
                this.logger.warn(`Failed to update ownership for asset ${poolAsset.assetId}: ${assetOwnerError.message}`);
              }
            }
          }
        } catch (error) {
          // Non-critical: ownership tracking failed but pool creation succeeded
          this.logger.warn(`Asset ownership tracking not available or failed (non-critical): ${error.message}`);
        }
        
        return savedPool;
      } catch (dbError: any) {
        // If database save fails, log but don't fail the entire operation
        // The pool exists on-chain, which is the source of truth
        this.logger.error(`⚠️  Failed to save pool to database: ${dbError.message}`);
        this.logger.error(`Pool exists on-chain (${poolResult.poolId}) but not in database. This is acceptable - blockchain is source of truth.`);
        return {
          poolId: poolResult.poolId,
          name: createPoolDto.name,
          hederaContractId: poolResult.poolId,
          status: PoolStatus.ACTIVE,
          // ... other fields from createPoolDto
        } as AMCPool;
      }
    } catch (error) {
      this.logger.error('❌ Failed to create AMC pool:', error);
      // Ensure we don't save to database if on-chain creation failed
      if (error instanceof BadRequestException) {
        throw error; // Re-throw validation errors
      }
      throw new BadRequestException(`Pool creation failed: ${error instanceof Error ? error.message : String(error)}. Pool not saved to database.`);
    }
  }

  /**
   * Launch pool (DEPRECATED - pools are now created directly on-chain)
   * This function is kept for backwards compatibility but pools should already be on-chain
   */
  async launchPool(poolId: string, adminWallet: string): Promise<AMCPool> {
    try {
      const pool = await this.amcPoolModel.findOne({ poolId });
      if (!pool) {
        throw new NotFoundException('Pool not found');
      }

      // Check if pool is already on-chain
      if (pool.hederaContractId || pool.status === PoolStatus.ACTIVE) {
        this.logger.log(`Pool ${poolId} is already active on-chain. No action needed.`);
        return pool;
      }

      // If pool exists but not on-chain, this shouldn't happen with new flow
      // CRITICAL: Do not allow pools to exist in database without on-chain creation
      this.logger.error(`❌ Pool ${poolId} exists in database but NOT on-chain. This should not happen.`);
      this.logger.error('Pool creation now happens directly on-chain. This pool needs to be deleted and recreated.');
      throw new BadRequestException('Pool exists in database but not on-chain. Please delete this pool and recreate it using the createPool endpoint (which creates on-chain first).');
    } catch (error) {
      this.logger.error('Failed to launch AMC pool:', error);
      throw error;
    }
  }

  /**
   * Get all pools (only on-chain pools)
   * CRITICAL: Only returns pools that exist on-chain (have hederaContractId)
   */
  async getAllPools(): Promise<AMCPool[]> {
    try {
      // Only return pools that are on-chain (have hederaContractId)
      // This ensures we never return database-only pools
      const pools = await this.amcPoolModel.find({
        $and: [
          { hederaContractId: { $exists: true } },
          { hederaContractId: { $ne: null } },
          { hederaContractId: { $ne: '' } }
        ]
      }).sort({ createdAt: -1 });
      
      this.logger.log(`Found ${pools.length} pools in database with on-chain IDs. Verifying on-chain existence...`);
      
      // Verify each pool actually exists on-chain
      const verifiedPools: AMCPool[] = [];
      const deletedPools: string[] = [];
      
      for (const pool of pools) {
        try {
          const poolIdBytes32 = pool.hederaContractId.startsWith('0x') && pool.hederaContractId.length === 66
            ? pool.hederaContractId
            : ethers.id(pool.hederaContractId);
          
          // Try to fetch pool from blockchain
          const onChainPool = await this.mantleService.getPool(poolIdBytes32);
          
          // If getPool succeeds, pool exists on-chain
          if (onChainPool && onChainPool.poolId && onChainPool.poolId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            verifiedPools.push(pool);
          } else {
            // Pool ID is zero hash or invalid - pool doesn't exist on-chain
            this.logger.warn(`⚠️ Pool ${pool.poolId} (${pool.name}) has ID in database but doesn't exist on-chain. Marking for deletion.`);
            deletedPools.push(pool.poolId);
          }
        } catch (error: any) {
          // If getPool throws an error, pool likely doesn't exist on-chain
          // Common errors: "Pool not found", "zero hash", etc.
          if (error.message?.includes('Pool not found') || 
              error.message?.includes('zero hash') || 
              error.message?.includes('revert') ||
              error.reason?.includes('Pool not found')) {
            this.logger.warn(`⚠️ Pool ${pool.poolId} (${pool.name}) doesn't exist on-chain: ${error.message}. Marking for deletion.`);
            deletedPools.push(pool.poolId);
          } else {
            // Other errors (network, etc.) - include pool but log warning
            this.logger.warn(`⚠️ Could not verify pool ${pool.poolId} on-chain: ${error.message}. Including in results but may need manual verification.`);
            verifiedPools.push(pool);
          }
        }
      }
      
      // Remove deleted pools from database (async, don't wait)
      if (deletedPools.length > 0) {
        this.logger.log(`🗑️ Removing ${deletedPools.length} pools from database that don't exist on-chain...`);
        this.amcPoolModel.deleteMany({ poolId: { $in: deletedPools } })
          .then(result => {
            this.logger.log(`✅ Removed ${result.deletedCount} deleted pools from database`);
          })
          .catch(err => {
            this.logger.error(`❌ Failed to remove deleted pools: ${err.message}`);
          });
      }
      
      this.logger.log(`✅ Returning ${verifiedPools.length} verified on-chain pools (removed ${deletedPools.length} deleted pools)`);
      return verifiedPools;
    } catch (error) {
      this.logger.error('Failed to get all pools:', error);
      throw error;
    }
  }

  /**
   * Remove pools that are not on-chain
   * CRITICAL: This ensures database only contains pools that exist on-chain
   */
  async removeNonOnChainPools(): Promise<{ deletedCount: number; pools: string[] }> {
    try {
      // Find all pools without on-chain ID
      const nonOnChainPools = await this.amcPoolModel.find({
        $or: [
          { hederaContractId: { $exists: false } },
          { hederaContractId: '' },
          { hederaContractId: null }
        ]
      });

      const poolIds = nonOnChainPools.map(pool => pool.poolId);
      const deletedCount = nonOnChainPools.length;

      if (deletedCount > 0) {
        // Delete pools that are not on-chain
        await this.amcPoolModel.deleteMany({
          $or: [
            { hederaContractId: { $exists: false } },
            { hederaContractId: '' },
            { hederaContractId: null }
          ]
        });

        this.logger.log(`Removed ${deletedCount} pools that were not on-chain: ${poolIds.join(', ')}`);
      }

      return {
        deletedCount,
        pools: poolIds
      };
    } catch (error) {
      this.logger.error('Failed to remove non-on-chain pools:', error);
      throw error;
    }
  }

  /**
   * Get active pools (for investment)
   * CRITICAL: Only returns pools that exist on-chain - verifies on-chain existence
   */
  async getActivePools(): Promise<AMCPool[]> {
    try {
      // Only return active pools that are on-chain
      const pools = await this.amcPoolModel.find({ 
        status: PoolStatus.ACTIVE,
        $and: [
          { hederaContractId: { $exists: true } },
          { hederaContractId: { $ne: null } },
          { hederaContractId: { $ne: '' } }
        ]
      }).sort({ expectedAPY: -1 });
      
      this.logger.log(`Found ${pools.length} active pools in database. Verifying on-chain existence...`);
      
      // Verify each pool actually exists on-chain
      const verifiedPools: AMCPool[] = [];
      const deletedPools: string[] = [];
      
      for (const pool of pools) {
        try {
          const poolIdBytes32 = pool.hederaContractId.startsWith('0x') && pool.hederaContractId.length === 66
            ? pool.hederaContractId
            : ethers.id(pool.hederaContractId);
          
          // Try to fetch pool from blockchain
          const onChainPool = await this.mantleService.getPool(poolIdBytes32);
          
          // If getPool succeeds, pool exists on-chain
          if (onChainPool && onChainPool.poolId && onChainPool.poolId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            verifiedPools.push(pool);
          } else {
            // Pool ID is zero hash or invalid - pool doesn't exist on-chain
            this.logger.warn(`⚠️ Active pool ${pool.poolId} (${pool.name}) has ID in database but doesn't exist on-chain. Marking for deletion.`);
            deletedPools.push(pool.poolId);
          }
        } catch (error: any) {
          // If getPool throws an error, pool likely doesn't exist on-chain
          if (error.message?.includes('Pool not found') || 
              error.message?.includes('zero hash') || 
              error.message?.includes('revert') ||
              error.reason?.includes('Pool not found')) {
            this.logger.warn(`⚠️ Active pool ${pool.poolId} (${pool.name}) doesn't exist on-chain: ${error.message}. Marking for deletion.`);
            deletedPools.push(pool.poolId);
          } else {
            // Other errors (network, etc.) - include pool but log warning
            this.logger.warn(`⚠️ Could not verify active pool ${pool.poolId} on-chain: ${error.message}. Including in results but may need manual verification.`);
            verifiedPools.push(pool);
          }
        }
      }
      
      // Remove deleted pools from database (async, don't wait)
      if (deletedPools.length > 0) {
        this.logger.log(`🗑️ Removing ${deletedPools.length} active pools from database that don't exist on-chain...`);
        this.amcPoolModel.deleteMany({ poolId: { $in: deletedPools } })
          .then(result => {
            this.logger.log(`✅ Removed ${result.deletedCount} deleted active pools from database`);
          })
          .catch(err => {
            this.logger.error(`❌ Failed to remove deleted active pools: ${err.message}`);
          });
      }
      
      // Update projected ROI for verified active pools
      for (const pool of verifiedPools) {
        try {
          await this.roiCalculationService.updatePoolProjectedROI(pool.poolId);
        } catch (roiError) {
          this.logger.warn(`Failed to update ROI for pool ${pool.poolId}: ${roiError.message}`);
        }
      }
      
      // Re-fetch to get updated ROI data
      return await this.amcPoolModel.find({ 
        status: PoolStatus.ACTIVE,
        $and: [
          { hederaContractId: { $exists: true } },
          { hederaContractId: { $ne: null } },
          { hederaContractId: { $ne: '' } }
        ]
      }).sort({ expectedAPY: -1 });
    } catch (error) {
      this.logger.error('Failed to get active pools:', error);
      throw error;
    }
  }

  /**
   * Get pool by ID
   * CRITICAL: Only returns pool if it exists on-chain
   */
  async getPoolById(poolId: string): Promise<AMCPool> {
    try {
      const pool = await this.amcPoolModel.findOne({ poolId });
      if (!pool) {
        throw new NotFoundException('Pool not found');
      }
      
      // Verify pool exists on-chain
      if (!pool.hederaContractId || pool.hederaContractId === '') {
        this.logger.warn(`Pool ${poolId} exists in database but NOT on-chain. This should not happen.`);
        throw new NotFoundException('Pool not found on-chain. This pool may need to be recreated.');
      }
      
      // Verify pool actually exists on-chain by calling contract
      try {
        const poolIdBytes32 = pool.hederaContractId.startsWith('0x') && pool.hederaContractId.length === 66
          ? pool.hederaContractId
          : ethers.id(pool.hederaContractId);
        
        const onChainPool = await this.mantleService.getPool(poolIdBytes32);
        
        // Check if pool exists (poolId should not be zero hash)
        if (!onChainPool || !onChainPool.poolId || onChainPool.poolId === '0x0000000000000000000000000000000000000000000000000000000000000000') {
          // Pool doesn't exist on-chain - remove from database
          this.logger.warn(`⚠️ Pool ${poolId} (${pool.name}) doesn't exist on-chain. Removing from database.`);
          await this.amcPoolModel.deleteOne({ poolId });
          throw new NotFoundException('Pool not found on-chain. This pool has been removed from the database.');
        }
      } catch (error: any) {
        // If getPool throws an error, pool likely doesn't exist on-chain
        if (error.message?.includes('Pool not found') || 
            error.message?.includes('zero hash') || 
            error.message?.includes('revert') ||
            error.reason?.includes('Pool not found')) {
          this.logger.warn(`⚠️ Pool ${poolId} (${pool.name}) doesn't exist on-chain: ${error.message}. Removing from database.`);
          await this.amcPoolModel.deleteOne({ poolId });
          throw new NotFoundException('Pool not found on-chain. This pool has been removed from the database.');
        }
        // Re-throw if it's already a NotFoundException
        if (error instanceof NotFoundException) {
          throw error;
        }
        // For other errors (network issues), log but still return pool
        this.logger.warn(`⚠️ Could not verify pool ${poolId} on-chain: ${error.message}. Returning pool but may need manual verification.`);
      }
      
      // Update projected ROI if pool is active
      if (pool.status === PoolStatus.ACTIVE) {
        try {
          await this.roiCalculationService.updatePoolProjectedROI(poolId);
          // Re-fetch to get updated ROI data
          const updatedPool = await this.amcPoolModel.findOne({ poolId });
          if (updatedPool) {
            return updatedPool;
          }
        } catch (roiError) {
          this.logger.warn(`Failed to update ROI for pool ${poolId}: ${roiError.message}`);
        }
      }
      
      return pool;
    } catch (error) {
      this.logger.error('Failed to get pool by ID:', error);
      throw error;
    }
  }

  /**
   * Delete pool by ID (Admin only)
   */
  async deletePool(poolId: string, adminWallet: string): Promise<void> {
    try {
      // Verify admin has permission
      const adminRole = await this.adminService.checkAdminStatus(adminWallet);
      if (!adminRole.isAmcAdmin && !adminRole.isSuperAdmin && !adminRole.isPlatformAdmin) {
        throw new BadRequestException('Only AMC Admins can delete pools');
      }

      const pool = await this.amcPoolModel.findOne({ poolId });
      if (!pool) {
        throw new NotFoundException('Pool not found');
      }

      await this.amcPoolModel.deleteOne({ poolId });
      this.logger.log(`Pool ${poolId} deleted by ${adminWallet}`);
    } catch (error) {
      this.logger.error('Failed to delete pool:', error);
      throw error;
    }
  }

  /**
   * Get pools by admin
   */
  async getPoolsByAdmin(adminWallet: string): Promise<AMCPool[]> {
    try {
      const pools = await this.amcPoolModel.find({ createdBy: adminWallet }).sort({ createdAt: -1 });
      
      // Update projected ROI for all active pools
      for (const pool of pools) {
        if (pool.status === PoolStatus.ACTIVE) {
          try {
            await this.roiCalculationService.updatePoolProjectedROI(pool.poolId);
          } catch (roiError) {
            this.logger.warn(`Failed to update ROI for pool ${pool.poolId}: ${roiError.message}`);
          }
        }
      }
      
      // Re-fetch to get updated ROI data
      return await this.amcPoolModel.find({ createdBy: adminWallet }).sort({ createdAt: -1 });
    } catch (error) {
      this.logger.error('Failed to get pools by admin:', error);
      throw error;
    }
  }

  /**
   * Get investor's projected ROI for a pool
   * Accepts optional on-chain data as fallback if investment not in database
   */
  async getInvestorProjectedROI(
    poolId: string, 
    investorAddress: string,
    onChainInvestmentData?: {
      amount: number;
      tokens: number;
      investedAt?: Date;
    }
  ) {
    return await this.roiCalculationService.getInvestorProjectedROI(
      poolId, 
      investorAddress, 
      onChainInvestmentData
    );
  }

  /**
   * Invest in pool
   */
  async investInPool(investDto: InvestInPoolDto): Promise<AMCPool> {
    try {
      const pool = await this.amcPoolModel.findOne({ poolId: investDto.poolId });
      if (!pool) {
        throw new NotFoundException('Pool not found');
      }

      if (pool.status !== PoolStatus.ACTIVE) {
        throw new BadRequestException('Pool is not active for investment');
      }

      if (investDto.amount < pool.minimumInvestment) {
        throw new BadRequestException(`Minimum investment is ${pool.minimumInvestment}`);
      }

      // Calculate tokens to receive
      const tokens = Math.floor(investDto.amount / pool.tokenPrice);
      if (tokens === 0) {
        throw new BadRequestException('Investment amount too small');
      }

      // Check if investor already has investment
      const existingInvestment = pool.investments.find(inv => inv.investorAddress === investDto.investorAddress);
      
      if (existingInvestment) {
        // Update existing investment
        existingInvestment.amount += investDto.amount;
        existingInvestment.tokens += tokens;
        existingInvestment.investedAt = new Date();
      } else {
        // Add new investment
        pool.investments.push({
          investorId: investDto.investorAddress, // TODO: Get from user lookup
          investorAddress: investDto.investorAddress,
          amount: investDto.amount,
          tokens: tokens,
          tokenPrice: pool.tokenPrice,
          investedAt: new Date(),
          dividendsReceived: 0,
          isActive: true
        });
      }

      // Update pool totals
      pool.totalInvested += investDto.amount;
      pool.totalInvestors = pool.investments.filter(inv => inv.isActive).length;
      pool.operations.push(`Investment of ${investDto.amount} by ${investDto.investorAddress}`);

      // For Mantle: Investment is handled on-chain via PoolManager contract
      // The frontend should call investInPool or investInTranche directly on the contract
      // This backend function tracks the investment in the database
      if (investDto.transactionHash) {
        pool.operations.push(`Mantle investment transaction: ${investDto.transactionHash}`);
        this.logger.log(`Investment recorded with transaction hash: ${investDto.transactionHash}`);
      } else {
        this.logger.warn('Investment recorded without on-chain transaction hash. Frontend should call contract directly.');
      }

      const updatedPool = await pool.save();
      this.logger.log(`Investment in pool ${investDto.poolId}: ${investDto.amount}`);

      // Update earnings for asset owners
      await this.updateAssetOwnersEarnings(pool, investDto.amount);

      return updatedPool;
    } catch (error) {
      this.logger.error('Failed to invest in pool:', error);
      throw error;
    }
  }

  /**
   * Distribute dividends to pool investors
   */
  async distributeDividend(dividendDto: DistributeDividendDto, adminWallet: string): Promise<AMCPool> {
    try {
      // Verify admin has permission
      const adminRole = await this.adminService.checkAdminStatus(adminWallet);
      if (!adminRole.isAmcAdmin && !adminRole.isSuperAdmin && !adminRole.isPlatformAdmin) {
        throw new BadRequestException('Only AMC Admins can distribute dividends');
      }

      const pool = await this.amcPoolModel.findOne({ poolId: dividendDto.poolId });
      if (!pool) {
        throw new NotFoundException('Pool not found');
      }

      if (pool.status !== PoolStatus.ACTIVE) {
        throw new BadRequestException('Pool is not active for dividend distribution');
      }

      // Calculate dividend per token
      const totalActiveTokens = pool.investments
        .filter(inv => inv.isActive)
        .reduce((sum, inv) => sum + inv.tokens, 0);

      if (totalActiveTokens === 0) {
        throw new BadRequestException('No active token holders to distribute dividends to');
      }

      const dividendPerToken = dividendDto.amount / totalActiveTokens;

      // Update investor dividends
      pool.investments.forEach(investment => {
        if (investment.isActive) {
          const investorDividend = investment.tokens * dividendPerToken;
          investment.dividendsReceived += investorDividend;
        }
      });

      // Add dividend record
      pool.dividends.push({
        amount: dividendDto.amount,
        perToken: dividendPerToken,
        distributedAt: new Date(),
        description: dividendDto.description || 'Dividend distribution',
        transactionHash: '' // Will be updated after Mantle transaction completes
      });

      // Update pool totals
      pool.totalDividendsDistributed += dividendDto.amount;
      pool.operations.push(`Dividend distributed: ${dividendDto.amount} by ${adminWallet}`);

      // Distribute TRUST token dividends ON-CHAIN via Mantle
      try {
        const totalDividendAmount = ethers.parseEther(dividendDto.amount.toString());
        const adminSignerAddress = adminWallet.toLowerCase();
        
        // Get pool treasury address (could be admin wallet or a dedicated treasury)
        // For now, we'll use the admin wallet as the treasury
        const treasuryAddress = adminSignerAddress;
        
        // Check if treasury has enough TRUST tokens
        const treasuryBalance = await this.mantleService.getTrustTokenBalance(treasuryAddress);
        if (treasuryBalance < totalDividendAmount) {
          this.logger.warn(`Treasury balance (${ethers.formatEther(treasuryBalance)} TRUST) is less than dividend amount (${dividendDto.amount} TRUST)`);
          throw new Error('Insufficient TRUST tokens in treasury for dividend distribution');
        }
        
        let txHashes: string[] = [];
        for (const investment of pool.investments) {
          if (investment.isActive) {
            const investorDividend = investment.tokens * dividendPerToken;
            const investorDividendWei = ethers.parseEther(investorDividend.toString());
            
            // Transfer TRUST tokens from treasury to investor
            const transferResult = await this.mantleService.transferTrustTokens(
              treasuryAddress,
              investment.investorAddress.toLowerCase(),
              investorDividendWei
            );
            
            txHashes.push(transferResult.txHash);
            this.logger.log(`Distributed ${investorDividend} TRUST tokens to ${investment.investorAddress}: ${transferResult.txHash}`);
          }
        }
        
        // Update transaction hash (use first transaction hash or combine them)
        pool.dividends[pool.dividends.length - 1].transactionHash = txHashes.length > 0 ? txHashes[0] : '';
        if (txHashes.length > 1) {
          pool.operations.push(`Dividend distribution: ${txHashes.length} transactions (${txHashes.slice(0, 3).join(', ')}${txHashes.length > 3 ? '...' : ''})`);
        }
        
        this.logger.log(`Distributed ${txHashes.length} dividends on-chain via Mantle`);
      } catch (mantleError) {
        this.logger.error('Failed to distribute dividends on Mantle:', mantleError);
        // Don't throw - DB update succeeded, Mantle transfer can be retried
        pool.operations.push(`Dividend distribution failed on-chain: ${mantleError.message}`);
      }

      const updatedPool = await pool.save();
      this.logger.log(`Dividend distributed for pool ${dividendDto.poolId}: ${dividendDto.amount}`);

      return updatedPool;
    } catch (error) {
      this.logger.error('Failed to distribute dividend:', error);
      throw error;
    }
  }

  /**
   * Close pool (stop new investments)
   */
  async closePool(poolId: string, adminWallet: string): Promise<AMCPool> {
    try {
      // Verify admin has permission
      const adminRole = await this.adminService.checkAdminStatus(adminWallet);
      if (!adminRole.isAmcAdmin && !adminRole.isSuperAdmin && !adminRole.isPlatformAdmin) {
        throw new BadRequestException('Only AMC Admins can close pools');
      }

      const pool = await this.amcPoolModel.findOne({ poolId });
      if (!pool) {
        throw new NotFoundException('Pool not found');
      }

      if (pool.status !== PoolStatus.ACTIVE) {
        throw new BadRequestException('Pool is not active');
      }

      pool.status = PoolStatus.CLOSED;
      pool.closedAt = new Date();
      pool.operations.push(`Pool closed by ${adminWallet}`);

      const updatedPool = await pool.save();
      this.logger.log(`Closed AMC pool: ${poolId}`);

      return updatedPool;
    } catch (error) {
      this.logger.error('Failed to close pool:', error);
      throw error;
    }
  }

  /**
   * Get pool performance statistics
   */
  async getPoolStats(poolId: string): Promise<any> {
    try {
      const pool = await this.amcPoolModel.findOne({ poolId });
      if (!pool) {
        throw new NotFoundException('Pool not found');
      }

      const totalInvestments = pool.investments.length;
      const totalInvested = pool.totalInvested;
      const totalDividends = pool.totalDividendsDistributed;
      const averageInvestment = totalInvestments > 0 ? totalInvested / totalInvestments : 0;
      const roi = totalInvested > 0 ? (totalDividends / totalInvested) * 100 : 0;

      return {
        poolId: pool.poolId,
        name: pool.name,
        status: pool.status,
        totalInvestments,
        totalInvested,
        totalDividends,
        averageInvestment,
        roi,
        totalInvestors: pool.totalInvestors,
        currentPrice: pool.currentPrice,
        priceChange24h: pool.priceChange24h,
        tradingVolume: pool.tradingVolume,
        assets: pool.assets.length,
        diversification: pool.metadata.diversification,
        riskLevel: pool.metadata.riskLevel
      };
    } catch (error) {
      this.logger.error('Failed to get pool stats:', error);
      throw error;
    }
  }

  /**
   * Validate pool assets exist and are approved (ACTIVE_AMC_MANAGED status)
   */
  private async validatePoolAssets(assets: any[]): Promise<void> {
    this.logger.log('Validating pool assets...');
    
    if (!assets || assets.length === 0) {
      throw new BadRequestException('Pool must contain at least one asset');
    }

    // Validate each asset from blockchain (source of truth)
    for (const poolAsset of assets) {
      this.logger.log(`Validating asset on blockchain: ${poolAsset.assetId}`);
      
      try {
        // Check asset exists on blockchain (Mantle) - PRIMARY SOURCE OF TRUTH
        this.logger.log(`🔍 Validating asset ${poolAsset.assetId} on blockchain...`);
        this.logger.log(`   Asset ID format: ${poolAsset.assetId.length} chars, starts with 0x: ${poolAsset.assetId.startsWith('0x')}`);
        
        const onChainAsset = await this.mantleService.getAsset(poolAsset.assetId);
        
        if (!onChainAsset) {
          throw new BadRequestException(`Asset ${poolAsset.assetId} not found on blockchain`);
        }
        
        // Verify asset ID matches (if asset ID is zero/empty, asset doesn't exist)
        const assetIdFromResult = onChainAsset.id || onChainAsset.assetId;
        if (!assetIdFromResult || assetIdFromResult === ethers.ZeroHash || assetIdFromResult === '0x0000000000000000000000000000000000000000000000000000000000000000') {
          this.logger.error(`❌ Asset ${poolAsset.assetId} lookup returned empty/zero asset ID. Asset does not exist on blockchain.`);
          this.logger.error(`   Requested ID: ${poolAsset.assetId}`);
          this.logger.error(`   Returned ID: ${assetIdFromResult}`);
          throw new BadRequestException(`Asset ${poolAsset.assetId} not found on blockchain. Asset ID from contract is zero/empty.`);
        }
        
        this.logger.log(`✅ Asset ${poolAsset.assetId} found on blockchain: name=${onChainAsset.name}, id=${assetIdFromResult}`);
        this.logger.log(`   Asset status (raw): ${onChainAsset.status}, type: ${typeof onChainAsset.status}`);

        // For Mantle: Assets must be in ACTIVE_AMC_MANAGED status (status 6) to be pooled
        // This means they've completed: verification → inspection → legal transfer → activation
        const validStatuses = [6]; // ACTIVE_AMC_MANAGED
        
        // Convert status to number, handling all possible types
        let assetStatus: number;
        if (typeof onChainAsset.status === 'number' && !isNaN(onChainAsset.status)) {
          assetStatus = onChainAsset.status;
          this.logger.log(`   Status extracted as number: ${assetStatus}`);
        } else if (typeof onChainAsset.status === 'bigint') {
          assetStatus = Number(onChainAsset.status);
          this.logger.log(`   Status extracted from bigint: ${onChainAsset.status} -> ${assetStatus}`);
        } else if (typeof onChainAsset.status === 'string') {
          assetStatus = parseInt(onChainAsset.status, 10);
          this.logger.log(`   Status extracted from string: "${onChainAsset.status}" -> ${assetStatus}`);
        } else {
          this.logger.error(`❌ Asset ${poolAsset.assetId} has invalid status type: ${typeof onChainAsset.status}, value: ${onChainAsset.status}`);
          this.logger.error(`   Full asset object keys: ${Object.keys(onChainAsset).join(', ')}`);
          this.logger.error(`   Asset name: ${onChainAsset.name}`);
          this.logger.error(`   Asset ID from result: ${assetIdFromResult}`);
          this.logger.error(`   Full asset object (first 500 chars): ${JSON.stringify(onChainAsset, null, 2).substring(0, 500)}`);
          throw new BadRequestException(
            `Asset ${poolAsset.assetId} has invalid on-chain status (${onChainAsset.status}). ` +
            `Could not determine asset status from blockchain. Status type: ${typeof onChainAsset.status}. ` +
            `Please check backend logs for details.`
          );
        }
        
        if (isNaN(assetStatus)) {
          this.logger.error(`❌ Asset ${poolAsset.assetId} status is NaN after conversion`);
          this.logger.error(`   Raw status value: ${onChainAsset.status}, type: ${typeof onChainAsset.status}`);
          this.logger.error(`   Asset ID from result: ${assetIdFromResult}`);
          throw new BadRequestException(
            `Asset ${poolAsset.assetId} has invalid on-chain status. ` +
            `Status could not be determined from blockchain (NaN). ` +
            `Raw value: ${onChainAsset.status}, type: ${typeof onChainAsset.status}. ` +
            `Please check backend logs for details.`
          );
        }
        
        this.logger.log(`   Final asset status: ${assetStatus} (expected: ${validStatuses.join(' or ')})`);
        
        if (!validStatuses.includes(assetStatus)) {
          this.logger.error(`❌ Asset ${poolAsset.assetId} on-chain status is ${assetStatus}, expected ${validStatuses.join(' or ')}`);
          this.logger.error(`   Asset name: ${onChainAsset.name}`);
          this.logger.error(`   Asset ID: ${assetIdFromResult}`);
          this.logger.error(`   Status names: 0=PENDING_VERIFICATION, 1=VERIFIED_PENDING_AMC, 2=AMC_INSPECTION_SCHEDULED, 3=AMC_INSPECTION_COMPLETED, 4=LEGAL_TRANSFER_PENDING, 5=LEGAL_TRANSFER_COMPLETED, 6=ACTIVE_AMC_MANAGED`);
          throw new BadRequestException(
            `Asset ${poolAsset.assetId} is not ready for pooling. On-chain status: ${assetStatus}. ` +
            `Asset must be ACTIVE_AMC_MANAGED (status 6) to be added to a pool. ` +
            `Current status: ${assetStatus === 0 ? 'PENDING_VERIFICATION' : assetStatus === 3 ? 'AMC_INSPECTION_COMPLETED' : assetStatus === 4 ? 'LEGAL_TRANSFER_PENDING' : assetStatus === 5 ? 'LEGAL_TRANSFER_COMPLETED' : `UNKNOWN(${assetStatus})`}. ` +
            `Please complete the AMC workflow: inspection → legal transfer → activation.`
          );
        }

        this.logger.log(`✅ Asset ${poolAsset.assetId} validated on blockchain (status: ${assetStatus})`);
      } catch (blockchainError) {
        // If blockchain check fails, throw the error (blockchain is source of truth)
        if (blockchainError instanceof BadRequestException) {
          throw blockchainError;
        }
        this.logger.error(`Failed to validate asset ${poolAsset.assetId} on blockchain: ${blockchainError.message}`);
        throw new BadRequestException(`Asset ${poolAsset.assetId} validation failed on blockchain: ${blockchainError.message}`);
      }

      // Check if asset is already in another active pool
      const existingPool = await this.amcPoolModel.findOne({
        'assets.assetId': poolAsset.assetId,
        status: { $in: ['ACTIVE', 'DRAFT'] }
      });

      if (existingPool && existingPool.poolId !== poolAsset.poolId) {
        throw new BadRequestException(`Asset ${poolAsset.assetId} is already in pool ${existingPool.poolId}`);
      }

      // Validate asset value is reasonable
      if (poolAsset.value <= 0) {
        throw new BadRequestException(`Asset ${poolAsset.assetId} must have a positive value`);
      }
    }

    this.logger.log(`Validated ${assets.length} assets for pool creation`);
  }

  /**
   * Update earnings for asset owners when investment is made
   */
  private async updateAssetOwnersEarnings(pool: AMCPool, investmentAmount: number): Promise<void> {
    try {
      // Distribute earnings proportionally to each asset in the pool
      for (const poolAsset of pool.assets) {
        // Calculate this asset's share of the earnings
        const assetPercentage = poolAsset.percentage / 100;
        const earningsForAsset = investmentAmount * assetPercentage;

        // Find the asset and update owner's earnings
        const asset = await this.assetModel.findOne({ assetId: poolAsset.assetId });
        if (asset) {
          asset.earnings = (asset.earnings || 0) + earningsForAsset;
          await asset.save();
          this.logger.log(`Updated earnings for asset ${poolAsset.assetId}: +${earningsForAsset}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to update asset owner earnings:', error);
      // Don't throw - investment should still succeed even if earnings update fails
    }
  }
}

