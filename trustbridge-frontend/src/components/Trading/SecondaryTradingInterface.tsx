import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Users, 
  Activity,
  ArrowUpDown,
  PieChart,
  Target,
  Zap
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useWallet } from '../../contexts/WalletContext';

interface TradingPool {
  poolId: string;
  tokenId: string;
  name: string;
  totalValue: number;
  tokenSupply: number;
  pricePerToken: number;
  expectedAPY: number;
  minInvestment: number;
  maxInvestment: number;
  tradingFee: number;
  liquidityReward: number;
  totalVolume: number;
  activeTraders: number;
  status: string;
  tradingEnabled: boolean;
}

interface TradeOrder {
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  fee: number;
}

const SecondaryTradingInterface: React.FC = () => {
  const [pools, setPools] = useState<TradingPool[]>([]);
  const [selectedPool, setSelectedPool] = useState<TradingPool | null>(null);
  const [tradeOrder, setTradeOrder] = useState<TradeOrder>({
    type: 'buy',
    amount: 0,
    price: 0,
    total: 0,
    fee: 0
  });
  const [isTrading, setIsTrading] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [userTokens, setUserTokens] = useState(0);

  const { isConnected, accountId, signer, hederaClient } = useWallet();
  const { toast } = useToast();

  useEffect(() => {
    loadTradingPools();
    if (accountId) {
      loadUserBalances();
    }
  }, [accountId]);

  const loadTradingPools = async () => {
    try {
      // Load pools from localStorage (in production, this would be from backend)
      const poolsData = JSON.parse(localStorage.getItem('tradingPools') || '[]');
      const assetsData = JSON.parse(localStorage.getItem('assetReferences') || '[]');
      
      // Combine pool data with asset data
      const combinedPools = poolsData.map((pool: any) => {
        const asset = assetsData.find((a: any) => a.tokenId === pool.tokenId);
        return {
          ...pool,
          name: asset?.name || 'Unknown Asset',
          totalValue: asset?.totalValue || 0,
          tokenSupply: asset?.tokenSupply || 0,
          pricePerToken: asset?.pricePerToken || 0,
          expectedAPY: asset?.expectedAPY || 0
        };
      });

      setPools(combinedPools);
    } catch (error) {
      console.error('Failed to load trading pools:', error);
    }
  };

  const loadUserBalances = async () => {
    if (!accountId) return;

    try {
      // Load user's TRUST token balance
      const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`);
      const data = await response.json();
      
      // Find TRUST token balance
      const trustToken = data.balance?.tokens?.find((t: any) => t.token_id === '0.0.6935064');
      setUserBalance(trustToken ? parseInt(trustToken.balance) / 1000000 : 0);

      // Load user's RWA token balances
      if (selectedPool) {
        const tokenResponse = await fetch(
          `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?token.id=${selectedPool.tokenId}`
        );
        const tokenData = await tokenResponse.json();
        
        if (tokenData.tokens && tokenData.tokens.length > 0) {
          setUserTokens(parseInt(tokenData.tokens[0].balance) / 1000000);
        } else {
          setUserTokens(0);
        }
      }
    } catch (error) {
      console.error('Failed to load user balances:', error);
    }
  };

  const calculateTrade = (amount: number, price: number, type: 'buy' | 'sell') => {
    const total = amount * price;
    const fee = (total * 0.01) / 100; // 1% trading fee
    const netTotal = type === 'buy' ? total + fee : total - fee;

    setTradeOrder({
      type,
      amount,
      price,
      total: netTotal,
      fee
    });
  };

  const executeTrade = async () => {
    if (!isConnected || !accountId || !selectedPool) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your HashPack wallet to trade.',
        variant: 'destructive'
      });
      return;
    }

    if (tradeOrder.amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount to trade.',
        variant: 'destructive'
      });
      return;
    }

    setIsTrading(true);
    try {
      console.log('🔄 Executing trade:', tradeOrder);

      // In a real implementation, this would call the PoolManager contract
      // For now, we'll simulate the trade
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update user balances
      await loadUserBalances();

      toast({
        title: 'Trade Executed Successfully!',
        description: `${tradeOrder.type === 'buy' ? 'Bought' : 'Sold'} ${tradeOrder.amount} tokens for ${tradeOrder.total.toFixed(2)} TRUST`,
        variant: 'default'
      });

      // Reset trade order
      setTradeOrder({
        type: 'buy',
        amount: 0,
        price: 0,
        total: 0,
        fee: 0
      });

    } catch (error) {
      console.error('Trade execution failed:', error);
      toast({
        title: 'Trade Failed',
        description: 'Failed to execute trade. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsTrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-off-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Secondary Trading Pools</h1>
          <p className="text-gray-400">
            Trade fractional ownership of RWA assets with instant liquidity
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trading Pools List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary-blue-light" />
                  Available Pools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pools.map((pool) => (
                    <div
                      key={pool.poolId}
                      onClick={() => {
                        setSelectedPool(pool);
                        setTradeOrder(prev => ({ ...prev, price: pool.pricePerToken }));
                        loadUserBalances();
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedPool?.poolId === pool.poolId
                          ? 'border-primary-blue-light bg-primary-blue-light/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{pool.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${
                          pool.tradingEnabled 
                            ? 'bg-primary-blue/20 text-primary-blue' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {pool.tradingEnabled ? 'Active' : 'Pending'}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-400">
                        <div className="flex justify-between">
                          <span>Value:</span>
                          <span className="text-primary-blue-light">${pool.totalValue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>APY:</span>
                          <span className="text-primary-blue">{pool.expectedAPY}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span>${pool.pricePerToken.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Volume:</span>
                          <span>${pool.totalVolume.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Trading Interface */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            {selectedPool ? (
              <div className="space-y-6">
                {/* Pool Information */}
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary-blue-light" />
                      {selectedPool.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary-blue-light">
                          ${selectedPool.totalValue.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-400">Total Value</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary-blue">
                          {selectedPool.expectedAPY}%
                        </div>
                        <div className="text-sm text-gray-400">Expected APY</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {selectedPool.activeTraders}
                        </div>
                        <div className="text-sm text-gray-400">Active Traders</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          ${selectedPool.totalVolume.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-400">Total Volume</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Trading Form */}
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowUpDown className="w-5 h-5 text-primary-blue-light" />
                      Trade
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Trade Type */}
                      <div className="flex gap-2">
                        <Button
                          variant={tradeOrder.type === 'buy' ? 'default' : 'outline'}
                          onClick={() => setTradeOrder(prev => ({ ...prev, type: 'buy' }))}
                          className="flex-1"
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Buy
                        </Button>
                        <Button
                          variant={tradeOrder.type === 'sell' ? 'default' : 'outline'}
                          onClick={() => setTradeOrder(prev => ({ ...prev, type: 'sell' }))}
                          className="flex-1"
                        >
                          <TrendingDown className="w-4 h-4 mr-2" />
                          Sell
                        </Button>
                      </div>

                      {/* Amount Input */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Amount (Tokens)
                        </label>
                        <Input
                          type="number"
                          value={tradeOrder.amount}
                          onChange={(e) => {
                            const amount = parseFloat(e.target.value) || 0;
                            calculateTrade(amount, tradeOrder.price, tradeOrder.type);
                          }}
                          placeholder="Enter amount"
                          className="w-full"
                        />
                      </div>

                      {/* Price Input */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Price per Token (TRUST)
                        </label>
                        <Input
                          type="number"
                          value={tradeOrder.price}
                          onChange={(e) => {
                            const price = parseFloat(e.target.value) || 0;
                            calculateTrade(tradeOrder.amount, price, tradeOrder.type);
                          }}
                          placeholder="Enter price"
                          className="w-full"
                        />
                      </div>

                      {/* Trade Summary */}
                      {tradeOrder.amount > 0 && tradeOrder.price > 0 && (
                        <div className="bg-gray-800 p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">Trade Summary</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Amount:</span>
                              <span>{tradeOrder.amount} tokens</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Price:</span>
                              <span>{tradeOrder.price} TRUST</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Trading Fee:</span>
                              <span>{tradeOrder.fee.toFixed(4)} TRUST</span>
                            </div>
                            <div className="flex justify-between font-semibold text-primary-blue-light">
                              <span>Total:</span>
                              <span>{tradeOrder.total.toFixed(4)} TRUST</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* User Balances */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-800 p-3 rounded">
                          <div className="text-gray-400">TRUST Balance</div>
                          <div className="font-semibold">{userBalance.toFixed(2)} TRUST</div>
                        </div>
                        <div className="bg-gray-800 p-3 rounded">
                          <div className="text-gray-400">Token Balance</div>
                          <div className="font-semibold">{userTokens.toFixed(2)} tokens</div>
                        </div>
                      </div>

                      {/* Execute Trade Button */}
                      <Button
                        onClick={executeTrade}
                        disabled={isTrading || tradeOrder.amount <= 0 || tradeOrder.price <= 0}
                        className="w-full"
                      >
                        {isTrading ? (
                          <>
                            <Activity className="w-4 h-4 mr-2 animate-spin" />
                            Executing Trade...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Execute Trade
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Select a Trading Pool</h3>
                    <p className="text-gray-400">
                      Choose a pool from the left to start trading fractional RWA assets
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SecondaryTradingInterface;


