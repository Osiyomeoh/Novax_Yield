/**
 * Hybrid Asset Service
 * Efficiently retrieves assets by:
 * 1. Getting asset IDs from database (fast lookup)
 * 2. Fetching specific assets from blockchain (targeted queries)
 * 3. Avoiding expensive event queries
 */

import { ethers } from 'ethers';
import { apiService } from './api-blockchain-first';
import { mantleContractService } from './mantleContractService';
import { assetCacheService } from './assetCacheService';
import { getContractAddress } from '../config/contracts';

interface AssetIdRecord {
  assetId: string;
  tokenId?: string;
  owner: string;
  createdAt?: string;
}

interface HybridAssetResult {
  assets: any[];
  source: 'database' | 'blockchain' | 'cache' | 'hybrid';
  cached: boolean;
}

class HybridAssetService {
  /**
   * Get user assets using hybrid approach:
   * 1. Try database first (fast, indexed lookup)
   * 2. Fetch specific assets from blockchain (targeted queries)
   * 3. Fallback to event queries only if needed
   */
  async getUserAssets(userAddress: string, options: {
    useCache?: boolean;
    useDatabase?: boolean;
    fallbackToEvents?: boolean;
  } = {}): Promise<HybridAssetResult> {
    const {
      useCache = false, // Default to false - don't rely on cache
      useDatabase = true,
      fallbackToEvents = true
    } = options;

    // Step 1: Check cache ONLY if explicitly enabled (optimization, not requirement)
    // Cache is optional - we don't rely on it for correctness
    if (useCache) {
      try {
        const cachedAssets = await assetCacheService.getCachedAssets(userAddress);
        if (cachedAssets && cachedAssets.length > 0) {
          console.log(`⚡ Using ${cachedAssets.length} cached assets (optimization only)`);
          
          // Background refresh: Always fetch fresh data in background
          // This ensures we have fresh data even when showing cached data
          setTimeout(async () => {
            try {
              console.log('🔄 Background refresh: Fetching fresh data...');
              const freshResult = await this.getUserAssets(userAddress, {
                useCache: false, // Skip cache for refresh
                useDatabase: true,
                fallbackToEvents: true
              });
              
              if (freshResult.assets.length > 0) {
                console.log(`✅ Background refresh complete: ${freshResult.assets.length} assets`);
              }
            } catch (error: any) {
              console.warn('⚠️ Background refresh failed (non-critical):', error.message);
            }
          }, 500); // Start refresh immediately
          
          return {
            assets: cachedAssets,
            source: 'cache',
            cached: true
          };
        }
      } catch (cacheError: any) {
        // Cache error shouldn't block - continue to database/blockchain
        console.warn('⚠️ Cache check failed, continuing to database/blockchain:', cacheError.message);
      }
    }

    // Step 2: Get asset IDs from database (fast lookup)
    let assetIds: AssetIdRecord[] = [];
    
    if (useDatabase) {
      try {
        console.log('📊 Fetching asset IDs from database for address:', userAddress);
        const response = await apiService.get(`/assets/owner/${userAddress}`);
        
        console.log('📊 Database response:', {
          success: response?.success,
          hasData: !!response?.data,
          dataType: Array.isArray(response?.data) ? 'array' : typeof response?.data,
          dataLength: response?.data?.length,
          firstItem: response?.data?.[0]
        });
        
        if (response && response.data && Array.isArray(response.data)) {
          assetIds = response.data.map((asset: any) => ({
            assetId: asset.assetId || asset._id,
            tokenId: asset.tokenId,
            owner: asset.owner,
            createdAt: asset.createdAt
          }));
          console.log(`✅ Found ${assetIds.length} asset IDs in database:`, assetIds.map(a => a.assetId));
        } else if (response && response.data && response.data.length === 0) {
          console.log('📊 Database returned empty array (no assets for this owner)');
        } else {
          console.log('📊 Database returned no assets or invalid format:', response);
        }
      } catch (error: any) {
        console.warn('⚠️ Database lookup failed, will use blockchain:', error.message);
        console.warn('⚠️ Error details:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        // Continue to blockchain fallback
      }
    }

    // Step 3: Fetch specific assets from blockchain using asset IDs
    const assets: any[] = [];
    
    if (assetIds.length > 0) {
      console.log(`🔗 Fetching ${assetIds.length} specific assets from blockchain...`);
      
      // Fetch assets in parallel (but limit concurrency to avoid rate limits)
      const batchSize = 5;
      for (let i = 0; i < assetIds.length; i += batchSize) {
        const batch = assetIds.slice(i, i + batchSize);
        const batchPromises = batch.map(async (record) => {
          try {
            // Try to get asset by assetId from factory contract
            const asset = await mantleContractService.getAsset(record.assetId);
            
            if (asset) {
              // Normalize IPFS image URI using utility function
              const { normalizeIPFSUrl } = await import('../utils/imageUtils');
              let normalizedImageURI = asset.imageURI || '';
              
              if (normalizedImageURI) {
                const normalized = normalizeIPFSUrl(normalizedImageURI);
                if (normalized) {
                  normalizedImageURI = normalized;
                  console.log(`✅ Normalized image URI for ${record.assetId}:`, normalizedImageURI);
                } else {
                  console.warn(`⚠️ Failed to normalize image URI for ${record.assetId} (might be test value):`, normalizedImageURI);
                  normalizedImageURI = ''; // Clear invalid image URI
                }
              }
              
              // Normalize document URI as well
              let normalizedDocumentURI = asset.documentURI || '';
              if (normalizedDocumentURI) {
                const normalized = normalizeIPFSUrl(normalizedDocumentURI);
                if (normalized) {
                  normalizedDocumentURI = normalized;
                } else {
                  console.warn(`⚠️ Failed to normalize document URI for ${record.assetId}:`, normalizedDocumentURI);
                  normalizedDocumentURI = ''; // Clear invalid document URI
                }
              }
              
              return {
                assetId: record.assetId,
                tokenId: record.tokenId || asset.tokenId?.toString(),
                name: asset.name || '',
                description: asset.description || '',
                imageURI: normalizedImageURI,
                displayImage: normalizedImageURI, // Also set displayImage for compatibility
                documentURI: normalizedDocumentURI,
                location: asset.location || '',
                totalValue: asset.totalValue?.toString() || '0',
                maturityDate: asset.maturityDate?.toString() || '0',
                assetType: asset.assetTypeString || 'RWA',
                owner: asset.currentOwner || asset.originalOwner || record.owner,
                status: asset.status,
                createdAt: asset.createdAt?.toString() || record.createdAt || Date.now().toString(),
                metadata: {
                  assetType: asset.assetTypeString || 'RWA',
                  type: 'rwa',
                  category: 'RWA',
                  name: asset.name || '',
                  description: asset.description || '',
                  image: normalizedImageURI,
                  imageURI: normalizedImageURI,
                  price: asset.totalValue?.toString() || '0',
                  totalValue: asset.totalValue?.toString() || '0'
                }
              };
            }
          } catch (error: any) {
            console.warn(`⚠️ Failed to fetch asset ${record.assetId}:`, error.message);
            // Return a minimal asset record if blockchain fetch fails
            return {
              assetId: record.assetId,
              tokenId: record.tokenId,
              owner: record.owner,
              createdAt: record.createdAt,
              name: `Asset ${record.assetId.slice(0, 8)}`,
              description: 'Asset details unavailable',
              totalValue: '0',
              status: 0,
              metadata: {
                assetType: 'RWA',
                type: 'rwa',
                category: 'RWA'
              }
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        assets.push(...batchResults.filter(Boolean));
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < assetIds.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`✅ Fetched ${assets.length} assets from blockchain using database IDs`);
      
      // Cache the results (optional optimization, not required)
      if (useCache && assets.length > 0) {
        try {
          await assetCacheService.cacheAssets(userAddress, assets);
          console.log('✅ Assets cached for future optimization');
        } catch (cacheError: any) {
          // Cache failure is non-critical - data is still returned
          console.warn('⚠️ Failed to cache assets (non-critical):', cacheError.message);
        }
      }
      
      if (assets.length > 0) {
        return {
          assets,
          source: 'hybrid',
          cached: false
        };
      } else {
        console.log('⚠️ Database had asset IDs but blockchain fetch returned 0 assets');
        console.log('⚠️ This might mean assets were deleted or contract address is wrong');
        console.log('⚠️ Falling back to event queries...');
        // Continue to event queries fallback below
      }
    } else {
      console.log('📊 No asset IDs found in database, will use blockchain event queries');
    }

    // Step 4: Fallback to event queries if database had no results
    if (fallbackToEvents) {
      console.log('📡 Database had no results or empty, falling back to blockchain event queries...');
      console.log('📡 This will query blockchain events to find assets created by this address');
      try {
        console.log('📡 Step 1: Querying Factory contract for assets...');
        const factoryAssets = await mantleContractService.getUserAssetsFromFactory(userAddress);
        console.log(`📡 Found ${factoryAssets.length} assets from Factory contract`);
        
        console.log('📡 Step 2: Querying AssetNFT contract for NFTs...');
        const nftAssets = await mantleContractService.getUserAssets(userAddress);
        console.log(`📡 Found ${nftAssets.length} NFTs from AssetNFT contract`);
        
        // Combine and deduplicate
        const allAssets = [...factoryAssets];
        const existingAssetIds = new Set(factoryAssets.map((a: any) => a.assetId || a.tokenId));
        
        console.log(`📦 Combining assets: ${factoryAssets.length} from Factory, ${nftAssets.length} from AssetNFT`);
        
        for (const nft of nftAssets) {
          if (!existingAssetIds.has(nft.tokenId)) {
            allAssets.push({
              ...nft,
              assetId: nft.tokenId
            });
          }
        }
        
        console.log(`✅ Total unique assets from blockchain events: ${allAssets.length}`);
        
        if (allAssets.length > 0) {
          console.log('📦 Sample asset from event queries:', {
            assetId: allAssets[0].assetId,
            name: allAssets[0].name,
            imageURI: allAssets[0].imageURI,
            totalValue: allAssets[0].totalValue
          });
        } else {
          console.warn('⚠️ No assets found via event queries either');
          console.warn('⚠️ Possible reasons:');
          console.warn('   1. No assets were created with this address');
          console.warn('   2. Assets were created on a different network');
          console.warn('   3. Contract addresses are incorrect');
          console.warn('   4. RPC endpoint is having issues');
          console.warn(`⚠️ Address being queried: ${userAddress}`);
          console.warn('⚠️ Please verify:');
          console.warn('   - Factory contract:', getContractAddress('CORE_ASSET_FACTORY'));
          console.warn('   - Network: Mantle Sepolia (Chain ID: 5001)');
          console.warn('   - RPC URL: https://rpc.sepolia.mantle.xyz');
        }
        
        // Cache the results (optional optimization)
        if (useCache && allAssets.length > 0) {
          try {
            await assetCacheService.cacheAssets(userAddress, allAssets);
            console.log('✅ Assets cached from event queries (optimization)');
          } catch (cacheError: any) {
            console.warn('⚠️ Failed to cache assets (non-critical):', cacheError.message);
          }
        }
        
        // If we found assets via events but database was empty, sync them to database
        if (allAssets.length > 0 && useDatabase) {
          console.log('🔄 Syncing discovered assets to database for future fast lookups...');
          this.syncDiscoveredAssetsToDatabase(userAddress, allAssets).catch((error: any) => {
            console.warn('⚠️ Failed to sync assets to database (non-critical):', error.message);
          });
        }
        
        return {
          assets: allAssets,
          source: 'blockchain',
          cached: false
        };
      } catch (error: any) {
        console.error('❌ Fallback to blockchain events also failed:', error);
        
        // Don't rely on stale cache - return empty and let user retry
        // Cache is optimization only, not a fallback for correctness
        console.warn('⚠️ All data sources failed. User should retry or check network connection.');
        return {
          assets: [],
          source: 'blockchain',
          cached: false
        };
      }
    }

    return {
      assets: [],
      source: 'database',
      cached: false
    };
  }

  /**
   * Sync discovered assets to database (when found via events but not in database)
   */
  private async syncDiscoveredAssetsToDatabase(userAddress: string, assets: any[]): Promise<void> {
    // Sync each asset to database (non-blocking, fire-and-forget)
    const syncPromises = assets.map(async (asset) => {
      try {
        await this.syncAssetToDatabase({
          assetId: asset.assetId || asset.tokenId,
          tokenId: asset.tokenId,
          owner: asset.owner || userAddress,
          blockchainAddress: getContractAddress('CORE_ASSET_FACTORY'),
          type: asset.assetType === 'RWA' ? 'RWA' : 'DIGITAL',
          category: asset.assetType || 'RWA',
          name: asset.name || `Asset ${(asset.assetId || asset.tokenId).slice(0, 8)}`,
          imageHash: asset.imageURI,
          documentHash: asset.documentURI
        });
      } catch (error) {
        // Ignore individual sync failures
        console.warn(`⚠️ Failed to sync asset ${asset.assetId} to database:`, error);
      }
    });
    
    await Promise.allSettled(syncPromises);
    console.log(`✅ Synced ${assets.length} discovered assets to database`);
  }

  /**
   * Get a single asset by ID (uses database lookup first, then blockchain)
   */
  async getAssetById(assetId: string): Promise<any | null> {
    try {
      // Try database first
      try {
        const response = await apiService.getAssetMetadata(assetId);
        if (response && response.assetId) {
          // Fetch full details from blockchain
          const blockchainAsset = await mantleContractService.getAsset(assetId);
          if (blockchainAsset) {
            return {
              ...blockchainAsset,
              assetId,
              metadata: response
            };
          }
        }
      } catch (dbError) {
        // Database lookup failed, try blockchain directly
      }

      // Fallback to blockchain only
      return await mantleContractService.getAsset(assetId);
    } catch (error: any) {
      console.error(`❌ Failed to get asset ${assetId}:`, error);
      return null;
    }
  }

  /**
   * Sync asset IDs to database (called after asset creation)
   * This ensures the database has the asset ID for future fast lookups
   */
  async syncAssetToDatabase(assetData: {
    assetId: string;
    tokenId?: string;
    owner: string;
    blockchainAddress: string;
    type: 'DIGITAL' | 'RWA';
    category: string;
    name: string;
    imageHash?: string;
    documentHash?: string;
  }): Promise<boolean> {
    try {
      await apiService.storeAssetMetadata(assetData);
      console.log(`✅ Synced asset ${assetData.assetId} to database`);
      return true;
    } catch (error: any) {
      // Silently ignore 404 errors - endpoint might not exist yet (non-critical)
      if (error.response?.status !== 404) {
        console.warn(`⚠️ Failed to sync asset to database (non-critical):`, error.message);
      }
      return false;
    }
  }

  /**
   * Get asset IDs only (lightweight, fast)
   * Useful for displaying counts or lists without full details
   */
  async getAssetIds(userAddress: string): Promise<string[]> {
    try {
      const response = await apiService.get(`/assets/owner/${userAddress}`);
      if (response.data && Array.isArray(response.data)) {
        return response.data
          .map((asset: any) => asset.assetId || asset._id)
          .filter(Boolean);
      }
      return [];
    } catch (error: any) {
      console.warn('⚠️ Failed to get asset IDs from database:', error.message);
      return [];
    }
  }
}

// Export singleton instance
export const hybridAssetService = new HybridAssetService();

// Export class for testing
export { HybridAssetService };

