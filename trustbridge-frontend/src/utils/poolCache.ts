/**
 * Pool data cache utility
 * Persists pool data to localStorage for faster loading
 */

const CACHE_KEY = 'novax_pools_cache';
const CACHE_EXPIRY_KEY = 'novax_pools_cache_expiry';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface CachedPool {
  poolId: string;
  name: string;
  description: string;
  totalValue: number;
  totalInvested: number;
  tokenPrice: number;
  tokenSupply: number;
  expectedAPY: number;
  minimumInvestment: number;
  maximumInvestment: number;
  status: string;
  isActive: boolean;
  isTradeable: boolean;
  isListed: boolean;
  location: string;
  createdAt: string;
  assets: any[];
  category: string;
  type: string;
  assetType: string;
  maturityDate: number | null;
  apr: number;
}

export interface PoolCache {
  pools: CachedPool[];
  timestamp: number;
  totalPools: number;
}

/**
 * Save pools to cache
 */
export function savePoolsToCache(pools: CachedPool[]): void {
  try {
    const cache: PoolCache = {
      pools,
      timestamp: Date.now(),
      totalPools: pools.length,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    localStorage.setItem(CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION));
    console.log(`💾 Cached ${pools.length} pools to localStorage`);
  } catch (error) {
    console.warn('⚠️ Failed to save pools to cache:', error);
  }
}

/**
 * Get pools from cache
 */
export function getPoolsFromCache(): CachedPool[] | null {
  try {
    const expiryStr = localStorage.getItem(CACHE_EXPIRY_KEY);
    if (!expiryStr) {
      return null;
    }

    const expiry = Number(expiryStr);
    if (Date.now() > expiry) {
      console.log('⏰ Pool cache expired, clearing...');
      clearPoolsCache();
      return null;
    }

    const cacheStr = localStorage.getItem(CACHE_KEY);
    if (!cacheStr) {
      return null;
    }

    const cache: PoolCache = JSON.parse(cacheStr);
    const age = Date.now() - cache.timestamp;
    console.log(`📦 Retrieved ${cache.pools.length} pools from cache (age: ${Math.round(age / 1000)}s)`);
    return cache.pools;
  } catch (error) {
    console.warn('⚠️ Failed to read pools from cache:', error);
    clearPoolsCache();
    return null;
  }
}

/**
 * Clear pools cache
 */
export function clearPoolsCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
    console.log('🗑️ Cleared pools cache');
  } catch (error) {
    console.warn('⚠️ Failed to clear pools cache:', error);
  }
}

/**
 * Check if cache is valid
 */
export function isCacheValid(): boolean {
  try {
    const expiryStr = localStorage.getItem(CACHE_EXPIRY_KEY);
    if (!expiryStr) {
      return false;
    }
    return Date.now() < Number(expiryStr);
  } catch {
    return false;
  }
}

/**
 * Get cache age in seconds
 */
export function getCacheAge(): number {
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    if (!cacheStr) {
      return -1;
    }
    const cache: PoolCache = JSON.parse(cacheStr);
    return Math.round((Date.now() - cache.timestamp) / 1000);
  } catch {
    return -1;
  }
}


