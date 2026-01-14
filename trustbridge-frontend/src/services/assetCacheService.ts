/**
 * Asset Cache Service
 * Efficiently caches blockchain asset data and IPFS content to reduce redundant queries
 */

interface CachedAsset {
  assetId: string;
  tokenId: string;
  data: any;
  timestamp: number;
  blockNumber?: number;
  ipfsCache?: {
    imageURI?: string;
    documentURI?: string;
    imageBlob?: string; // Base64 encoded for small images
    metadata?: any;
  };
}

interface CacheConfig {
  blockchainCacheTTL: number; // Time to live for blockchain data (ms)
  ipfsCacheTTL: number; // Time to live for IPFS content (ms)
  maxCacheSize: number; // Maximum number of cached assets
}

const DEFAULT_CONFIG: CacheConfig = {
  blockchainCacheTTL: 5 * 60 * 1000, // 5 minutes for blockchain data
  ipfsCacheTTL: 24 * 60 * 60 * 1000, // 24 hours for IPFS content (rarely changes)
  maxCacheSize: 1000
};

class AssetCacheService {
  private config: CacheConfig;
  private dbName = 'TrustBridgeAssetCache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initDB();
  }

  /**
   * Initialize IndexedDB for persistent caching
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.warn('⚠️ IndexedDB not available, using localStorage fallback');
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Asset cache database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('assets')) {
          const assetStore = db.createObjectStore('assets', { keyPath: 'assetId' });
          assetStore.createIndex('timestamp', 'timestamp', { unique: false });
          assetStore.createIndex('owner', 'data.owner', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('ipfs')) {
          const ipfsStore = db.createObjectStore('ipfs', { keyPath: 'cid' });
          ipfsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Get cached assets for a user address
   */
  async getCachedAssets(userAddress: string): Promise<CachedAsset[] | null> {
    try {
      if (this.db) {
        // Use IndexedDB
        return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction(['assets'], 'readonly');
          const store = transaction.objectStore('assets');
          const index = store.index('owner');
          const request = index.getAll(userAddress.toLowerCase());

          request.onsuccess = () => {
            const assets = request.result
              .filter((asset: CachedAsset) => {
                const age = Date.now() - asset.timestamp;
                const isValid = age < this.config.blockchainCacheTTL;
                if (!isValid) {
                  console.log(`🔄 Cache expired for asset ${asset.assetId} (age: ${Math.round(age / 1000)}s)`);
                }
                return isValid;
              })
              .map((asset: CachedAsset) => {
                // Ensure imageURI is preserved from cache
                const cachedAsset = asset.data;
                console.log(`📦 Retrieved cached asset: ${cachedAsset.name || cachedAsset.assetId}`);
                console.log(`📦   imageURI from cache: ${cachedAsset.imageURI || '❌ EMPTY'}`);
                console.log(`📦   displayImage from cache: ${cachedAsset.displayImage || '❌ EMPTY'}`);
                console.log(`📦   documentURI from cache: ${cachedAsset.documentURI || '❌ EMPTY'}`);
                return cachedAsset;
              });
            
            console.log(`📦 Retrieved ${assets.length} valid cached assets from IndexedDB (out of ${request.result.length} total)`);
            console.log(`📦 ========== CACHED ASSETS IMAGE CHECK ==========`);
            assets.forEach((asset, index) => {
              console.log(`📦 Cached Asset ${index + 1}/${assets.length}: ${asset.name || asset.assetId}`);
              console.log(`📦   imageURI: ${asset.imageURI || '❌ EMPTY'}`);
              console.log(`📦   displayImage: ${asset.displayImage || '❌ EMPTY'}`);
              console.log(`📦   Has imageURI: ${!!asset.imageURI}`);
            });
            console.log(`📦 ========== END CACHED ASSETS CHECK ==========`);
            resolve(assets.length > 0 ? assets : null);
          };

          request.onerror = () => {
            console.warn('⚠️ IndexedDB read error, falling back to localStorage');
            resolve(this.getCachedAssetsFromLocalStorage(userAddress));
          };
        });
      } else {
        // Fallback to localStorage
        return this.getCachedAssetsFromLocalStorage(userAddress);
      }
    } catch (error) {
      console.error('❌ Error getting cached assets:', error);
      return null;
    }
  }

  /**
   * Fallback to localStorage
   */
  private getCachedAssetsFromLocalStorage(userAddress: string): CachedAsset[] | null {
    try {
      const cacheKey = `cached_assets_${userAddress.toLowerCase()}`;
      const timestampKey = `${cacheKey}_timestamp`;
      
      const cachedData = localStorage.getItem(cacheKey);
      const timestamp = localStorage.getItem(timestampKey);
      
      if (!cachedData || !timestamp) {
        return null;
      }

      const age = Date.now() - parseInt(timestamp, 10);
      if (age > this.config.blockchainCacheTTL) {
        console.log('🔄 Cache expired, removing old data');
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(timestampKey);
        return null;
      }

      const assets = JSON.parse(cachedData);
      console.log(`✅ Retrieved ${assets.length} cached assets from localStorage (age: ${Math.round(age / 1000)}s)`);
      return assets;
    } catch (error) {
      console.error('❌ Error reading from localStorage:', error);
      return null;
    }
  }

  /**
   * Get cached assets synchronously from localStorage (for immediate display)
   * This prevents showing 0 assets during async IndexedDB load
   */
  getCachedAssetsSync(userAddress: string): any[] | null {
    try {
      const cacheKey = `cached_assets_${userAddress.toLowerCase()}`;
      const timestampKey = `${cacheKey}_timestamp`;
      
      const cachedData = localStorage.getItem(cacheKey);
      const timestamp = localStorage.getItem(timestampKey);
      
      if (!cachedData || !timestamp) {
        return null;
      }

      const age = Date.now() - parseInt(timestamp, 10);
      if (age > this.config.blockchainCacheTTL) {
        return null; // Expired, but don't remove here (let async version handle it)
      }

      const assets = JSON.parse(cachedData);
      console.log(`📦 ========== RETRIEVING CACHED ASSETS (SYNC) ==========`);
      console.log(`⚡ Retrieved ${assets.length} cached assets synchronously from localStorage`);
      console.log(`📦 ========== SYNC CACHED ASSETS IMAGE CHECK ==========`);
      assets.forEach((asset: any, index: number) => {
        console.log(`📦 Cached Asset ${index + 1}/${assets.length}: ${asset.name || asset.assetId}`);
        console.log(`📦   imageURI: ${asset.imageURI || '❌ EMPTY'}`);
        console.log(`📦   displayImage: ${asset.displayImage || '❌ EMPTY'}`);
        console.log(`📦   documentURI: ${asset.documentURI || '❌ EMPTY'}`);
        console.log(`📦   Has imageURI: ${!!asset.imageURI}`);
      });
      console.log(`📦 ========== END SYNC CACHED ASSETS CHECK ==========`);
      return assets;
    } catch (error) {
      console.error('❌ Error reading from localStorage (sync):', error);
      return null;
    }
  }

  /**
   * Cache assets for a user address
   */
  async cacheAssets(userAddress: string, assets: any[]): Promise<void> {
    try {
      const timestamp = Date.now();
      console.log(`💾 ========== CACHING ASSETS ==========`);
      console.log(`💾 Caching ${assets.length} assets for ${userAddress}`);
      
      // Log imageURI for each asset being cached
      assets.forEach((asset, index) => {
        console.log(`💾 Asset ${index + 1}/${assets.length}: ${asset.name || asset.assetId}`);
        console.log(`💾   imageURI: ${asset.imageURI || '❌ EMPTY'}`);
        console.log(`💾   displayImage: ${asset.displayImage || '❌ EMPTY'}`);
        console.log(`💾   documentURI: ${asset.documentURI || '❌ EMPTY'}`);
      });
      
      const cachedAssets: CachedAsset[] = assets.map(asset => ({
        assetId: asset.assetId || asset.tokenId,
        tokenId: asset.tokenId || asset.assetId,
        data: {
          ...asset,
          owner: userAddress.toLowerCase() // Store owner in data for index lookup
        },
        timestamp
      }));
      
      console.log(`💾 ========== END CACHING ASSETS ==========`);

      if (this.db) {
        // Use IndexedDB
        return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction(['assets'], 'readwrite');
          const store = transaction.objectStore('assets');

          // Remove old assets for this user
          const index = store.index('owner');
          const deleteRequest = index.openKeyCursor(IDBKeyRange.only(userAddress.toLowerCase()));
          
          deleteRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              store.delete(cursor.primaryKey);
              cursor.continue();
            } else {
              // Add new assets (owner is already in data.owner from mapping above)
              cachedAssets.forEach(asset => {
                store.put(asset);
              });
              console.log(`✅ Cached ${cachedAssets.length} assets in IndexedDB for owner ${userAddress}`);
              resolve();
            }
          };

          deleteRequest.onerror = () => {
            console.warn('⚠️ IndexedDB write error, falling back to localStorage');
            this.cacheAssetsInLocalStorage(userAddress, assets, timestamp);
            resolve();
          };
        });
      } else {
        // Fallback to localStorage
        this.cacheAssetsInLocalStorage(userAddress, assets, timestamp);
      }
    } catch (error) {
      console.error('❌ Error caching assets:', error);
    }
  }

  /**
   * Fallback to localStorage
   */
  private cacheAssetsInLocalStorage(userAddress: string, assets: any[], timestamp: number): void {
    try {
      const cacheKey = `cached_assets_${userAddress.toLowerCase()}`;
      const timestampKey = `${cacheKey}_timestamp`;
      
      localStorage.setItem(cacheKey, JSON.stringify(assets));
      localStorage.setItem(timestampKey, timestamp.toString());
      
      console.log(`✅ Cached ${assets.length} assets in localStorage`);
    } catch (error) {
      console.error('❌ Error writing to localStorage:', error);
    }
  }

  /**
   * Get cached IPFS content
   */
  async getCachedIPFS(cid: string): Promise<any | null> {
    try {
      if (this.db) {
        return new Promise((resolve) => {
          const transaction = this.db!.transaction(['ipfs'], 'readonly');
          const store = transaction.objectStore('ipfs');
          const request = store.get(cid);

          request.onsuccess = () => {
            const cached = request.result;
            if (cached) {
              const age = Date.now() - cached.timestamp;
              if (age < this.config.ipfsCacheTTL) {
                console.log(`✅ Retrieved cached IPFS content for ${cid.slice(0, 8)}...`);
                resolve(cached.data);
              } else {
                // Expired, remove it
                const deleteTransaction = this.db!.transaction(['ipfs'], 'readwrite');
                deleteTransaction.objectStore('ipfs').delete(cid);
                resolve(null);
              }
            } else {
              resolve(null);
            }
          };

          request.onerror = () => {
            resolve(this.getCachedIPFSFromLocalStorage(cid));
          };
        });
      } else {
        return this.getCachedIPFSFromLocalStorage(cid);
      }
    } catch (error) {
      console.error('❌ Error getting cached IPFS:', error);
      return null;
    }
  }

  /**
   * Fallback to localStorage for IPFS
   */
  private getCachedIPFSFromLocalStorage(cid: string): any | null {
    try {
      const cacheKey = `ipfs_${cid}`;
      const timestampKey = `ipfs_${cid}_timestamp`;
      
      const cachedData = localStorage.getItem(cacheKey);
      const timestamp = localStorage.getItem(timestampKey);
      
      if (!cachedData || !timestamp) {
        return null;
      }

      const age = Date.now() - parseInt(timestamp, 10);
      if (age > this.config.ipfsCacheTTL) {
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(timestampKey);
        return null;
      }

      return JSON.parse(cachedData);
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache IPFS content
   */
  async cacheIPFS(cid: string, data: any): Promise<void> {
    try {
      const timestamp = Date.now();

      if (this.db) {
        return new Promise((resolve) => {
          const transaction = this.db!.transaction(['ipfs'], 'readwrite');
          const store = transaction.objectStore('ipfs');
          store.put({ cid, data, timestamp });
          console.log(`✅ Cached IPFS content for ${cid.slice(0, 8)}...`);
          resolve();
        });
      } else {
        // Fallback to localStorage
        const cacheKey = `ipfs_${cid}`;
        const timestampKey = `ipfs_${cid}_timestamp`;
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(timestampKey, timestamp.toString());
      }
    } catch (error) {
      console.error('❌ Error caching IPFS:', error);
    }
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid(userAddress: string): boolean {
    try {
      const cacheKey = `cached_assets_${userAddress.toLowerCase()}`;
      const timestampKey = `${cacheKey}_timestamp`;
      
      const timestamp = localStorage.getItem(timestampKey);
      if (!timestamp) {
        return false;
      }

      const age = Date.now() - parseInt(timestamp, 10);
      return age < this.config.blockchainCacheTTL;
    } catch {
      return false;
    }
  }

  /**
   * Clear cache for a user
   */
  async clearCache(userAddress: string): Promise<void> {
    try {
      if (this.db) {
        return new Promise((resolve) => {
          const transaction = this.db!.transaction(['assets'], 'readwrite');
          const store = transaction.objectStore('assets');
          const index = store.index('owner');
          const request = index.openKeyCursor(IDBKeyRange.only(userAddress.toLowerCase()));

          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              store.delete(cursor.primaryKey);
              cursor.continue();
            } else {
              console.log('✅ Cleared cache for user');
              resolve();
            }
          };

          request.onerror = () => {
            this.clearCacheFromLocalStorage(userAddress);
            resolve();
          };
        });
      } else {
        this.clearCacheFromLocalStorage(userAddress);
      }
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }

  /**
   * Clear cache from localStorage
   */
  private clearCacheFromLocalStorage(userAddress: string): void {
    const cacheKey = `cached_assets_${userAddress.toLowerCase()}`;
    const timestampKey = `${cacheKey}_timestamp`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(timestampKey);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ assetCount: number; ipfsCount: number; size: number }> {
    try {
      if (this.db) {
        return new Promise((resolve) => {
          const assetTransaction = this.db!.transaction(['assets'], 'readonly');
          const assetStore = assetTransaction.objectStore('assets');
          const assetCountRequest = assetStore.count();

          const ipfsTransaction = this.db!.transaction(['ipfs'], 'readonly');
          const ipfsStore = ipfsTransaction.objectStore('ipfs');
          const ipfsCountRequest = ipfsStore.count();

          Promise.all([
            new Promise<number>((res) => {
              assetCountRequest.onsuccess = () => res(assetCountRequest.result);
              assetCountRequest.onerror = () => res(0);
            }),
            new Promise<number>((res) => {
              ipfsCountRequest.onsuccess = () => res(ipfsCountRequest.result);
              ipfsCountRequest.onerror = () => res(0);
            })
          ]).then(([assetCount, ipfsCount]) => {
            resolve({ assetCount, ipfsCount, size: 0 }); // Size calculation would require more work
          });
        });
      } else {
        // Estimate from localStorage
        let assetCount = 0;
        let ipfsCount = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('cached_assets_')) assetCount++;
          if (key?.startsWith('ipfs_')) ipfsCount++;
        }

        return { assetCount, ipfsCount, size: 0 };
      }
    } catch {
      return { assetCount: 0, ipfsCount: 0, size: 0 };
    }
  }
}

// Export singleton instance
export const assetCacheService = new AssetCacheService();

// Export class for testing
export { AssetCacheService };

