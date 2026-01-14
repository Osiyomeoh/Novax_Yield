import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
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
  StarOff,
  Plus,
  Minus,
  Clock,
  Zap,
  Eye,
  EyeOff,
  RefreshCw,
  Settings
} from 'lucide-react';

interface PoolData {
  poolId: string;
  name: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  totalValue: number;
  totalInvested: number;
  totalInvestors: number;
  expectedAPY: number;
  isTradeable: boolean;
  status: string;
  metadata: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    liquidity: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}

interface TradingStats {
  volume24h: number;
  volume7d: number;
  tradesCount24h: number;
  tradesCount7d: number;
  activeBuyOrders: number;
  activeSellOrders: number;
}

interface UserOrder {
  orderId: string;
  orderType: 'BUY' | 'SELL';
  tokenAmount: number;
  pricePerToken: number;
  status: string;
  createdAt: Date;
  filledAmount: number;
  remainingAmount: number;
}

const PoolTradingDashboard: React.FC = () => {
  const [pools, setPools] = useState<PoolData[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolData | null>(null);
  const [tradingStats, setTradingStats] = useState<TradingStats | null>(null);
  const [userOrders, setUserOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'history' | 'portfolio'>('overview');
  const [showWatchlist, setShowWatchlist] = useState(true);

  useEffect(() => {
    fetchPools();
  }, []);

  useEffect(() => {
    if (selectedPool) {
      fetchTradingData();
      fetchUserOrders();
    }
  }, [selectedPool]);

  const fetchPools = async () => {
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
              const isTradeableAndActive = pool.isTradeable && pool.status === 'ACTIVE';
              if (!hasOnChainId) {
                console.warn(`⚠️ Skipping database-only pool: ${pool.poolId} (${pool.name})`);
              }
              return hasOnChainId && isTradeableAndActive;
            })
          : [];
        setPools(onChainPools);
        console.log(`✅ Filtered to ${onChainPools.length} on-chain tradeable pools`);
      }
    } catch (error) {
      console.error('Failed to fetch pools:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTradingData = async () => {
    if (!selectedPool) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;
      
      const response = await fetch(`${apiUrl}/trading/stats/${selectedPool.poolId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTradingStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch trading data:', error);
    }
  };

  const fetchUserOrders = async () => {
    if (!selectedPool) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;
      
      const response = await fetch(`${apiUrl}/trading/orders?poolId=${selectedPool.poolId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch user orders:', error);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;
      
      const response = await fetch(`${apiUrl}/trading/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchUserOrders(); // Refresh orders
      } else {
        console.error('Failed to cancel order');
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-400 bg-yellow-100';
      case 'PARTIALLY_FILLED': return 'text-blue-400 bg-blue-100';
      case 'FILLED': return 'text-primary-blue bg-primary-blue';
      case 'CANCELLED': return 'text-red-400 bg-red-100';
      default: return 'text-gray-400 bg-gray-100';
    }
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary-blue mb-2">Pool Trading Dashboard</h1>
          <p className="text-text-secondary">Monitor and trade pool tokens</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowWatchlist(!showWatchlist)}
            className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors"
          >
            {showWatchlist ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            {showWatchlist ? 'Hide' : 'Show'} Watchlist
          </button>
          <button
            onClick={fetchPools}
            className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Total Pools</p>
              <p className="text-2xl font-bold text-primary-blue">{pools.length}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-primary-blue" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Total Volume</p>
              <p className="text-2xl font-bold text-blue-400">
                {formatCurrency(pools.reduce((sum, pool) => sum + pool.volume24h, 0))}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Active Orders</p>
              <p className="text-2xl font-bold text-purple-400">{userOrders.length}</p>
            </div>
            <Activity className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Avg. APY</p>
              <p className="text-2xl font-bold text-orange-400">
                {pools.length > 0 ? 
                  (pools.reduce((sum, pool) => sum + pool.expectedAPY, 0) / pools.length).toFixed(1) + '%' : 
                  '0%'
                }
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Pools List */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Tradeable Pools</h3>
            <div className="space-y-3">
              {pools.map((pool) => (
                <div
                  key={pool.poolId}
                  onClick={() => setSelectedPool(pool)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedPool?.poolId === pool.poolId ? 'bg-primary-blue bg-opacity-20 border border-primary-blue' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm">{pool.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(pool.metadata.riskLevel)}`}>
                      {pool.metadata.riskLevel}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-primary-blue">{formatCurrency(pool.currentPrice)}</span>
                    <span className={`text-sm flex items-center gap-1 ${
                      pool.priceChange24h >= 0 ? 'text-primary-blue' : 'text-red-400'
                    }`}>
                      {pool.priceChange24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(pool.priceChange24h).toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    Vol: {formatCurrency(pool.volume24h)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {selectedPool ? (
            <div className="bg-gray-800 rounded-lg p-6">
              {/* Pool Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-primary-blue mb-2">{selectedPool.name}</h2>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(selectedPool.metadata.riskLevel)}`}>
                      {selectedPool.metadata.riskLevel} RISK
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLiquidityColor(selectedPool.metadata.liquidity)}`}>
                      {selectedPool.metadata.liquidity} LIQUIDITY
                    </span>
                    <span className="text-text-secondary">APY: {selectedPool.expectedAPY}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary-blue">{formatCurrency(selectedPool.currentPrice)}</p>
                  <p className={`text-sm flex items-center justify-end gap-1 ${
                    selectedPool.priceChange24h >= 0 ? 'text-primary-blue' : 'text-red-400'
                  }`}>
                    {selectedPool.priceChange24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {selectedPool.priceChange24h.toFixed(2)}% (24h)
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6">
                {['overview', 'orders', 'history', 'portfolio'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-2 rounded-lg font-medium capitalize ${
                      activeTab === tab ? 'bg-primary-blue text-black' : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Trading Stats */}
                  {tradingStats && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Trading Statistics</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-text-secondary">24h Volume</span>
                          <span className="font-semibold">{formatCurrency(tradingStats.volume24h)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">7d Volume</span>
                          <span className="font-semibold">{formatCurrency(tradingStats.volume7d)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">24h Trades</span>
                          <span className="font-semibold">{tradingStats.tradesCount24h}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Active Buy Orders</span>
                          <span className="font-semibold text-primary-blue">{tradingStats.activeBuyOrders}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Active Sell Orders</span>
                          <span className="font-semibold text-red-400">{tradingStats.activeSellOrders}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pool Info */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Pool Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Total Value</span>
                        <span className="font-semibold">{formatCurrency(selectedPool.totalValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Total Invested</span>
                        <span className="font-semibold">{formatCurrency(selectedPool.totalInvested)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Total Investors</span>
                        <span className="font-semibold">{selectedPool.totalInvestors}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">24h High</span>
                        <span className="font-semibold">{formatCurrency(selectedPool.high24h)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">24h Low</span>
                        <span className="font-semibold">{formatCurrency(selectedPool.low24h)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Your Orders</h3>
                  {userOrders.length > 0 ? (
                    <div className="space-y-3">
                      {userOrders.map((order) => (
                        <div key={order.orderId} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.orderType === 'BUY' ? 'bg-primary-blue text-primary-blue' : 'bg-red-900 text-red-400'
                              }`}>
                                {order.orderType}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </div>
                            <button
                              onClick={() => handleCancelOrder(order.orderId)}
                              disabled={order.status !== 'PENDING' && order.status !== 'PARTIALLY_FILLED'}
                              className="text-red-400 hover:text-red-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                            >
                              Cancel
                            </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-text-secondary">Amount</span>
                              <p className="font-semibold">{formatNumber(order.tokenAmount)}</p>
                            </div>
                            <div>
                              <span className="text-text-secondary">Price</span>
                              <p className="font-semibold">{formatCurrency(order.pricePerToken)}</p>
                            </div>
                            <div>
                              <span className="text-text-secondary">Filled</span>
                              <p className="font-semibold">{formatNumber(order.filledAmount)}</p>
                            </div>
                            <div>
                              <span className="text-text-secondary">Created</span>
                              <p className="font-semibold">{formatTime(order.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-400 mb-2">No Orders Found</h3>
                      <p className="text-text-secondary">You haven't placed any orders for this pool yet.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Trade History</h3>
                  <div className="text-center py-8">
                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">Trade History</h3>
                    <p className="text-text-secondary">Your trade history will appear here.</p>
                  </div>
                </div>
              )}

              {activeTab === 'portfolio' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Portfolio</h3>
                  <div className="text-center py-8">
                    <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">Portfolio View</h3>
                    <p className="text-text-secondary">Your portfolio details will appear here.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Select a Pool</h3>
              <p className="text-text-secondary">Choose a pool from the list to view trading details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoolTradingDashboard;
