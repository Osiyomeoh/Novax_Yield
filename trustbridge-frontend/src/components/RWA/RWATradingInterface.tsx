import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Building2, 
  Users, 
  Shield, 
  Eye, 
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Heart,
  Share2,
  Filter,
  Search
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useWallet } from '../../contexts/WalletContext';

interface RWAAsset {
  id: string;
  name: string;
  type: string;
  category: string;
  location: string;
  value: number;
  tokenPrice: number;
  totalTokens: number;
  availableTokens: number;
  expectedAPY: number;
  maturityDate: string;
  status: 'ACTIVE' | 'SOLD_OUT' | 'MATURED' | 'SUSPENDED';
  amcVerified: boolean;
  amcName: string;
  amcRating: number;
  image: string;
  description: string;
  performance: {
    currentValue: number;
    valueChange: number;
    valueChangePercent: number;
    totalReturn: number;
    totalReturnPercent: number;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  liquidity: 'HIGH' | 'MEDIUM' | 'LOW';
  lastUpdated: string;
}

const RWATradingInterface: React.FC = () => {
  const { toast } = useToast();
  const { accountId, isConnected, signer, hederaClient } = useWallet();
  const [assets, setAssets] = useState<RWAAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<RWAAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<RWAAsset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    riskLevel: 'all',
    liquidity: 'all',
    minAPY: '',
    maxAPY: '',
    amcVerified: false
  });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [chainlinkData, setChainlinkData] = useState<any>(null);
  const [isLoadingChainlink, setIsLoadingChainlink] = useState(false);

  useEffect(() => {
    fetchRWAAssets();
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      fetchChainlinkData(selectedAsset.id);
    }
  }, [selectedAsset]);

  useEffect(() => {
    applyFilters();
  }, [assets, searchTerm, filters, sortBy, sortOrder]);

  const fetchChainlinkData = async (assetId: string) => {
    try {
      setIsLoadingChainlink(true);
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;
      const response = await fetch(`${apiUrl}/assets/rwa/${assetId}/chainlink-data`);
      if (response.ok) {
        const data = await response.json();
        setChainlinkData(data.chainlinkData);
      }
    } catch (error) {
      console.error('Error fetching Chainlink data:', error);
    } finally {
      setIsLoadingChainlink(false);
    }
  };

  const fetchRWAAssets = async () => {
    try {
      setIsLoading(true);
      console.log('🔗 Fetching RWA assets from Mantle blockchain...');
      
      // Import mantleContractService
      const { mantleContractService } = await import('../../services/mantleContractService');
      
      // Initialize with provider for read-only operations
      if (hederaClient && signer) {
        // Use existing provider if available
        const provider = new (await import('ethers')).JsonRpcProvider(
          import.meta.env.VITE_MANTLE_TESTNET_RPC_URL || 'https://rpc.sepolia.mantle.xyz'
        );
        mantleContractService.initialize(null as any, provider);
      } else {
        // Create read-only provider
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(
          import.meta.env.VITE_MANTLE_TESTNET_RPC_URL || 'https://rpc.sepolia.mantle.xyz'
        );
        mantleContractService.initialize(null as any, provider);
      }

      // Fetch all RWA assets from blockchain
      const blockchainAssets = await mantleContractService.getAllRWAAssets();
      console.log(`✅ Found ${blockchainAssets.length} RWA assets on blockchain`);

      // Transform blockchain asset data to RWAAsset format
      const transformedAssets: RWAAsset[] = blockchainAssets.map((asset: any) => {
        const totalValue = parseFloat(asset.totalValue || '0');
        const tokenPrice = totalValue > 0 ? Math.floor(totalValue / 1000) : 100;
        
        return {
          id: asset.assetId || asset.id || `rwa-${Date.now()}`,
          name: asset.name || 'Unnamed Asset',
          type: asset.assetType || 'RWA',
          category: asset.category || 'Other',
          location: asset.location || 'Location TBD',
          value: totalValue,
          tokenPrice: tokenPrice,
          totalTokens: 1000, // Default, should come from contract
          availableTokens: 1000, // Default, should come from contract
          expectedAPY: 12.0, // Default, should come from contract or metadata
          maturityDate: asset.maturityDate ? new Date(Number(asset.maturityDate) * 1000).toISOString().split('T')[0] : new Date().toISOString(),
          status: asset.status || 'ACTIVE',
          amcVerified: asset.status === 'VERIFIED' || asset.status === 'ACTIVE',
          amcName: 'TrustBridge AMC',
          amcRating: 4.5,
          image: asset.imageURI || '/api/placeholder/400/300',
          description: asset.description || 'No description available',
          performance: {
            currentValue: totalValue,
            valueChange: 0,
            valueChangePercent: 0,
            totalReturn: 0,
            totalReturnPercent: 0
          },
          riskLevel: 'MEDIUM',
          liquidity: 'MEDIUM',
          lastUpdated: asset.createdAt ? new Date(Number(asset.createdAt) * 1000).toISOString() : new Date().toISOString()
        };
      });

      console.log('✅ Transformed RWA assets:', transformedAssets.length);
      setAssets(transformedAssets);
    } catch (error: any) {
      console.error('❌ Error fetching RWA assets from blockchain:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch RWA assets from blockchain: ${error.message}`,
        variant: 'destructive'
      });
      // Set empty array on error
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...assets];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(asset => asset.category === filters.category);
    }

    // Risk level filter
    if (filters.riskLevel !== 'all') {
      filtered = filtered.filter(asset => asset.riskLevel === filters.riskLevel);
    }

    // Liquidity filter
    if (filters.liquidity !== 'all') {
      filtered = filtered.filter(asset => asset.liquidity === filters.liquidity);
    }

    // APY range filter
    if (filters.minAPY) {
      filtered = filtered.filter(asset => asset.expectedAPY >= parseFloat(filters.minAPY));
    }
    if (filters.maxAPY) {
      filtered = filtered.filter(asset => asset.expectedAPY <= parseFloat(filters.maxAPY));
    }

    // AMC verified filter
    if (filters.amcVerified) {
      filtered = filtered.filter(asset => asset.amcVerified);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'price':
          aValue = a.tokenPrice;
          bValue = b.tokenPrice;
          break;
        case 'apy':
          aValue = a.expectedAPY;
          bValue = b.expectedAPY;
          break;
        case 'value':
          aValue = a.value;
          bValue = b.value;
          break;
        case 'performance':
          aValue = a.performance.totalReturnPercent;
          bValue = b.performance.totalReturnPercent;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredAssets(filtered);
  };

  const handlePurchase = async (asset: RWAAsset) => {
    if (!isConnected || !accountId || !signer || !hederaClient) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your HashPack wallet to purchase RWA tokens.',
        variant: 'destructive'
      });
      return;
    }

    if (!purchaseAmount || parseFloat(purchaseAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid purchase amount.',
        variant: 'destructive'
      });
      return;
    }

    const tokensToPurchase = Math.floor(parseFloat(purchaseAmount) / asset.tokenPrice);
    const totalCost = tokensToPurchase * asset.tokenPrice;

    if (tokensToPurchase > asset.availableTokens) {
      toast({
        title: 'Insufficient Tokens',
        description: `Only ${asset.availableTokens} tokens available for purchase.`,
        variant: 'destructive'
      });
      return;
    }

    setIsPurchasing(true);
    try {
      // Mock purchase transaction - replace with actual Hedera transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Purchase Successful!',
        description: `Successfully purchased ${tokensToPurchase} tokens of ${asset.name} for $${totalCost.toLocaleString()}.`,
        variant: 'default'
      });

      // Update asset availability
      setAssets(prev => prev.map(a => 
        a.id === asset.id 
          ? { ...a, availableTokens: a.availableTokens - tokensToPurchase }
          : a
      ));

      setPurchaseAmount('');
      setSelectedAsset(null);
    } catch (error) {
      console.error('Error purchasing RWA tokens:', error);
      toast({
        title: 'Purchase Failed',
        description: 'Failed to complete the purchase. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return 'text-primary-blue bg-primary-blue/10';
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'HIGH':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getLiquidityColor = (liquidity: string) => {
    switch (liquidity) {
      case 'HIGH':
        return 'text-primary-blue bg-primary-blue/10';
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'LOW':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-off-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-off-white mb-2">RWA Trading Interface</h1>
          <p className="text-primary-blue-light">Trade verified real-world assets with professional AMC management</p>
        </motion.div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search RWA assets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-off-white"
                >
                  <option value="all">All Categories</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Bonds">Bonds</option>
                  <option value="Invoices">Invoices</option>
                  <option value="Cashflow">Cashflow</option>
                  <option value="Agricultural">Agricultural</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Inventory">Inventory</option>
                  <option value="Commodities">Commodities</option>
                </select>

                <select
                  value={filters.riskLevel}
                  onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                  className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-off-white"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="LOW">Low Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="HIGH">High Risk</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-off-white"
                >
                  <option value="name">Sort by Name</option>
                  <option value="price">Sort by Price</option>
                  <option value="apy">Sort by APY</option>
                  <option value="value">Sort by Value</option>
                  <option value="performance">Sort by Performance</option>
                </select>

                <button
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-off-white hover:bg-gray-700"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-lg text-off-white">{asset.name}</CardTitle>
                  <div className="flex items-center space-x-1">
                    {asset.amcVerified && (
                      <Shield className="w-4 h-4 text-primary-blue" />
                    )}
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-gray-400">{asset.amcRating}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-400">{asset.type}</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Token Price</p>
                    <p className="text-lg font-semibold text-off-white">${asset.tokenPrice}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Expected APY</p>
                    <p className="text-lg font-semibold text-primary-blue">{asset.expectedAPY}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Available Tokens</p>
                    <p className="text-sm text-off-white">{asset.availableTokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total Value</p>
                    <p className="text-sm text-off-white">${asset.value.toLocaleString()}</p>
                  </div>
                </div>

                {/* Performance Indicators */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">Performance:</span>
                    <div className="flex items-center space-x-1">
                      {asset.performance.valueChangePercent > 0 ? (
                        <TrendingUp className="w-3 h-3 text-primary-blue" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-400" />
                      )}
                      <span className={`text-xs ${asset.performance.valueChangePercent > 0 ? 'text-primary-blue' : 'text-red-400'}`}>
                        {asset.performance.valueChangePercent > 0 ? '+' : ''}{asset.performance.valueChangePercent}%
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <div className={`px-2 py-1 rounded text-xs ${getRiskColor(asset.riskLevel)}`}>
                      {asset.riskLevel}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${getLiquidityColor(asset.liquidity)}`}>
                      {asset.liquidity}
                    </div>
                  </div>
                </div>

                {/* AMC Info */}
                <div className="bg-gray-800 p-3 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Managed by</p>
                  <p className="text-sm text-off-white">{asset.amcName}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setSelectedAsset(asset)}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    onClick={() => setSelectedAsset(asset)}
                    className="flex-1 bg-primary-blue text-black hover:bg-primary-blue-light"
                    size="sm"
                    disabled={asset.status !== 'ACTIVE'}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Buy Tokens
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredAssets.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">No RWA assets found</h3>
            <p className="text-gray-500">No assets match your search criteria.</p>
          </div>
        )}

        {/* Purchase Modal */}
        {selectedAsset && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-off-white">Purchase {selectedAsset.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Token Price: ${selectedAsset.tokenPrice}</p>
                  <p className="text-sm text-gray-400">Available Tokens: {selectedAsset.availableTokens.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">Expected APY: {selectedAsset.expectedAPY}%</p>
                </div>

                {/* Chainlink Data Display */}
                {chainlinkData && (
                  <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                    <h4 className="font-semibold text-off-white flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-primary-blue" />
                      <span>Chainlink Oracle Data</span>
                    </h4>
                    
                    {chainlinkData.priceData && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Current Value:</span>
                          <span className="text-off-white">${chainlinkData.priceData.currentValue?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">24h Change:</span>
                          <span className={chainlinkData.priceData.priceChangePercent > 0 ? 'text-primary-blue' : 'text-red-400'}>
                            {chainlinkData.priceData.priceChangePercent > 0 ? '+' : ''}{chainlinkData.priceData.priceChangePercent?.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Confidence:</span>
                          <span className="text-primary-blue">{(chainlinkData.priceData.confidence * 100)?.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Source:</span>
                          <span className="text-gray-300">{chainlinkData.priceData.source}</span>
                        </div>
                      </div>
                    )}

                    {chainlinkData.riskData && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Risk Level:</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            chainlinkData.riskData.riskLevel === 'LOW' ? 'bg-primary-blue/10 text-primary-blue' :
                            chainlinkData.riskData.riskLevel === 'MEDIUM' ? 'bg-yellow-400/10 text-yellow-400' :
                            'bg-red-400/10 text-red-400'
                          }`}>
                            {chainlinkData.riskData.riskLevel}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Risk Score:</span>
                          <span className="text-off-white">{(chainlinkData.riskData.riskScore * 100)?.toFixed(1)}%</span>
                        </div>
                      </div>
                    )}

                    {isLoadingChainlink && (
                      <div className="flex items-center justify-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-blue"></div>
                        <span className="ml-2 text-sm text-gray-400">Loading Chainlink data...</span>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-off-white mb-2">
                    Purchase Amount (USD)
                  </label>
                  <Input
                    type="number"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(e.target.value)}
                    placeholder="Enter amount in USD"
                  />
                  {purchaseAmount && (
                    <p className="text-xs text-gray-400 mt-1">
                      You will receive {Math.floor(parseFloat(purchaseAmount) / selectedAsset.tokenPrice)} tokens
                    </p>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => setSelectedAsset(null)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handlePurchase(selectedAsset)}
                    disabled={!purchaseAmount || isPurchasing}
                    className="flex-1 bg-primary-blue text-black hover:bg-primary-blue-light"
                  >
                    {isPurchasing ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Purchase'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default RWATradingInterface;
