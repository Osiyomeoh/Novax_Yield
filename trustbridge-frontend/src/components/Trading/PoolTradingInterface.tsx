import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Zap
} from 'lucide-react';

interface PoolTradingData {
  poolId: string;
  name: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  orderBook: {
    bids: { price: number; amount: number; total: number; }[];
    asks: { price: number; amount: number; total: number; }[];
  };
  recentTrades: {
    price: number;
    amount: number;
    timestamp: Date;
    side: 'BUY' | 'SELL';
  }[];
  tradingStats: {
    volume24h: number;
    volume7d: number;
    tradesCount24h: number;
    tradesCount7d: number;
    activeBuyOrders: number;
    activeSellOrders: number;
  };
}

interface OrderForm {
  orderType: 'BUY' | 'SELL';
  tokenAmount: number;
  pricePerToken: number;
  paymentToken: 'HBAR' | 'TRUST' | 'USD';
  isMarketOrder: boolean;
  expiresAt?: Date;
}

const PoolTradingInterface: React.FC = () => {
  console.log('🎯 PoolTradingInterface component rendered');
  const [searchParams] = useSearchParams();
  const [selectedPool, setSelectedPool] = useState<string>('');
  const [availablePools, setAvailablePools] = useState<any[]>([]);
  const [tradingData, setTradingData] = useState<PoolTradingData | null>(null);
  const [orderForm, setOrderForm] = useState<OrderForm>({
    orderType: 'BUY',
    tokenAmount: 0,
    pricePerToken: 0,
    paymentToken: 'HBAR',
    isMarketOrder: false
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'orderbook' | 'trades' | 'chart'>('orderbook');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [trustBalance, setTrustBalance] = useState<number>(0);
  const [hbarBalance, setHbarBalance] = useState<number>(0);

  // Fetch user balances
  const fetchUserBalances = async () => {
    try {
      const walletAddress = localStorage.getItem('walletAddress');
      if (!walletAddress) return;

      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;

      // Fetch TRUST token balance
      const trustResponse = await fetch(`${apiUrl}/hedera/trust-token/balance/${walletAddress}`);
      if (trustResponse.ok) {
        const trustData = await trustResponse.json();
        setTrustBalance(trustData.balance || 0);
      }

      // Fetch HBAR balance
      const hbarResponse = await fetch(`${apiUrl}/hedera/account/balance/${walletAddress}`);
      if (hbarResponse.ok) {
        const hbarData = await hbarResponse.json();
        setHbarBalance(hbarData.balance || 0);
      }
    } catch (error) {
      console.error('Failed to fetch user balances:', error);
    }
  };

  // Fetch available pools
  const fetchAvailablePools = async () => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/amc-pools`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const pools = Array.isArray(data) ? data : data.data?.pools || [];
        console.log('📊 Fetched available pools for trading:', pools.length);
        setAvailablePools(pools);
      }
    } catch (error) {
      console.error('Failed to fetch available pools:', error);
    }
  };

  // Read pool parameter from URL
  useEffect(() => {
    const poolFromUrl = searchParams.get('pool');
    if (poolFromUrl) {
      console.log('🎯 Pool from URL:', poolFromUrl);
      setSelectedPool(poolFromUrl);
    }
  }, [searchParams]);

  // Fetch pools and balances on component mount
  useEffect(() => {
    fetchAvailablePools();
    fetchUserBalances();
  }, []);

  useEffect(() => {
    if (selectedPool) {
      fetchTradingData();
    }
  }, [selectedPool]);

  const fetchTradingData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      if (!token) {
        console.log('⚠️ No authentication token found');
        setTradingData(null);
        return;
      }

      // Try to fetch real trading data
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;
      
      const [orderBookResponse, tradesResponse, statsResponse] = await Promise.all([
        fetch(`${apiUrl}/trading/orderbook/${selectedPool}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${apiUrl}/trading/trades/recent/${selectedPool}?limit=20`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${apiUrl}/trading/stats/${selectedPool}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (orderBookResponse.ok && tradesResponse.ok && statsResponse.ok) {
        const [orderBook, recentTrades, tradingStats] = await Promise.all([
          orderBookResponse.json(),
          tradesResponse.json(),
          statsResponse.json()
        ]);

        // Find the pool name from available pools
        const currentPool = availablePools.find(pool => pool.poolId === selectedPool);
        const poolName = currentPool ? currentPool.name : `Pool ${selectedPool}`;
        
        setTradingData({
          poolId: selectedPool,
          name: poolName,
          currentPrice: orderBook.lastPrice || currentPool?.tokenPrice || 1,
          priceChange24h: orderBook.priceChange24h || 0,
          volume24h: orderBook.volume24h || 0,
          high24h: orderBook.high24h || currentPool?.tokenPrice || 1,
          low24h: orderBook.low24h || currentPool?.tokenPrice || 1,
          orderBook: {
            bids: orderBook.bids || [],
            asks: orderBook.asks || []
          },
          recentTrades: recentTrades.map((trade: any) => ({
            price: trade.pricePerToken,
            amount: trade.tokenAmount,
            timestamp: new Date(trade.executedAt),
            side: trade.buyerAddress === localStorage.getItem('walletAddress') ? 'BUY' : 'SELL'
          })),
          tradingStats
        });

        // Set default price from order book or pool
        const defaultPrice = orderBook.bids.length > 0 && orderBook.asks.length > 0 
          ? (orderBook.bids[0].price + orderBook.asks[0].price) / 2
          : currentPool?.tokenPrice || 1;
        setOrderForm(prev => ({ ...prev, pricePerToken: defaultPrice }));

        console.log('✅ Real trading data loaded:', {
          poolId: selectedPool,
          orderBook: orderBook.bids.length + orderBook.asks.length + ' orders',
          trades: recentTrades.length + ' recent trades',
          stats: tradingStats
        });
      } else {
        // Trading endpoints not available yet - show pool info only
        console.log('⚠️ Trading endpoints not available yet, showing pool info only');
        const currentPool = availablePools.find(pool => pool.poolId === selectedPool);
        if (currentPool) {
          setTradingData({
            poolId: selectedPool,
            name: currentPool.name,
            currentPrice: currentPool.tokenPrice || 1,
            priceChange24h: 0,
            volume24h: 0,
            high24h: currentPool.tokenPrice || 1,
            low24h: currentPool.tokenPrice || 1,
            orderBook: { bids: [], asks: [] },
            recentTrades: [],
            tradingStats: {
              volume24h: 0,
              volume7d: 0,
              tradesCount24h: 0,
              tradesCount7d: 0,
              activeBuyOrders: 0,
              activeSellOrders: 0
            }
          });
          setOrderForm(prev => ({ ...prev, pricePerToken: currentPool.tokenPrice || 1 }));
        } else {
          setTradingData(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch trading data:', error);
      setTradingData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token found');
        alert('Please log in to create orders');
        return;
      }
      
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;
      
      const response = await fetch(`${apiUrl}/trading/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          poolId: selectedPool,
          orderType: orderForm.orderType,
          tokenAmount: orderForm.tokenAmount,
          pricePerToken: orderForm.pricePerToken,
          paymentToken: orderForm.paymentToken || 'TRUST',
          isMarketOrder: orderForm.isMarketOrder
        })
      });

      if (response.ok) {
        const order = await response.json();
        console.log('✅ Order created successfully:', order);
        
        // Reset form and refresh data
        setOrderForm({
          orderType: 'BUY',
          tokenAmount: 0,
          pricePerToken: tradingData?.currentPrice || 0,
          paymentToken: 'TRUST',
          isMarketOrder: false
        });
        setShowOrderForm(false);
        await fetchTradingData();
        
        alert('Order created successfully!');
      } else {
        const error = await response.json();
        console.error('❌ Failed to create order:', error);
        alert(`Failed to create order: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Failed to create order:', error);
      alert(`Failed to create order: ${error.message || 'Network error'}`);
    } finally {
      setLoading(false);
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
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-black text-off-white p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Pool Trading Interface</h1>
        <p className="text-text-secondary">Trade pool tokens on the secondary market</p>
      </div>

      {/* Pool Selection */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Select Pool:</label>
          <select
            value={selectedPool}
            onChange={(e) => setSelectedPool(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-black dark:focus:border-white"
          >
            <option value="">Choose a pool...</option>
            {availablePools.map((pool) => (
              <option key={pool.poolId} value={pool.poolId}>
                {pool.name} - {pool.status} - ${pool.totalValue?.toLocaleString() || '0'}
              </option>
            ))}
          </select>
          {selectedPool && (
            <button
              onClick={() => setShowOrderForm(true)}
              className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg font-semibold hover:bg-black/80 dark:hover:bg-white/80 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Order
            </button>
          )}
        </div>
      </div>

      {selectedPool && (
        <>
          {/* Pool Information Card */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-6">
              {/* Pool Image */}
              <div className="flex-shrink-0">
                {(() => {
                  const currentPool = availablePools.find(pool => pool.poolId === selectedPool);
                  const poolImage = currentPool?.imageURI;
                  const assetImage = currentPool?.assets?.[0]?.imageUrl || currentPool?.assets?.[0]?.imageURI;
                  const imageSrc = poolImage || assetImage || '/placeholder-pool.jpg';
                  
                  return (
                    <img
                      src={imageSrc}
                      alt="Pool Image"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-600"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="%231a1a1a"/><text x="50%" y="50%" font-family="Arial" font-size="16" fill="%2300ff88" text-anchor="middle" dy=".3em">POOL</text></svg>';
                      }}
                    />
                  );
                })()}
              </div>
              
              {/* Pool Details */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
                  {availablePools.find(pool => pool.poolId === selectedPool)?.name || `Pool ${selectedPool}`}
                </h2>
                <p className="text-text-secondary mb-4">
                  {availablePools.find(pool => pool.poolId === selectedPool)?.description || 'Pool trading interface'}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-text-secondary text-sm">Total Value</p>
                    <p className="text-xl font-bold text-black dark:text-white">
                      ${availablePools.find(pool => pool.poolId === selectedPool)?.totalValue?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-sm">Token Price</p>
                    <p className="text-xl font-bold text-black dark:text-white">
                      ${availablePools.find(pool => pool.poolId === selectedPool)?.tokenPrice || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-sm">Expected APY</p>
                    <p className="text-xl font-bold text-black dark:text-white">
                      {availablePools.find(pool => pool.poolId === selectedPool)?.expectedAPY || '0'}%
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-sm">Status</p>
                    <p className={`text-xl font-bold ${availablePools.find(pool => pool.poolId === selectedPool)?.status === 'ACTIVE' ? 'text-black dark:text-white' : 'text-black dark:text-white'}`}>
                      {availablePools.find(pool => pool.poolId === selectedPool)?.status || 'UNKNOWN'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Balance Display */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-4">Your Balances</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-text-secondary text-sm">TRUST Balance</p>
                <p className="text-xl font-bold text-black dark:text-white">
                  {trustBalance.toLocaleString()} TRUST
                </p>
              </div>
              <div className="text-center">
                <p className="text-text-secondary text-sm">HBAR Balance</p>
                <p className="text-xl font-bold text-blue-400">
                  {hbarBalance.toFixed(2)} HBAR
                </p>
              </div>
              <div className="text-center">
                <p className="text-text-secondary text-sm">TRUST Value</p>
                <p className="text-xl font-bold text-black dark:text-white">
                  ${(trustBalance * 0.01).toFixed(2)} USD
                </p>
              </div>
              <div className="text-center">
                <p className="text-text-secondary text-sm">Total Value</p>
                <p className="text-xl font-bold text-yellow-400">
                  ${((trustBalance * 0.01) + (hbarBalance * 0.05)).toFixed(2)} USD
                </p>
              </div>
            </div>
          </div>

          {/* Trust Economy Benefits */}
          <div className="bg-gradient-to-r from-black/20 to-black/20 dark:from-white/20 dark:to-white/20 rounded-lg p-4 mb-6 border border-black/20 dark:border-white/20">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-3 flex items-center gap-2">
              <Star className="w-5 h-5" />
              Trust Economy Benefits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-black dark:text-white mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white">Lower Trading Fees</p>
                  <p className="text-gray-400">0.1% with TRUST vs 0.5% with HBAR</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-black dark:text-white mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white">Deflationary Token</p>
                  <p className="text-gray-400">TRUST tokens burned on usage</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-black dark:text-white mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white">Governance Rights</p>
                  <p className="text-gray-400">Vote on platform decisions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trading Interface - Only show if trading data is available */}
          {tradingData && (
            <>
              {/* Price Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Current Price</p>
                  <p className="text-2xl font-bold text-black dark:text-white">{formatCurrency(tradingData.currentPrice)}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-black dark:text-white" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">24h Change</p>
                  <p className={`text-2xl font-bold flex items-center gap-1 ${
                    tradingData.priceChange24h >= 0 ? 'text-black dark:text-white' : 'text-black dark:text-white'
                  }`}>
                    {tradingData.priceChange24h >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    {tradingData.priceChange24h.toFixed(2)}%
                  </p>
                </div>
                <Activity className="w-8 h-8 text-black dark:text-white" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">24h Volume</p>
                  <p className="text-2xl font-bold text-purple-400">{formatCurrency(tradingData.volume24h)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">24h High/Low</p>
                  <p className="text-lg font-bold text-orange-400">
                    {formatCurrency(tradingData.high24h)} / {formatCurrency(tradingData.low24h)}
                  </p>
                </div>
                <Target className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </div>

          {/* Main Trading Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Book */}
            <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-black dark:text-white">Order Book</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('orderbook')}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      activeTab === 'orderbook' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-700 text-white'
                    }`}
                  >
                    Order Book
                  </button>
                  <button
                    onClick={() => setActiveTab('trades')}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      activeTab === 'trades' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-700 text-white'
                    }`}
                  >
                    Recent Trades
                  </button>
                </div>
              </div>

              {activeTab === 'orderbook' && (
                <div className="space-y-4">
                  {/* Sell Orders (Asks) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm font-medium text-red-400 mb-2">
                      <span>Price</span>
                      <span>Amount</span>
                      <span>Total</span>
                    </div>
                    {tradingData.orderBook.asks.slice(0, 10).map((ask, index) => (
                      <div key={index} className="flex justify-between text-sm hover:bg-gray-100 p-1 rounded">
                        <span className="text-red-400">{formatCurrency(ask.price)}</span>
                        <span>{formatNumber(ask.amount)}</span>
                        <span>{formatCurrency(ask.total)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Spread */}
                  <div className="border-t border-gray-600 pt-2">
                    <div className="text-center text-sm text-text-secondary">
                      Spread: {formatCurrency(tradingData.orderBook.asks[0]?.price - tradingData.orderBook.bids[0]?.price || 0)}
                    </div>
                  </div>

                  {/* Buy Orders (Bids) */}
                  <div className="space-y-1">
                    {tradingData.orderBook.bids.slice(0, 10).map((bid, index) => (
                      <div key={index} className="flex justify-between text-sm hover:bg-gray-100 p-1 rounded">
                        <span className="text-black dark:text-white">{formatCurrency(bid.price)}</span>
                        <span>{formatNumber(bid.amount)}</span>
                        <span>{formatCurrency(bid.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'trades' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium text-text-secondary mb-2">
                    <span>Time</span>
                    <span>Price</span>
                    <span>Amount</span>
                    <span>Side</span>
                  </div>
                  {tradingData.recentTrades.map((trade, index) => (
                    <div key={index} className="flex justify-between text-sm hover:bg-gray-100 p-2 rounded">
                      <span>{formatTime(trade.timestamp)}</span>
                      <span className={trade.side === 'BUY' ? 'text-black dark:text-white' : 'text-black dark:text-white'}>
                        {formatCurrency(trade.price)}
                      </span>
                      <span>{formatNumber(trade.amount)}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        trade.side === 'BUY' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-black dark:bg-white text-white dark:text-black'
                      }`}>
                        {trade.side}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trading Stats */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-black dark:text-white mb-4">Trading Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-text-secondary">24h Volume</span>
                  <span className="font-semibold">{formatCurrency(tradingData.tradingStats.volume24h)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">7d Volume</span>
                  <span className="font-semibold">{formatCurrency(tradingData.tradingStats.volume7d)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">24h Trades</span>
                  <span className="font-semibold">{tradingData.tradingStats.tradesCount24h}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">7d Trades</span>
                  <span className="font-semibold">{tradingData.tradingStats.tradesCount7d}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Buy Orders</span>
                  <span className="font-semibold text-black dark:text-white">{tradingData.tradingStats.activeBuyOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Sell Orders</span>
                  <span className="font-semibold text-red-400">{tradingData.tradingStats.activeSellOrders}</span>
                </div>
              </div>
            </div>
          </div>
            </>
          )}

          {/* Show message if no trading data available */}
          {!tradingData && !loading && (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">Trading Not Available</h3>
              <p className="text-text-secondary mb-4">
                Trading features for this pool are not yet implemented. The pool is active and ready for investment, but secondary market trading is coming soon.
              </p>
              <div className="text-sm text-gray-400">
                Pool Status: {availablePools.find(pool => pool.poolId === selectedPool)?.status || 'UNKNOWN'}
              </div>
            </div>
          )}
          
          {/* Show loading state */}
          {loading && (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
              </div>
              <p className="text-text-secondary">Loading trading data...</p>
            </div>
          )}
        </>
      )}

      {/* Order Form Modal */}
      {showOrderForm && tradingData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-black dark:text-white">Create Order</h2>
              <button
                onClick={() => setShowOrderForm(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Order Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrderForm({...orderForm, orderType: 'BUY'})}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                      orderForm.orderType === 'BUY' 
                        ? 'bg-black dark:bg-white text-white dark:text-black' 
                        : 'bg-gray-200 text-black hover:bg-gray-300'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setOrderForm({...orderForm, orderType: 'SELL'})}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                      orderForm.orderType === 'SELL' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-200 text-black hover:bg-gray-300'
                    }`}
                  >
                    Sell
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Token Amount</label>
                <input
                  type="number"
                  value={orderForm.tokenAmount}
                  onChange={(e) => setOrderForm({...orderForm, tokenAmount: parseFloat(e.target.value) || 0})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-black dark:focus:border-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Price per Token</label>
                <input
                  type="number"
                  value={orderForm.pricePerToken}
                  onChange={(e) => setOrderForm({...orderForm, pricePerToken: parseFloat(e.target.value) || 0})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-black dark:focus:border-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Payment Token</label>
                <select
                  value={orderForm.paymentToken}
                  onChange={(e) => setOrderForm({...orderForm, paymentToken: e.target.value as any})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-black dark:focus:border-white"
                >
                  <option value="TRUST">TRUST (Recommended - Lower fees)</option>
                  <option value="HBAR">HBAR (Higher fees)</option>
                  <option value="USD">USD (Fiat)</option>
                </select>
                <div className="mt-2 text-sm text-gray-400">
                  {orderForm.paymentToken === 'TRUST' && (
                    <div className="flex items-center gap-2 text-black dark:text-white">
                      <CheckCircle className="w-4 h-4" />
                      <span>Lower trading fees (0.1% vs 0.5%)</span>
                    </div>
                  )}
                  {orderForm.paymentToken === 'HBAR' && (
                    <div className="flex items-center gap-2 text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Higher trading fees (0.5%)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="marketOrder"
                  checked={orderForm.isMarketOrder}
                  onChange={(e) => setOrderForm({...orderForm, isMarketOrder: e.target.checked})}
                  className="w-4 h-4 text-black dark:text-white bg-gray-700 border-gray-600 rounded focus:ring-black dark:focus:ring-white"
                />
                <label htmlFor="marketOrder" className="text-sm">Market Order</label>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Order Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Value</span>
                    <span>{formatCurrency(orderForm.tokenAmount * orderForm.pricePerToken)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trading Fee</span>
                    <span>{formatCurrency(orderForm.tokenAmount * orderForm.pricePerToken * 0.001)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCreateOrder}
                  disabled={loading || orderForm.tokenAmount <= 0 || orderForm.pricePerToken <= 0}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                    loading || orderForm.tokenAmount <= 0 || orderForm.pricePerToken <= 0
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : orderForm.orderType === 'BUY'
                        ? 'bg-black dark:bg-white text-white dark:text-black hover:bg-black/80 dark:hover:bg-white/80'
                        : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {loading ? 'Creating...' : `${orderForm.orderType} Order`}
                </button>
                <button
                  onClick={() => setShowOrderForm(false)}
                  className="flex-1 py-2 px-4 rounded-lg font-semibold bg-gray-200 text-black hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoolTradingInterface;
