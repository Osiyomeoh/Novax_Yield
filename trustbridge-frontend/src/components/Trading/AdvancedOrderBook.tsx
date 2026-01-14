/**
 * Advanced Order Book Component
 * Integrates with existing trading system without breaking changes
 */

import React, { useState, useEffect } from 'react';
import { orderMatchingEngine, Order, OrderBook } from '../../services/OrderMatchingEngine';
import { useWallet } from '../../contexts/WalletContext';
import { useToast } from '../../hooks/useToast';
import { ContractExecuteTransaction, ContractId, Hbar, ContractFunctionParameters, TransferTransaction } from '@hashgraph/sdk';
import { apiService } from '../../services/api';
import { CONTRACT_ADDRESSES } from '../../config/contracts';

interface AdvancedOrderBookProps {
  poolId: string;
  poolName: string;
  currentPrice: number;
  onTradeExecuted?: (trade: any) => void;
}

export const AdvancedOrderBook: React.FC<AdvancedOrderBookProps> = ({
  poolId,
  poolName,
  currentPrice,
  onTradeExecuted
}) => {
  const { accountId, isConnected, signer, hederaClient } = useWallet();
  const { toast } = useToast();
  
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({
    type: 'BUY' as 'BUY' | 'SELL',
    orderType: 'LIMIT' as 'MARKET' | 'LIMIT' | 'STOP',
    amount: '',
    price: '',
    stopPrice: ''
  });

  useEffect(() => {
    if (poolId) {
      loadOrderBook();
      loadUserOrders();
    }
  }, [poolId, accountId]);

  const loadOrderBook = () => {
    const book = orderMatchingEngine.getOrderBook(poolId);
    setOrderBook(book);
  };

  const loadUserOrders = () => {
    if (accountId) {
      const orders = orderMatchingEngine.getUserOrders(accountId);
      setUserOrders(orders);
    }
  };

  const handleSubmitOrder = async () => {
    if (!isConnected || !accountId || !signer) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet to place orders',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('🔧 Advanced Trading: Placing order with REAL user signing...');
      console.log('🔧 Order details:', {
        poolId,
        type: orderForm.type,
        orderType: orderForm.orderType,
        amount: orderForm.amount,
        price: orderForm.price,
        userId: accountId
      });

      // Hedera-native order placement with HTS and HCS
      console.log('🔧 Placing order using Hedera native services...');
      
      // Step 1: User signs the order placement transaction
      console.log('🔧 Requesting user signature for order placement...');
      
      // Create a transaction memo with order details for user to sign
      const orderMemo = JSON.stringify({
        type: 'order_placed',
        poolId,
        orderType: orderForm.type,
        orderOrderType: orderForm.orderType,
        amount: parseFloat(orderForm.amount),
        price: orderForm.price ? parseFloat(orderForm.price) : null,
        userId: accountId,
        timestamp: new Date().toISOString(),
        poolName,
        currentPrice
      });

      // Create a simple transfer transaction with memo for user to sign
      // This ensures the user explicitly approves the order placement
      const orderSignatureTx = new TransferTransaction()
        .setTransactionMemo(orderMemo)
        .setMaxTransactionFee(new Hbar(1)); // Minimal fee for signing

      console.log('🔧 Freezing order signature transaction...');
      const frozenTx = await orderSignatureTx.freezeWithSigner(signer);
      
      console.log('🔧 Requesting signature from HashPack for order placement...');
      const signedTx = await signer.signTransaction(frozenTx);
      
      console.log('🔧 Executing order signature transaction...');
      const response = await signedTx.execute(hederaClient);
      
      console.log('🔧 Getting order signature receipt...');
      const receipt = await response.getReceipt(hederaClient);
      
      const hcsTransactionId = receipt.transactionId.toString();
      console.log('✅ Order placement signed by user:', hcsTransactionId);

      // Step 2: Record the signed order on HCS for permanent audit trail
      try {
        await apiService.post('/hedera/hcs/marketplace/event', {
          type: 'order_placed',
          poolId,
          orderType: orderForm.type,
          orderOrderType: orderForm.orderType,
          amount: parseFloat(orderForm.amount),
          price: orderForm.price ? parseFloat(orderForm.price) : null,
          userId: accountId,
          timestamp: new Date().toISOString(),
          metadata: {
            poolName,
            currentPrice,
            orderId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            signatureTransactionId: hcsTransactionId
          }
        });
        console.log('✅ Signed order recorded on HCS');
      } catch (hcsError) {
        console.warn('⚠️ Failed to record signed order on HCS (non-critical):', hcsError);
      }

      // Step 2: If this is a BUY order with TRUST tokens, we could optionally lock TRUST tokens
      if (orderForm.type === 'BUY' && orderForm.price) {
        console.log('🔧 BUY order detected - TRUST token locking could be implemented here');
        // Future: Could use HTS token allowances to lock TRUST tokens for the order
      }

      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('✅ Hedera-native order placement successful:', orderId);

      // Add to local order book for immediate UI update
      const order: Order = {
        id: orderId,
        poolId,
        type: orderForm.type,
        orderType: orderForm.orderType,
        amount: parseFloat(orderForm.amount),
        price: orderForm.orderType === 'LIMIT' ? parseFloat(orderForm.price) : undefined,
        stopPrice: orderForm.orderType === 'STOP' ? parseFloat(orderForm.stopPrice) : undefined,
        timestamp: Date.now(),
        status: 'PENDING',
        userId: accountId
      };

      const result = orderMatchingEngine.addOrder(order);
      
      if (result.success) {
        toast({
          title: 'Order Placed Successfully!',
          description: `${orderForm.type} order for ${orderForm.amount} tokens placed. Order ID: ${orderId}${hcsTransactionId ? ` | HCS: ${hcsTransactionId}` : ''}`,
          variant: 'default'
        });
        
        // Reset form
        setOrderForm({
          type: 'BUY',
          orderType: 'LIMIT',
          amount: '',
          price: '',
          stopPrice: ''
        });
        setShowOrderForm(false);
        
        // Reload data
        loadOrderBook();
        loadUserOrders();
        
        // Notify parent of trades
        if (result.trades.length > 0 && onTradeExecuted) {
          result.trades.forEach(trade => onTradeExecuted(trade));
        }
      } else {
        toast({
          title: 'Order Failed',
          description: result.error || 'Failed to place order',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('❌ Order placement failed:', error);
      toast({
        title: 'Order Failed',
        description: `Failed to place order: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!accountId || !signer) return;
    
    try {
      console.log('🔧 Advanced Trading: Cancelling order with REAL user signing...');
      console.log('🔧 Order ID:', orderId);
      
      // Hedera-native order cancellation with HCS
      console.log('🔧 Cancelling order using Hedera native services...');
      
      // Step 1: User signs the order cancellation transaction
      console.log('🔧 Requesting user signature for order cancellation...');
      
      // Create a transaction memo with cancellation details for user to sign
      const cancellationMemo = JSON.stringify({
        type: 'order_cancelled',
        orderId,
        poolId,
        userId: accountId,
        timestamp: new Date().toISOString(),
        poolName,
        cancelledBy: accountId,
        cancellationReason: 'user_requested'
      });

      // Create a simple transfer transaction with memo for user to sign
      const cancellationSignatureTx = new TransferTransaction()
        .setTransactionMemo(cancellationMemo)
        .setMaxTransactionFee(new Hbar(1)); // Minimal fee for signing

      console.log('🔧 Freezing cancellation signature transaction...');
      const frozenTx = await cancellationSignatureTx.freezeWithSigner(signer);
      
      console.log('🔧 Requesting signature from HashPack for order cancellation...');
      const signedTx = await signer.signTransaction(frozenTx);
      
      console.log('🔧 Executing cancellation signature transaction...');
      const response = await signedTx.execute(hederaClient);
      
      console.log('🔧 Getting cancellation signature receipt...');
      const receipt = await response.getReceipt(hederaClient);
      
      const hcsTransactionId = receipt.transactionId.toString();
      console.log('✅ Order cancellation signed by user:', hcsTransactionId);

      // Step 2: Record the signed cancellation on HCS for permanent audit trail
      try {
        await apiService.post('/hedera/hcs/marketplace/event', {
          type: 'order_cancelled',
          orderId,
          poolId,
          userId: accountId,
          timestamp: new Date().toISOString(),
          metadata: {
            poolName,
            cancelledBy: accountId,
            cancellationReason: 'user_requested',
            signatureTransactionId: hcsTransactionId
          }
        });
        console.log('✅ Signed cancellation recorded on HCS');
      } catch (hcsError) {
        console.warn('⚠️ Failed to record signed cancellation on HCS (non-critical):', hcsError);
      }

      // Step 2: If the order had locked TRUST tokens, we could unlock them here
      console.log('🔧 Order cancelled - any locked tokens would be released here');

      const cancellationId = `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('✅ Hedera-native order cancellation successful:', cancellationId);

      const result = orderMatchingEngine.cancelOrder(orderId, accountId);
      
      if (result.success) {
        toast({
          title: 'Order Cancelled Successfully!',
          description: `Order cancelled. Cancellation ID: ${cancellationId}${hcsTransactionId ? ` | HCS: ${hcsTransactionId}` : ''}`,
          variant: 'default'
        });
        loadUserOrders();
      } else {
        toast({
          title: 'Cancellation Failed',
          description: result.error || 'Failed to cancel order',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('❌ Order cancellation failed:', error);
      toast({
        title: 'Cancellation Failed',
        description: `Failed to cancel order: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      });
    }
  };

  const priceStats = orderMatchingEngine.getPriceStats(poolId);

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Advanced Trading - {poolName}</h3>
        <button
          onClick={() => setShowOrderForm(!showOrderForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {showOrderForm ? 'Cancel' : 'Place Order'}
        </button>
      </div>

      {/* Price Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Current Price</div>
          <div className="text-white text-lg font-semibold">
            {priceStats.lastPrice ? `$${priceStats.lastPrice.toFixed(4)}` : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">24h Change</div>
          <div className={`text-lg font-semibold ${
            (priceStats.priceChange24h || 0) >= 0 ? 'text-primary-blue' : 'text-red-400'
          }`}>
            {priceStats.priceChange24h ? `${priceStats.priceChange24h.toFixed(2)}%` : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">24h High</div>
          <div className="text-white text-lg font-semibold">
            {priceStats.high24h ? `$${priceStats.high24h.toFixed(4)}` : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">24h Volume</div>
          <div className="text-white text-lg font-semibold">
            {priceStats.volume24h ? `${priceStats.volume24h.toLocaleString()}` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Order Form */}
      {showOrderForm && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-semibold text-white mb-4">Place Order</h4>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Order Type</label>
              <select
                value={orderForm.type}
                onChange={(e) => setOrderForm({ ...orderForm, type: e.target.value as 'BUY' | 'SELL' })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
              >
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-2">Order Type</label>
              <select
                value={orderForm.orderType}
                onChange={(e) => setOrderForm({ ...orderForm, orderType: e.target.value as 'MARKET' | 'LIMIT' | 'STOP' })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
                <option value="STOP">Stop</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Amount</label>
              <input
                type="number"
                value={orderForm.amount}
                onChange={(e) => setOrderForm({ ...orderForm, amount: e.target.value })}
                placeholder="Enter amount"
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
              />
            </div>
            
            {orderForm.orderType === 'LIMIT' && (
              <div>
                <label className="block text-gray-400 text-sm mb-2">Price</label>
                <input
                  type="number"
                  value={orderForm.price}
                  onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                  placeholder="Enter price"
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
                />
              </div>
            )}
            
            {orderForm.orderType === 'STOP' && (
              <div>
                <label className="block text-gray-400 text-sm mb-2">Stop Price</label>
                <input
                  type="number"
                  value={orderForm.stopPrice}
                  onChange={(e) => setOrderForm({ ...orderForm, stopPrice: e.target.value })}
                  placeholder="Enter stop price"
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleSubmitOrder}
            className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
              orderForm.type === 'BUY' 
                ? 'bg-primary-blue hover:bg-primary-blue text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {orderForm.type} {orderForm.orderType} Order
          </button>
        </div>
      )}

      {/* Order Book */}
      <div className="grid grid-cols-2 gap-6">
        {/* Buy Orders */}
        <div>
          <h4 className="text-lg font-semibold text-primary-blue mb-3">Buy Orders</h4>
          <div className="space-y-2">
            {orderBook?.buyOrders.slice(0, 10).map((order) => (
              <div key={order.id} className="flex justify-between items-center bg-gray-800 rounded-lg p-3">
                <div>
                  <div className="text-white font-semibold">${order.price?.toFixed(4) || 'Market'}</div>
                  <div className="text-gray-400 text-sm">{order.amount} tokens</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-400 text-sm">{order.orderType}</div>
                  <div className="text-gray-400 text-sm">{order.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sell Orders */}
        <div>
          <h4 className="text-lg font-semibold text-red-400 mb-3">Sell Orders</h4>
          <div className="space-y-2">
            {orderBook?.sellOrders.slice(0, 10).map((order) => (
              <div key={order.id} className="flex justify-between items-center bg-gray-800 rounded-lg p-3">
                <div>
                  <div className="text-white font-semibold">${order.price?.toFixed(4) || 'Market'}</div>
                  <div className="text-gray-400 text-sm">{order.amount} tokens</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-400 text-sm">{order.orderType}</div>
                  <div className="text-gray-400 text-sm">{order.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Orders */}
      {userOrders.length > 0 && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold text-white mb-3">Your Orders</h4>
          <div className="space-y-2">
            {userOrders.map((order) => (
              <div key={order.id} className="flex justify-between items-center bg-gray-800 rounded-lg p-3">
                <div>
                  <div className="text-white font-semibold">
                    {order.type} {order.orderType} - {order.amount} tokens
                  </div>
                  <div className="text-gray-400 text-sm">
                    Price: ${order.price?.toFixed(4) || 'Market'} | Status: {order.status}
                  </div>
                </div>
                {order.status === 'PENDING' && (
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
