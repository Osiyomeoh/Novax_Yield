import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar, 
  Target,
  Shield,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  CheckCircle,
  AlertTriangle,
  Filter,
  Search,
  Star,
  StarOff
} from 'lucide-react';
import PoolInvestmentInterface from './PoolInvestmentInterface';

interface AMCPool {
  poolId: string;
  name: string;
  description: string;
  type: string;
  status: string;
  totalValue: number;
  tokenSupply: number;
  tokenPrice: number;
  minimumInvestment: number;
  expectedAPY: number;
  maturityDate: string;
  totalInvested: number;
  totalInvestors: number;
  assets: any[];
  hederaTokenId: string;
  isTradeable: boolean;
  currentPrice: number;
  priceChange24h: number;
  tradingVolume: number;
  dividends: any[];
  metadata: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    liquidity: 'HIGH' | 'MEDIUM' | 'LOW';
    diversification: number;
  };
  createdAt: string;
}

const PoolMarketplace: React.FC = () => {
  const [pools, setPools] = useState<AMCPool[]>([]);
  const [filteredPools, setFilteredPools] = useState<AMCPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPool, setSelectedPool] = useState<AMCPool | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: 'ALL',
    riskLevel: 'ALL',
    apyRange: 'ALL',
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchActivePools();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [pools, searchTerm, filters]);

  const fetchActivePools = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;
      
      const response = await fetch(`${apiUrl}/amc-pools/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // CRITICAL: Only show pools that exist on-chain (have hederaContractId or mantlePoolId)
        const onChainPools = Array.isArray(data) 
          ? data.filter((pool: any) => {
              const hasOnChainId = pool.hederaContractId || pool.mantlePoolId;
              if (!hasOnChainId) {
                console.warn(`⚠️ Skipping database-only pool: ${pool.poolId} (${pool.name})`);
              }
              return hasOnChainId;
            })
          : [];
        setPools(onChainPools);
        console.log(`✅ Filtered to ${onChainPools.length} on-chain pools (excluded ${(Array.isArray(data) ? data.length : 0) - onChainPools.length} database-only pools)`);
      }
    } catch (error) {
      console.error('Failed to fetch active pools:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = pools.filter(pool => {
      // Search filter
      if (searchTerm && !pool.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !pool.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Type filter
      if (filters.type !== 'ALL' && pool.type !== filters.type) {
        return false;
      }

      // Risk level filter
      if (filters.riskLevel !== 'ALL' && pool.metadata.riskLevel !== filters.riskLevel) {
        return false;
      }

      // APY range filter
      if (filters.apyRange !== 'ALL') {
        const apy = pool.expectedAPY;
        switch (filters.apyRange) {
          case 'LOW':
            if (apy > 8) return false;
            break;
          case 'MEDIUM':
            if (apy < 8 || apy > 15) return false;
            break;
          case 'HIGH':
            if (apy < 15) return false;
            break;
        }
      }

      // Status filter
      if (filters.status !== 'ALL' && pool.status !== filters.status) {
        return false;
      }

      return true;
    });

    // Sort by APY descending
    filtered.sort((a, b) => b.expectedAPY - a.expectedAPY);
    setFilteredPools(filtered);
  };

  const handleInvest = async (investmentData: { poolId: string; amount: number; investorAddress: string }) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;
      
      const response = await fetch(`${apiUrl}/amc-pools/${investmentData.poolId}/invest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(investmentData)
      });

      if (response.ok) {
        // Refresh pools to update investment data
        await fetchActivePools();
      } else {
        throw new Error('Investment failed');
      }
    } catch (error) {
      console.error('Investment error:', error);
      throw error;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'text-primary-blue bg-primary-blue';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-100';
      case 'HIGH': return 'text-red-400 bg-red-100';
      default: return 'text-gray-400 bg-gray-100';
    }
  };

  const getLiquidityColor = (liquidity: string) => {
    switch (liquidity) {
      case 'HIGH': return 'text-primary-blue bg-primary-blue';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-100';
      case 'LOW': return 'text-red-400 bg-red-100';
      default: return 'text-gray-400 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getDaysToMaturity = (maturityDate: string) => {
    const days = Math.ceil((new Date(maturityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-off-white p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-gray-800 rounded-lg p-6">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-off-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary-blue mb-2">AMC Investment Pools</h1>
        <p className="text-text-secondary">Invest in diversified pools backed by verified RWA assets</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search pools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary-blue"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-blue"
            >
              <option value="ALL">All Types</option>
              <option value="REAL_ESTATE">Real Estate</option>
              <option value="AGRICULTURAL">Agricultural</option>
              <option value="COMMODITIES">Commodities</option>
              <option value="MIXED">Mixed</option>
            </select>

            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters({...filters, riskLevel: e.target.value})}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-blue"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
            </select>

            <select
              value={filters.apyRange}
              onChange={(e) => setFilters({...filters, apyRange: e.target.value})}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-blue"
            >
              <option value="ALL">All APY</option>
              <option value="LOW">Low APY (&lt;8%)</option>
              <option value="MEDIUM">Medium APY (8-15%)</option>
              <option value="HIGH">High APY (&gt;15%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Active Pools</p>
              <p className="text-2xl font-bold text-primary-blue">{filteredPools.length}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-primary-blue" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Total Value</p>
              <p className="text-2xl font-bold text-blue-400">
                {formatCurrency(filteredPools.reduce((sum, p) => sum + p.totalValue, 0))}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Total Investors</p>
              <p className="text-2xl font-bold text-purple-400">
                {filteredPools.reduce((sum, p) => sum + p.totalInvestors, 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Avg. APY</p>
              <p className="text-2xl font-bold text-orange-400">
                {filteredPools.length > 0 ? 
                  (filteredPools.reduce((sum, p) => sum + p.expectedAPY, 0) / filteredPools.length).toFixed(1) + '%' : 
                  '0%'
                }
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Pools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPools.map((pool) => (
          <div key={pool.poolId} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors cursor-pointer"
               onClick={() => setSelectedPool(pool)}>
            {/* Pool Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary-blue mb-1">{pool.name}</h3>
                <p className="text-sm text-text-secondary line-clamp-2">{pool.description}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(pool.metadata.riskLevel)}`}>
                  {pool.metadata.riskLevel} RISK
                </span>
                <span className="text-2xl font-bold text-primary-blue">{pool.expectedAPY}%</span>
              </div>
            </div>

            {/* Pool Stats */}
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-text-secondary">Total Value</span>
                <span className="font-semibold">{formatCurrency(pool.totalValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Min. Investment</span>
                <span className="font-semibold">{formatCurrency(pool.minimumInvestment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Investors</span>
                <span className="font-semibold">{pool.totalInvestors}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Maturity</span>
                <span className="font-semibold">{getDaysToMaturity(pool.maturityDate)} days</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Funding Progress</span>
                <span>{Math.round((pool.totalInvested / pool.totalValue) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-primary-blue h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((pool.totalInvested / pool.totalValue) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Pool Assets */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-text-secondary">Assets</span>
                <span className="text-sm font-semibold">{pool.assets.length}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {pool.assets.slice(0, 3).map((asset, index) => (
                  <span key={index} className="bg-gray-700 px-2 py-1 rounded text-xs">
                    {asset.name}
                  </span>
                ))}
                {pool.assets.length > 3 && (
                  <span className="bg-gray-700 px-2 py-1 rounded text-xs">
                    +{pool.assets.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPool(pool);
              }}
              className="w-full bg-primary-blue text-black px-4 py-2 rounded-lg font-semibold hover:bg-primary-blue-light transition-colors"
            >
              Invest Now
            </button>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredPools.length === 0 && !loading && (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No pools found</h3>
          <p className="text-text-secondary">Try adjusting your search criteria or filters</p>
        </div>
      )}

      {/* Investment Modal */}
      {selectedPool && (
        <PoolInvestmentInterface
          pool={selectedPool}
          onInvest={handleInvest}
          onClose={() => setSelectedPool(null)}
        />
      )}
    </div>
  );
};

export default PoolMarketplace;
