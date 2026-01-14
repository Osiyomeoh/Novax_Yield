/**
 * Collection Utilities
 * Groups assets into collections and calculates statistics
 */

export interface CollectionStats {
  collectionId: string;
  collectionName: string;
  floorPrice: number;
  totalVolume: number;
  totalItems: number;
  listedItems: number;
  owners: Set<string>;
  uniqueOwners: number;
  assets: any[];
  bannerImage?: string;
  description?: string;
  verified?: boolean;
  createdAt?: string;
}

/**
 * Group assets by collection name
 */
export const groupAssetsByCollection = (assets: any[]): Map<string, any[]> => {
  const collections = new Map<string, any[]>();
  
  assets.forEach(asset => {
    // Use collection name or asset name as collection identifier
    const collectionName = asset.collectionName || asset.collection || extractCollectionName(asset.name);
    
    if (!collections.has(collectionName)) {
      collections.set(collectionName, []);
    }
    
    collections.get(collectionName)!.push(asset);
  });
  
  return collections;
};

/**
 * Extract collection name from asset name
 * e.g., "Bored Ape #1234" -> "Bored Ape"
 */
const extractCollectionName = (assetName: string): string => {
  // Remove common patterns like #123, Collection, etc.
  return assetName
    .replace(/\s*#\d+.*$/, '') // Remove #123 and everything after
    .replace(/\s+Collection$/i, '') // Remove "Collection" suffix
    .replace(/\s+NFT$/i, '') // Remove "NFT" suffix
    .trim() || assetName;
};

/**
 * Calculate collection statistics
 */
export const calculateCollectionStats = (
  collectionName: string,
  assets: any[]
): CollectionStats => {
  const listedAssets = assets.filter(a => a.isListed);
  const prices = listedAssets
    .map(a => parseFloat(a.price || a.totalValue || '0'))
    .filter(p => p > 0);
  
  const floorPrice = prices.length > 0 ? Math.min(...prices) : 0;
  
  // Calculate total volume (sum of all listed prices)
  const totalVolume = prices.reduce((sum, price) => sum + price, 0);
  
  // Get unique owners
  const owners = new Set(assets.map(a => a.owner).filter(Boolean));
  
  // Get banner image (use first asset's image)
  const bannerImage = assets[0]?.imageURI || assets[0]?.image;
  
  // Get description (use first asset's description or generate)
  const description = assets[0]?.collectionDescription || 
    `A collection of ${assets.length} unique digital assets on TrustBridge`;
  
  return {
    collectionId: collectionName.toLowerCase().replace(/\s+/g, '-'),
    collectionName,
    floorPrice,
    totalVolume,
    totalItems: assets.length,
    listedItems: listedAssets.length,
    owners,
    uniqueOwners: owners.size,
    assets,
    bannerImage,
    description,
    verified: false, // Can be set based on verification status
    createdAt: assets[0]?.createdAt
  };
};

/**
 * Get all collection stats
 */
export const getAllCollectionStats = (assets: any[]): CollectionStats[] => {
  const collections = groupAssetsByCollection(assets);
  const stats: CollectionStats[] = [];
  
  collections.forEach((collectionAssets, collectionName) => {
    stats.push(calculateCollectionStats(collectionName, collectionAssets));
  });
  
  // Sort by total volume (highest first)
  stats.sort((a, b) => b.totalVolume - a.totalVolume);
  
  return stats;
};

/**
 * Get trending collections (by recent activity)
 */
export const getTrendingCollections = (
  collectionStats: CollectionStats[],
  limit: number = 10
): CollectionStats[] => {
  // Sort by listed items and volume
  return collectionStats
    .filter(c => c.listedItems > 0)
    .sort((a, b) => {
      // Prioritize collections with more listed items and higher volume
      const aScore = a.listedItems * a.totalVolume;
      const bScore = b.listedItems * b.totalVolume;
      return bScore - aScore;
    })
    .slice(0, limit);
};

/**
 * Format price for display
 */
export const formatPrice = (price: number): string => {
  if (price === 0) return '---';
  if (price < 1) return price.toFixed(2);
  if (price < 1000) return price.toFixed(0);
  if (price < 1000000) return `${(price / 1000).toFixed(1)}K`;
  return `${(price / 1000000).toFixed(1)}M`;
};

/**
 * Calculate price change percentage
 */
export const calculatePriceChange = (
  currentPrice: number,
  previousPrice: number
): { change: number; percentage: number } => {
  if (previousPrice === 0) return { change: 0, percentage: 0 };
  
  const change = currentPrice - previousPrice;
  const percentage = (change / previousPrice) * 100;
  
  return { change, percentage };
};

