import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Building, 
  TreePine, 
  Factory, 
  Package, 
  Truck,
  Eye,
  Star,
  Share,
  Bookmark,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useWallet } from '../../contexts/WalletContext';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../UI/Card';
import Button from '../UI/Button';

interface RWAAsset {
  assetId: string;
  name: string;
  type: string;
  description: string;
  location: {
    country: string;
    region: string;
    address: string;
  };
  totalValue: number;
  tokenSupply: number;
  tokenizedAmount: number;
  expectedAPY: number;
  maturityDate: string;
  verificationScore: number;
  status: string;
  tokenContract?: string;
  hederaTokenId?: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  availableTokens: number;
}

interface TradingOrder {
  id: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  total: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  timestamp: string;
}

const RWATradingInterface: React.FC = () => {
  const { address } = useWallet();
  const { user } = useAuth();
  const [assets, setAssets] = useState<RWAAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<RWAAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderAmount, setOrderAmount] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [userOrders, setUserOrders] = useState<TradingOrder[]>([]);
  const [userHoldings, setUserHoldings] = useState<any[]>([]);

  useEffect(() => {
    fetchAssets();
    if (address) {
      fetchUserOrders();
      fetchUserHoldings();
    }
  }, [address]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/assets?status=ACTIVE`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch assets: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Add mock trading data for demo
      const assetsWithTradingData = data.map((asset: any) => ({
        ...asset,
        currentPrice: Math.random() * 100 + 10, // Mock price
        priceChange24h: (Math.random() - 0.5) * 20, // Mock price change
        volume24h: Math.random() * 1000000, // Mock volume
        marketCap: asset.totalValue,
        availableTokens: asset.tokenSupply - asset.tokenizedAmount
      }));
      
      setAssets(assetsWithTradingData);
    } catch (error) {
      console.error('Error fetching assets:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserOrders = async () => {
    // Mock user orders for demo
    setUserOrders([
      {
        id: '1',
        type: 'BUY',
        amount: 100,
        price: 45.50,
        total: 4550,
        status: 'FILLED',
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        type: 'SELL',
        amount: 50,
        price: 46.00,
        total: 2300,
        status: 'PENDING',
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const fetchUserHoldings = async () => {
    // Mock user holdings for demo
    setUserHoldings([
      {
        assetId: 'RWA-001-AGRICULTURAL',
        name: 'Premium Coffee Plantation',
        tokens: 100,
        value: 4550,
        pnl: 150
      },
      {
        assetId: 'RWA-002-REAL_ESTATE',
        name: 'Commercial Office Building',
        tokens: 50,
        value: 2300,
        pnl: -100
      }
    ]);
  };

  const placeOrder = async () => {
    if (!selectedAsset || !orderAmount || !orderPrice) {
      alert('Please fill in all order details');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      const orderData = {
        assetId: selectedAsset.assetId,
        type: orderType,
        amount: parseFloat(orderAmount),
        price: parseFloat(orderPrice),
        total: parseFloat(orderAmount) * parseFloat(orderPrice)
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/trading/order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`Failed to place order: ${response.statusText}`);
      }

      // Reset form
      setOrderAmount('');
      setOrderPrice('');
      
      // Refresh data
      fetchUserOrders();
      fetchUserHoldings();
      
      alert('Order placed successfully!');
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order');
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'AGRICULTURAL': return TreePine;
      case 'REAL_ESTATE': return Building;
      case 'EQUIPMENT': return Factory;
      case 'INVENTORY': return Package;
      case 'COMMODITY': return Truck;
      default: return Building;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading RWA trading interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            RWA Asset Trading
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Trade tokenized real-world assets with full transparency and liquidity
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Assets List */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Available RWA Assets
              </h2>
              
              {error ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                  <Button onClick={fetchAssets} className="mt-4">Retry</Button>
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No RWA assets available for trading</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assets.map((asset) => {
                    const AssetIcon = getAssetIcon(asset.type);
                    return (
                      <motion.div
                        key={asset.assetId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedAsset?.assetId === asset.assetId
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => setSelectedAsset(asset)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                              <AssetIcon className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {asset.name}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {asset.type} • {asset.location.country}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(asset.currentPrice)}
                            </div>
                            <div className={`text-sm flex items-center ${
                              asset.priceChange24h >= 0 ? 'text-primary-blue' : 'text-red-600'
                            }`}>
                              {asset.priceChange24h >= 0 ? (
                                <TrendingUp className="w-4 h-4 mr-1" />
                              ) : (
                                <TrendingDown className="w-4 h-4 mr-1" />
                              )}
                              {formatPercentage(asset.priceChange24h)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">APY:</span>
                            <span className="ml-1 font-medium text-gray-900 dark:text-white">
                              {asset.expectedAPY}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Volume:</span>
                            <span className="ml-1 font-medium text-gray-900 dark:text-white">
                              {formatCurrency(asset.volume24h)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Available:</span>
                            <span className="ml-1 font-medium text-gray-900 dark:text-white">
                              {asset.availableTokens.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Trading Panel */}
          <div className="space-y-6">
            {/* Trading Form */}
            {selectedAsset && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Trade {selectedAsset.name}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Order Type
                    </label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setOrderType('BUY')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${
                          orderType === 'BUY'
                            ? 'bg-primary-blue text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => setOrderType('SELL')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${
                          orderType === 'SELL'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Sell
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Amount (Tokens)
                    </label>
                    <input
                      type="number"
                      value={orderAmount}
                      onChange={(e) => setOrderAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price per Token (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={orderPrice}
                      onChange={(e) => setOrderPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter price"
                    />
                  </div>

                  {orderAmount && orderPrice && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Total:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(parseFloat(orderAmount) * parseFloat(orderPrice))}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={placeOrder}
                    disabled={!orderAmount || !orderPrice || !address}
                    className={`w-full ${
                      orderType === 'BUY'
                        ? 'bg-primary-blue hover:bg-primary-blue'
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white`}
                  >
                    {orderType} {selectedAsset.name.split(' ')[0]} Tokens
                  </Button>
                </div>
              </Card>
            )}

            {/* User Holdings */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Your Holdings
              </h3>
              
              {userHoldings.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                  No holdings yet
                </p>
              ) : (
                <div className="space-y-3">
                  {userHoldings.map((holding) => (
                    <div key={holding.assetId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {holding.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {holding.tokens} tokens
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {formatCurrency(holding.value)}
                        </div>
                        <div className={`text-xs ${holding.pnl >= 0 ? 'text-primary-blue' : 'text-red-600'}`}>
                          {formatPercentage(holding.pnl / holding.value * 100)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Orders */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Orders
              </h3>
              
              {userOrders.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                  No recent orders
                </p>
              ) : (
                <div className="space-y-3">
                  {userOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          order.type === 'BUY' ? 'bg-primary-blue' : 'bg-red-500'
                        }`} />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white text-sm">
                            {order.type} {order.amount} tokens
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {formatCurrency(order.price)} per token
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {formatCurrency(order.total)}
                        </div>
                        <div className={`text-xs ${
                          order.status === 'FILLED' ? 'text-primary-blue' : 
                          order.status === 'PENDING' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {order.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RWATradingInterface;
