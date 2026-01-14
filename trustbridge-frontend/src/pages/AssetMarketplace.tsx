import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Star, 
  Heart, 
  Package, 
  Building2,
  Globe,
  Users,
  DollarSign,
  CheckCircle,
  Grid3X3,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Layers,
  BarChart3
} from 'lucide-react';
import { Card, CardContent } from '../components/UI/Card';
import Button from '../components/UI/Button';
import MarketplaceAssetModal from '../components/Assets/MarketplaceAssetModal';
import ActivityFeed from '../components/Activity/ActivityFeed';
import { getAllCollectionStats, CollectionStats } from '../utils/collectionUtils';
import { ipfsService } from '../services/ipfs';
import { getUseTranslation } from '../utils/i18n-helpers';
import { useWallet } from '../contexts/WalletContext';

// TrustBridge categories - RWA only
// Note: Names will be translated in the component using t()
const CATEGORIES = [
  { id: 'all', nameKey: 'marketplace.allAssets', icon: Package },
  { id: 'rwa', nameKey: 'marketplace.realWorldAssets', icon: Building2 },
  { id: 'verified', nameKey: 'marketplace.verifiedAssets', icon: CheckCircle },
  { id: 'trading', nameKey: 'marketplace.tradingPools', icon: TrendingUp },
  { id: 'spv', nameKey: 'marketplace.spvInvestments', icon: Users }
];

// Time filters
const TIME_FILTERS = [
  { id: 'all', name: 'All' },
  { id: '30d', name: '30d' },
  { id: '7d', name: '7d' },
  { id: '1d', name: '1d' },
  { id: '1h', name: '1h' },
  { id: '15m', name: '15m' },
  { id: '5m', name: '5m' },
  { id: '1m', name: '1m' }
];

// Sort options
const SORT_OPTIONS = [
  { id: 'floor', name: 'Floor Price', icon: DollarSign },
  { id: 'volume', name: 'Volume', icon: TrendingUp },
  { id: 'sales', name: 'Sales', icon: Star },
  { id: 'items', name: 'Items', icon: Package }
];

const AssetMarketplace: React.FC = () => {
  // i18n
  const useTranslation = getUseTranslation();
  const { t } = useTranslation();
  const { address, isConnected } = useWallet();
  const navigate = useNavigate();
  
  // State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('1d');
  const [sortBy, setSortBy] = useState('floor');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<any[]>([]);
  const [amcPools, setAmcPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [showAssetDetail, setShowAssetDetail] = useState(false);
  const [priceFilter, setPriceFilter] = useState({ min: '', max: '' });
  const [statusFilter, setStatusFilter] = useState<'all' | 'listed' | 'unlisted'>('all');
  const [viewType, setViewType] = useState<'assets' | 'collections'>('assets');
  const [collections, setCollections] = useState<CollectionStats[]>([]);

  // Fetch AMC pools for trading
  const fetchAmcPools = async () => {
    try {
      const { mantleContractService } = await import('../services/mantleContractService');
      const mantleService = mantleContractService;
      
      // Try fetching from blockchain first (most reliable)
      let blockchainPools: any[] = [];
      try {
        console.log('🔍 Fetching pools from blockchain...');
        blockchainPools = await mantleService.getAllPoolsFromBlockchain();
        console.log(`✅ Found ${blockchainPools.length} pools on blockchain`);
      } catch (blockchainError) {
        console.warn('⚠️ Failed to fetch pools from blockchain:', blockchainError);
      }

      // Also try fetching from API as fallback/supplement
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      let apiPools: any[] = [];
      
      if (token) {
        try {
          console.log('🔍 Fetching AMC pools from API...');
          const apiUrl = import.meta.env.VITE_API_URL || '';
          if (apiUrl) {
            const response = await fetch(`${apiUrl}/amc-pools`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            console.log('📡 AMC pools response status:', response.status);
            
            if (response.ok) {
              const data = await response.json();
              apiPools = Array.isArray(data) ? data : (data.pools || data.data || []);
              console.log(`✅ Found ${apiPools.length} pools from API`);
            } else {
              console.log('⚠️ AMC pools fetch failed:', response.status, response.statusText);
            }
          }
        } catch (apiError) {
          console.warn('⚠️ Failed to fetch pools from API:', apiError);
        }
      }

      // Merge pools from both sources, prioritizing blockchain pools
      // Create a map to deduplicate by poolId
      const poolsMap = new Map<string, any>();
      
      // Add blockchain pools first (they're more reliable)
      blockchainPools.forEach(pool => {
        if (pool.poolId && pool.isActive) {
          poolsMap.set(pool.poolId, pool);
        }
      });
      
      // Add API pools, but ONLY if they exist on-chain (have hederaContractId/mantlePoolId)
      // CRITICAL: Only show pools that are verified to exist on-chain
      apiPools.forEach(pool => {
        if (pool.poolId && pool.status === 'ACTIVE' && !poolsMap.has(pool.poolId)) {
          // CRITICAL: Only include pools that have on-chain ID (hederaContractId stores Mantle pool ID)
          // This ensures we never show database-only pools
          const hasOnChainId = pool.hederaContractId || pool.mantlePoolId;
          if (!pool.hederaTokenId && hasOnChainId) { // Exclude old Hedera pools, require on-chain ID
            poolsMap.set(pool.poolId, pool);
          } else {
            console.warn(`⚠️ Skipping database-only pool: ${pool.poolId} (${pool.name}) - no on-chain ID found`);
          }
        }
      });

      const allPools = Array.from(poolsMap.values());
      
      // Filter to only active Mantle pools that exist on-chain
      const mantlePools = allPools.filter((pool: any) => {
        // Exclude pools that have hederaTokenId (old Hedera field)
        // CRITICAL: Require hederaContractId or mantlePoolId (on-chain pool ID)
        // Only show active pools
        const hasOnChainId = pool.hederaContractId || pool.mantlePoolId;
        return !pool.hederaTokenId && hasOnChainId && (pool.status === 'ACTIVE' || pool.isActive);
      });
        
      console.log(`📊 Total active Mantle pools: ${mantlePools.length} (${blockchainPools.length} from blockchain, ${apiPools.length} from API)`);
      setAmcPools(mantlePools);
    } catch (error) {
      console.log('❌ Failed to fetch AMC pools:', error);
      setAmcPools([]);
    }
  };

  // Fetch ALL assets from Mantle blockchain only
  const fetchMarketplaceData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔗 Fetching ALL assets from Mantle blockchain only...');
      
      // Import mantleContractService for Mantle blockchain
      const { mantleContractService } = await import('../services/mantleContractService');
      
      // Fetch from blockchain only
      const marketplaceAssets: any[] = [];
      
      // Add active pools as tradeable items
      const poolItems = amcPools.map((pool: any) => ({
        id: `pool-${pool.poolId || pool._id}`,
        poolId: pool.poolId || pool._id,
        name: pool.name || pool.poolName || 'Unnamed Pool',
        description: pool.description || pool.poolDescription || 'Investment pool',
        imageURI: pool.imageURI || '',
        price: pool.tokenPrice || (pool.totalValue / pool.tokenSupply) || '0',
        totalValue: pool.totalValue || pool.totalPoolValue || 0,
        owner: pool.createdBy || pool.creator || '',
        category: 'Trading Pool',
        type: 'pool',
        assetType: 'Trading Pool',
        status: pool.status || 'ACTIVE',
        isActive: pool.status === 'ACTIVE',
        isTradeable: true,
        isListed: pool.status === 'ACTIVE',
        location: 'Mantle Network',
        createdAt: pool.createdAt || pool.launchedAt || new Date().toISOString(),
        expectedAPY: pool.expectedAPY || 0,
        assets: pool.assets || pool.assetNFTs || [],
        minimumInvestment: pool.minimumInvestment || 100,
        tokenSupply: pool.tokenSupply || 0,
        // Pool-specific fields
        seniorTrancheId: pool.seniorTrancheId,
        juniorTrancheId: pool.juniorTrancheId,
        mantlePoolId: pool.mantlePoolId || pool.hederaContractId,
        tranches: {
          senior: { percentage: 70, apy: 8 },
          junior: { percentage: 30, apy: 15 }
        }
      }));
      
      marketplaceAssets.push(...poolItems);
      console.log(`🏊 Added ${poolItems.length} pools to marketplace`);
      
      try {
        // Get all active listings from Mantle blockchain
        console.log('🔗 Fetching active listings from Mantle blockchain...');
        const activeListings = await mantleContractService.getAllActiveListings();
        console.log(`🔗 Found ${activeListings.length} active listings on Mantle blockchain`);
        
        // Process active listings from blockchain - only RWA assets
        const processedListings = activeListings
          .filter((listing: any) => {
            // Filter out invalid token IDs (bytes32 hashes instead of uint256)
            const tokenIdStr = listing.tokenId?.toString() || '0';
            const isValidTokenId = tokenIdStr.length <= 10 && !isNaN(parseInt(tokenIdStr)) && parseInt(tokenIdStr) > 0;
            
            if (!isValidTokenId) {
              console.log(`🚫 Filtering out listing with invalid token ID: ${tokenIdStr}`);
              return false;
            }
            
            // Only include RWA assets
            const isRWA = listing.assetType === 'RWA' || 
                         listing.category === 'RWA' || 
                         listing.type === 'rwa' ||
                         listing.category === 'Real Estate' ||
                         listing.category === 'Commodities' ||
                         listing.category === 'Infrastructure' ||
                         listing.category === 'Agriculture' ||
                         listing.category === 'Farm' ||
                         listing.category === 'Property';
            
            if (!isRWA) {
              console.log(`🚫 Filtering out non-RWA asset: ${listing.name || listing.assetId}`);
              return false;
            }
            
            return true;
          })
          .map((listing: any) => {
            return {
              id: listing.id || listing.listingId?.toString() || listing.assetId,
              tokenId: listing.tokenId?.toString() || listing.assetId,
              name: listing.name || `Asset #${listing.tokenId || listing.assetId}`,
              description: listing.description || 'RWA Asset',
              imageURI: listing.imageURI || listing.image || '',
              price: listing.price || listing.totalValue || '0',
              totalValue: listing.totalValue || listing.price || '0',
              owner: listing.seller || listing.owner,
              category: 'RWA',
              type: 'rwa',
              status: 'listed',
              isActive: listing.isActive !== false,
              isTradeable: true,
              isListed: true,
              location: listing.location || 'Mantle Network',
              createdAt: listing.createdAt || new Date().toISOString(),
              listingId: listing.listingId?.toString()
            };
          });
        
        marketplaceAssets.push(...processedListings);
        console.log(`🔗 Processed ${processedListings.length} RWA listings from Mantle blockchain`);
      } catch (blockchainError) {
        console.error('❌ Error fetching from Mantle blockchain:', blockchainError);
      }
      
      // No API or Hedera fetching - blockchain only
      console.log(`🔗 Total assets from Mantle blockchain: ${marketplaceAssets.length}`);
      
      // Deduplicate assets by ID
      const uniqueAssets = marketplaceAssets.filter((asset, index, self) => {
        if (!asset || !asset.id) return false;
        return index === self.findIndex((a) => a && a.id === asset.id);
      });
      
      console.log('📊 Unique assets from blockchain:', uniqueAssets.length);
      setAssets(uniqueAssets);
      
      // Calculate collection stats
      const collectionStats = getAllCollectionStats(uniqueAssets);
      setCollections(collectionStats);
      console.log('📦 Collections calculated:', collectionStats.length);
    } catch (err) {
      console.error('Error fetching marketplace data:', err);
      setError('Failed to load marketplace data from blockchain');
      setAssets([]);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  // Refresh marketplace data
  const refreshMarketplaceData = async () => {
    setRefreshing(true);
    await fetchMarketplaceData();
    setRefreshing(false);
  };


  useEffect(() => {
    console.log('🔄 AssetMarketplace mounted - fetching data...');
    fetchAmcPools();
  }, []);

  // Refetch marketplace data when pools are loaded
  useEffect(() => {
    // Always fetch marketplace data when amcPools changes
    // This ensures we show loading/empty states correctly
    fetchMarketplaceData();
  }, [amcPools]);

  // Filter to only show pools (deRWA)
  const filteredAssets = React.useMemo(() => {
    // Only return pools - no other assets
    return assets.filter((asset: any) => {
      if (!asset) return false;
      return asset.type === 'pool' || asset.category === 'Trading Pool' || asset.assetType === 'Trading Pool';
    });
  }, [assets, amcPools]);

  const formatPrice = (price: string, currency: string) => {
    const numPrice = parseFloat(price);
    if (currency === 'TRUST') {
      if (numPrice < 1) {
        return `${numPrice.toFixed(2)} TRUST`;
      } else if (numPrice < 1000) {
        return `${numPrice.toFixed(0)} TRUST`;
      } else if (numPrice < 1000000) {
        return `${(numPrice / 1000).toFixed(1)}K TRUST`;
      } else {
        return `${(numPrice / 1000000).toFixed(1)}M TRUST`;
      }
    } else {
      if (numPrice < 0.01) {
        return `< 0.01 ${currency}`;
      }
      return `${numPrice.toFixed(4)} ${currency}`;
    }
  };

  // Calculate total TVL from pools
  const totalTVL = filteredAssets
    .filter(a => a.type === 'pool' || a.category === 'Trading Pool')
    .reduce((sum, pool) => sum + (parseFloat(pool.totalValue?.toString() || '0') || 0), 0);

  // Get current date for TVL display
  const currentDate = new Date().toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  // Get pools for deRWA section (only show pools, no other assets)
  const pools = filteredAssets.filter(asset => asset.type === 'pool' || asset.category === 'Trading Pool');

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      {/* Centrifuge-style Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">TrustBridge</span>
            </div>
            
            {/* Right side - Wallet and TVL */}
            <div className="flex items-center gap-4">
              {/* TVL Box - Centrifuge Style */}
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="text-xs text-gray-500">TVL on {currentDate}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      ${totalTVL.toLocaleString()} USD
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Wallet Address */}
              {isConnected && address ? (
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-900 transition-colors">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </button>
              ) : (
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-8 sm:py-12">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-12 w-12 animate-spin text-blue-600" />
            <p className="ml-4 text-gray-600">Loading pools...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium mb-2">Error loading marketplace</p>
            <p className="text-red-600 text-sm">{error}</p>
            <Button
              onClick={refreshMarketplaceData}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && pools.length === 0 && (
          <div className="text-center py-20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">deRWA</h2>
              <p className="text-gray-600">
                Decentralized real-world asset tokens. Freely transferable tokens with on-chain transparency and liquidity.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 max-w-md mx-auto">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No pools available</h3>
              <p className="text-gray-600 text-sm mb-6">
                There are currently no active investment pools. Check back later or create a new pool.
              </p>
              <Button
                onClick={refreshMarketplaceData}
                variant="outline"
                className="mx-auto"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        )}

        {/* deRWA Section - Centrifuge Style (Only Pools) */}
        {!loading && !error && pools.length > 0 && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">deRWA</h2>
              <p className="text-gray-600">
                Decentralized real-world asset tokens. Freely transferable tokens with on-chain transparency and liquidity.
              </p>
            </div>
            
            {/* Pool Cards Grid - Centrifuge Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pools.map((pool, index) => {
                // Generate pool logo initials (like "JH JTRSY")
                const poolName = pool.name || 'Pool';
                const words = poolName.split(' ');
                const logoText = words.length >= 2 
                  ? `${words[0].substring(0, 3).toUpperCase()} ${words[1].substring(0, 5).toUpperCase()}`
                  : poolName.substring(0, 8).toUpperCase();
                
                return (
                  <motion.div
                    key={pool.id || pool.poolId || `pool-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => {
                      // Navigate to pool detail page instead of opening modal
                      navigate(`/dashboard/pool/${pool.poolId || pool.id}`);
                    }}
                  >
                    {/* Logo - Centrifuge Style */}
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center border border-gray-200 mb-3">
                        <span className="text-lg font-bold text-blue-600">
                          {words.length >= 2 
                            ? `${words[0].charAt(0)}${words[1].charAt(0)}`
                            : poolName.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        {logoText}
                      </p>
                    </div>

                    {/* Pool Title */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 leading-tight">
                      {pool.name}
                    </h3>

                    {/* Key Metrics - Centrifuge Style */}
                    <div className="space-y-3 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">TVL(USD)</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ${(pool.totalValue || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">APY</p>
                        <p className="text-xl font-bold text-blue-600">
                          {pool.expectedAPY || 0}%
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed line-clamp-3">
                      {pool.description || 'Tokenized real-world assets offering stable returns through diversified investment pools.'}
                    </p>

                    {/* Pool Details - Centrifuge Style */}
                    <div className="space-y-2 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Asset type</span>
                        <span className="text-gray-900 font-medium">Real Estate</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Investor type</span>
                        <span className="text-gray-900 font-medium">Professional Investors</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Min. investment</span>
                        <span className="text-gray-900 font-medium">
                          ${(pool.minimumInvestment || 100).toLocaleString()} USD
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Marketplace Asset Modal */}
      <MarketplaceAssetModal
        isOpen={showAssetDetail}
        onClose={() => {
          setShowAssetDetail(false);
          setSelectedAsset(null);
        }}
        asset={selectedAsset}
        onAssetUpdate={() => {
          fetchMarketplaceData();
        }}
      />
    </div>
  );
};

export default AssetMarketplace;
