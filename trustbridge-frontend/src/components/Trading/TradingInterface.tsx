import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { useToast } from '../../hooks/useToast';
import { tradingService, Order, OrderParams, DepositParams } from '../../services/tradingService';
import { useWallet } from '../../contexts/WalletContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Wallet
} from 'lucide-react';

const TradingInterface: React.FC = () => {
  const { address, signer } = useWallet();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [userOrders, setUserOrders] = useState<string[]>([]);
  const [balances, setBalances] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orderbook' | 'orders' | 'balances'>('orderbook');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [selectedToken, setSelectedToken] = useState('0x0000000000000000000000000000000000000000'); // HBAR
  const [tradingFee, setTradingFee] = useState('0');
  const [orderLimits, setOrderLimits] = useState({ minAmount: '0', maxAmount: '0' });

  // Order form state
  const [orderForm, setOrderForm] = useState<OrderParams>({
    tokenContract: selectedToken,
    amount: '',
    price: '',
    isBuy: true,
    expiry: '',
  });

  // Deposit form state
  const [depositForm, setDepositForm] = useState<DepositParams>({
    tokenContract: selectedToken,
    amount: '',
  });

  useEffect(() => {
    if (signer) {
      try {
        tradingService.initialize(window.ethereum as any, signer);
        loadData();
      } catch (error) {
        console.error('TradingService initialization failed:', error);
        setLoading(false);
      }
    } else {
      // Load empty data when no wallet is connected
      loadEmptyData();
    }
  }, [signer]);

  const loadEmptyData = () => {
    setLoading(true);
    // Show empty state when no wallet connected
    setOrders([]);
    setTradingFee('2.5');
    setOrderLimits({ minAmount: '10', maxAmount: '10000' });
    setBalances({});
    setLoading(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [buyOrders, sellOrders, userOrdersList, tradingFeeValue, limits] = await Promise.all([
        tradingService.getOrderBook(selectedToken, true),
        tradingService.getOrderBook(selectedToken, false),
        address ? tradingService.getUserOrders(address) : Promise.resolve([]),
        tradingService.getTradingFee(),
        tradingService.getOrderLimits(),
      ]);

      setOrders([...buyOrders, ...sellOrders]);
      setUserOrders(userOrdersList);
      setTradingFee(tradingFeeValue);
      setOrderLimits(limits);

      // Load balances
      if (address) {
        const hbarBalance = await tradingService.getBalance(address, '0x0000000000000000000000000000000000000000');
        setBalances({
          '0x0000000000000000000000000000000000000000': hbarBalance,
        });
      }
    } catch (error) {
      console.error('Failed to load trading data:', error);
      
      // Set empty data when service fails
      setOrders([]);
      setTradingFee('2.5');
      setOrderLimits({ minAmount: '10', maxAmount: '10000' });
      setBalances({});
      
      toast({
        title: "Service Error",
        description: "Failed to load trading data - please try again",
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await tradingService.createOrder(orderForm);
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Order created successfully! Order ID: ${result.orderId}`,
          variant: 'default'
        });
        setShowOrderForm(false);
        setOrderForm({
          tokenContract: selectedToken,
          amount: '',
          price: '',
          isBuy: true,
          expiry: '',
        });
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create order",
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Order creation failed:', error);
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: 'destructive'
      });
    }
  };

  const handleDeposit = async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await tradingService.deposit(depositForm);
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Successfully deposited ${depositForm.amount} ${depositForm.tokenContract === '0x0000000000000000000000000000000000000000' ? 'HBAR' : 'tokens'}`,
          variant: 'default'
        });
        setShowDepositForm(false);
        setDepositForm({
          tokenContract: selectedToken,
          amount: '',
        });
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to deposit",
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Deposit failed:', error);
      toast({
        title: "Error",
        description: "Failed to deposit",
        variant: 'destructive'
      });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const result = await tradingService.cancelOrder(orderId);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Order cancelled successfully",
          variant: 'default'
        });
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to cancel order",
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Order cancellation failed:', error);
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: 'destructive'
      });
    }
  };

  const formatCurrency = (amount: string) => {
    return `${Number(amount).toLocaleString()} HBAR`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const buyOrders = orders.filter(order => order.isBuy && order.isActive);
  const sellOrders = orders.filter(order => !order.isBuy && order.isActive);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-black dark:via-gray-900 dark:to-black">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Demo Mode Notice */}
        {!address && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-400/30 rounded-xl p-6 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3 text-blue-300">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Activity className="w-5 h-5" />
              </div>
              <span className="font-semibold text-lg">Connect Wallet</span>
            </div>
            <p className="text-blue-200 text-sm mt-2 ml-11">
              Connect your wallet to access trading functionality.
            </p>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-blue via-primary-blue-light to-cyan-400 bg-clip-text text-transparent">
              Trading Interface
            </h1>
            <p className="text-gray-300 text-lg mt-2">Trade asset tokens on the secondary market with professional tools</p>
          </div>
          <div className="flex space-x-3">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => setShowDepositForm(true)}
                variant="outline"
                className="border-primary-blue/50 text-primary-blue hover:bg-primary-blue/10 hover:border-primary-blue px-6 py-3 rounded-xl backdrop-blur-sm transition-all duration-300"
              >
                <Wallet className="w-5 h-5 mr-2" />
                Deposit
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => setShowOrderForm(true)}
                className="bg-gradient-to-r from-primary-blue to-primary-blue-light text-black hover:from-primary-blue/90 hover:to-primary-blue-light/90 px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-primary-blue/25"
              >
                <Activity className="w-5 h-5 mr-2" />
                New Order
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex space-x-1 bg-gray-800/50 backdrop-blur-sm p-1 rounded-xl border border-gray-700/50"
        >
          {[
            { id: 'orderbook', label: 'Order Book', icon: TrendingUp },
            { id: 'orders', label: 'My Orders', icon: Clock },
            { id: 'balances', label: 'Balances', icon: DollarSign },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-blue to-primary-blue-light text-black shadow-lg shadow-primary-blue/25'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Order Book Tab */}
        {activeTab === 'orderbook' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Buy Orders */}
            <Card variant="floating" className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm border border-primary-blue/20">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-primary-blue text-xl">
                  <div className="p-2 bg-primary-blue/20 rounded-lg mr-3">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  Buy Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {buyOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-400 text-lg">No buy orders</p>
                      <p className="text-gray-500 text-sm">Orders will appear here when available</p>
                    </div>
                  ) : (
                    buyOrders
                      .sort((a, b) => Number(b.price) - Number(a.price))
                      .map((order, index) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/30 rounded-xl border border-gray-600/30 hover:border-primary-blue/30 transition-all duration-300 group"
                        >
                          <div className="flex-1">
                            <p className="text-white font-semibold text-lg">{formatCurrency(order.amount)}</p>
                            <p className="text-gray-400 text-sm">Amount</p>
                          </div>
                          <div className="text-center flex-1">
                            <p className="text-primary-blue font-bold text-lg">{formatCurrency(order.price)}</p>
                            <p className="text-gray-400 text-sm">Price</p>
                          </div>
                          <div className="text-right flex-1">
                            <p className="text-gray-300 text-sm">{formatDate(order.timestamp)}</p>
                            <p className="text-gray-400 text-xs">Time</p>
                          </div>
                        </motion.div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sell Orders */}
            <Card variant="floating" className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm border border-red-400/20">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-red-400 text-xl">
                  <div className="p-2 bg-red-500/20 rounded-lg mr-3">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  Sell Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sellOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrendingDown className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-400 text-lg">No sell orders</p>
                      <p className="text-gray-500 text-sm">Orders will appear here when available</p>
                    </div>
                  ) : (
                    sellOrders
                      .sort((a, b) => Number(a.price) - Number(b.price))
                      .map((order, index) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/30 rounded-xl border border-gray-600/30 hover:border-red-400/30 transition-all duration-300 group"
                        >
                          <div className="flex-1">
                            <p className="text-white font-semibold text-lg">{formatCurrency(order.amount)}</p>
                            <p className="text-gray-400 text-sm">Amount</p>
                          </div>
                          <div className="text-center flex-1">
                            <p className="text-red-400 font-bold text-lg">{formatCurrency(order.price)}</p>
                            <p className="text-gray-400 text-sm">Price</p>
                          </div>
                          <div className="text-right flex-1">
                            <p className="text-gray-300 text-sm">{formatDate(order.timestamp)}</p>
                            <p className="text-gray-400 text-xs">Time</p>
                          </div>
                        </motion.div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

      {/* My Orders Tab */}
      {activeTab === 'orders' && (
        <Card variant="floating">
          <CardHeader>
            <CardTitle>My Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userOrders.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No orders found</p>
              ) : (
                userOrders.map((orderId) => {
                  const order = orders.find(o => o.id === orderId);
                  if (!order) return null;
                  
                  return (
                    <div
                      key={order.id}
                      className="flex justify-between items-center p-4 bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${order.isBuy ? 'bg-primary-blue/20' : 'bg-red-500/20'}`}>
                          {order.isBuy ? (
                            <ArrowUpRight className="w-4 h-4 text-primary-blue" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-off-white font-medium">
                            {order.isBuy ? 'Buy' : 'Sell'} {formatCurrency(order.amount)}
                          </p>
                          <p className="text-sm text-gray-400">
                            Price: {formatCurrency(order.price)} | {formatDate(order.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          {order.isActive ? (
                            <CheckCircle className="w-4 h-4 text-primary-blue" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                          <span className="text-sm text-gray-300">
                            {order.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {order.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelOrder(order.id)}
                            className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balances Tab */}
      {activeTab === 'balances' && (
        <Card variant="floating">
          <CardHeader>
            <CardTitle>Trading Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(balances).map(([token, balance]) => (
                <div
                  key={token}
                  className="flex justify-between items-center p-4 bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="text-off-white font-medium">
                      {token === '0x0000000000000000000000000000000000000000' ? 'HBAR' : 'Token'}
                    </p>
                    <p className="text-sm text-gray-400">Native currency</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-blue">{formatCurrency(balance)}</p>
                    <p className="text-sm text-gray-400">Available</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

        {/* Create Order Modal */}
        {showOrderForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <Card className="w-full max-w-md mx-4 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary-blue to-primary-blue-light bg-clip-text text-transparent">
                    Create New Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex space-x-3">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button
                        variant={orderForm.isBuy ? "default" : "outline"}
                        onClick={() => setOrderForm(prev => ({ ...prev, isBuy: true }))}
                        className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
                          orderForm.isBuy
                            ? 'bg-gradient-to-r from-primary-blue to-primary-blue-light text-white shadow-lg shadow-primary-blue/25'
                            : 'border-primary-blue/50 text-primary-blue hover:bg-primary-blue/10 hover:border-primary-blue'
                        }`}
                      >
                        Buy
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button
                        variant={!orderForm.isBuy ? "default" : "outline"}
                        onClick={() => setOrderForm(prev => ({ ...prev, isBuy: false }))}
                        className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
                          !orderForm.isBuy
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25'
                            : 'border-red-400/50 text-red-400 hover:bg-red-400/10 hover:border-red-400'
                        }`}
                      >
                        Sell
                      </Button>
                    </motion.div>
                  </div>
              <Input
                label="Amount (HBAR)"
                type="number"
                value={orderForm.amount}
                onChange={(e) => setOrderForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter amount"
              />
              <Input
                label="Price (HBAR)"
                type="number"
                value={orderForm.price}
                onChange={(e) => setOrderForm(prev => ({ ...prev, price: e.target.value }))}
                placeholder="Enter price"
              />
              <Input
                label="Expiry Date"
                type="datetime-local"
                value={orderForm.expiry}
                onChange={(e) => setOrderForm(prev => ({ ...prev, expiry: e.target.value }))}
              />
              <div className="text-sm text-gray-400">
                <p>Trading Fee: {tradingFee}%</p>
                <p>Min Amount: {formatCurrency(orderLimits.minAmount)}</p>
                <p>Max Amount: {formatCurrency(orderLimits.maxAmount)}</p>
              </div>
                  <div className="flex space-x-3">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button
                        variant="outline"
                        onClick={() => setShowOrderForm(false)}
                        className="w-full py-3 rounded-xl border-gray-600/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500 transition-all duration-300"
                      >
                        Cancel
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button
                        onClick={handleCreateOrder}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-blue to-primary-blue-light text-black font-semibold hover:from-primary-blue/90 hover:to-primary-blue-light/90 shadow-lg shadow-primary-blue/25 transition-all duration-300"
                      >
                        Create Order
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Deposit Modal */}
        {showDepositForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <Card className="w-full max-w-md mx-4 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary-blue to-primary-blue-light bg-clip-text text-transparent">
                    Deposit Funds
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Input
                    label="Amount (HBAR)"
                    type="number"
                    value={depositForm.amount}
                    onChange={(e) => setDepositForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                    className="bg-gray-800/50 border-gray-600/50 text-white placeholder:text-gray-400 focus:border-primary-blue focus:ring-primary-blue/20"
                  />
                  <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-600/30">
                    <p className="text-sm text-gray-300 mb-2">Depositing HBAR to trading balance</p>
                    <p className="text-sm text-primary-blue font-semibold">
                      Current Balance: {formatCurrency(balances['0x0000000000000000000000000000000000000000'] || '0')}
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button
                        variant="outline"
                        onClick={() => setShowDepositForm(false)}
                        className="w-full py-3 rounded-xl border-gray-600/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500 transition-all duration-300"
                      >
                        Cancel
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button
                        onClick={handleDeposit}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-blue to-primary-blue-light text-black font-semibold hover:from-primary-blue/90 hover:to-primary-blue-light/90 shadow-lg shadow-primary-blue/25 transition-all duration-300"
                      >
                        Deposit
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TradingInterface;
