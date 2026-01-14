/**
 * Advanced Order Matching Engine
 * Implements order matching, limit orders, and real-time price discovery
 * Compatible with existing trading system
 */

export interface Order {
  id: string;
  poolId: string;
  type: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'STOP';
  amount: number;
  price?: number; // For limit orders
  stopPrice?: number; // For stop orders
  timestamp: number;
  status: 'PENDING' | 'PARTIAL' | 'FILLED' | 'CANCELLED';
  userId: string;
  filledAmount?: number;
  averagePrice?: number;
}

export interface Trade {
  id: string;
  buyOrderId: string;
  sellOrderId: string;
  poolId: string;
  amount: number;
  price: number;
  timestamp: number;
  buyUserId: string;
  sellUserId: string;
}

export interface OrderBook {
  buyOrders: Order[];
  sellOrders: Order[];
  lastPrice?: number;
  priceHistory: { price: number; timestamp: number }[];
}

export class OrderMatchingEngine {
  private orderBooks: Map<string, OrderBook> = new Map();
  private orders: Map<string, Order> = new Map();
  private trades: Trade[] = [];

  constructor() {
    // Initialize with empty order books for each pool
  }

  /**
   * Add a new order to the matching engine
   */
  addOrder(order: Order): { success: boolean; trades: Trade[]; error?: string } {
    try {
      // Validate order
      if (!order.poolId || !order.userId || order.amount <= 0) {
        return { success: false, trades: [], error: 'Invalid order parameters' };
      }

      // Initialize order book for pool if it doesn't exist
      if (!this.orderBooks.has(order.poolId)) {
        this.orderBooks.set(order.poolId, {
          buyOrders: [],
          sellOrders: [],
          priceHistory: []
        });
      }

      // Store order
      this.orders.set(order.id, order);

      // Add to appropriate order book
      const orderBook = this.orderBooks.get(order.poolId)!;
      
      if (order.type === 'BUY') {
        orderBook.buyOrders.push(order);
        orderBook.buyOrders.sort((a, b) => (b.price || 0) - (a.price || 0)); // Descending price
      } else {
        orderBook.sellOrders.push(order);
        orderBook.sellOrders.sort((a, b) => (a.price || 0) - (b.price || 0)); // Ascending price
      }

      // Attempt to match orders
      const trades = this.matchOrders(order.poolId);

      return { success: true, trades };
    } catch (error) {
      return { success: false, trades: [], error: error.message };
    }
  }

  /**
   * Match orders for a specific pool
   */
  private matchOrders(poolId: string): Trade[] {
    const orderBook = this.orderBooks.get(poolId);
    if (!orderBook) return [];

    const newTrades: Trade[] = [];
    let matched = true;

    while (matched) {
      matched = false;

      // Find matching buy and sell orders
      for (let i = 0; i < orderBook.buyOrders.length; i++) {
        const buyOrder = orderBook.buyOrders[i];
        if (buyOrder.status !== 'PENDING') continue;

        for (let j = 0; j < orderBook.sellOrders.length; j++) {
          const sellOrder = orderBook.sellOrders[j];
          if (sellOrder.status !== 'PENDING') continue;

          // Check if orders can match
          if (this.canMatch(buyOrder, sellOrder)) {
            const trade = this.executeTrade(buyOrder, sellOrder);
            newTrades.push(trade);
            matched = true;

            // Update price history
            orderBook.lastPrice = trade.price;
            orderBook.priceHistory.push({
              price: trade.price,
              timestamp: trade.timestamp
            });

            // Remove filled orders from order book
            if (buyOrder.status === 'FILLED') {
              orderBook.buyOrders.splice(i, 1);
              i--;
            }
            if (sellOrder.status === 'FILLED') {
              orderBook.sellOrders.splice(j, 1);
              j--;
            }

            break;
          }
        }
      }
    }

    // Store trades
    this.trades.push(...newTrades);

    return newTrades;
  }

  /**
   * Check if two orders can match
   */
  private canMatch(buyOrder: Order, sellOrder: Order): boolean {
    // Market orders always match
    if (buyOrder.orderType === 'MARKET' || sellOrder.orderType === 'MARKET') {
      return true;
    }

    // Limit orders match if buy price >= sell price
    if (buyOrder.orderType === 'LIMIT' && sellOrder.orderType === 'LIMIT') {
      return (buyOrder.price || 0) >= (sellOrder.price || 0);
    }

    return false;
  }

  /**
   * Execute a trade between two orders
   */
  private executeTrade(buyOrder: Order, sellOrder: Order): Trade {
    const tradeAmount = Math.min(
      buyOrder.amount - (buyOrder.filledAmount || 0),
      sellOrder.amount - (sellOrder.filledAmount || 0)
    );

    // Determine trade price
    let tradePrice: number;
    if (buyOrder.orderType === 'MARKET' && sellOrder.orderType === 'LIMIT') {
      tradePrice = sellOrder.price || 0;
    } else if (buyOrder.orderType === 'LIMIT' && sellOrder.orderType === 'MARKET') {
      tradePrice = buyOrder.price || 0;
    } else if (buyOrder.orderType === 'LIMIT' && sellOrder.orderType === 'LIMIT') {
      tradePrice = sellOrder.price || 0; // Take the sell price (more conservative)
    } else {
      tradePrice = 0; // Market orders - should use current market price
    }

    // Update order status
    buyOrder.filledAmount = (buyOrder.filledAmount || 0) + tradeAmount;
    sellOrder.filledAmount = (sellOrder.filledAmount || 0) + tradeAmount;

    if (buyOrder.filledAmount >= buyOrder.amount) {
      buyOrder.status = 'FILLED';
    } else {
      buyOrder.status = 'PARTIAL';
    }

    if (sellOrder.filledAmount >= sellOrder.amount) {
      sellOrder.status = 'FILLED';
    } else {
      sellOrder.status = 'PARTIAL';
    }

    // Create trade record
    const trade: Trade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      poolId: buyOrder.poolId,
      amount: tradeAmount,
      price: tradePrice,
      timestamp: Date.now(),
      buyUserId: buyOrder.userId,
      sellUserId: sellOrder.userId
    };

    return trade;
  }

  /**
   * Get order book for a specific pool
   */
  getOrderBook(poolId: string): OrderBook | null {
    return this.orderBooks.get(poolId) || null;
  }

  /**
   * Get user's orders
   */
  getUserOrders(userId: string): Order[] {
    return Array.from(this.orders.values()).filter(order => order.userId === userId);
  }

  /**
   * Get recent trades for a pool
   */
  getRecentTrades(poolId: string, limit: number = 20): Trade[] {
    return this.trades
      .filter(trade => trade.poolId === poolId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string, userId: string): { success: boolean; error?: string } {
    const order = this.orders.get(orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (order.userId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (order.status !== 'PENDING' && order.status !== 'PARTIAL') {
      return { success: false, error: 'Order cannot be cancelled' };
    }

    // Remove from order book
    const orderBook = this.orderBooks.get(order.poolId);
    if (orderBook) {
      if (order.type === 'BUY') {
        const index = orderBook.buyOrders.findIndex(o => o.id === orderId);
        if (index !== -1) orderBook.buyOrders.splice(index, 1);
      } else {
        const index = orderBook.sellOrders.findIndex(o => o.id === orderId);
        if (index !== -1) orderBook.sellOrders.splice(index, 1);
      }
    }

    // Update order status
    order.status = 'CANCELLED';
    this.orders.set(orderId, order);

    return { success: true };
  }

  /**
   * Get price statistics for a pool
   */
  getPriceStats(poolId: string): {
    lastPrice?: number;
    priceChange24h?: number;
    high24h?: number;
    low24h?: number;
    volume24h?: number;
  } {
    const orderBook = this.orderBooks.get(poolId);
    if (!orderBook) {
      return {};
    }

    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);

    const recentTrades = this.trades.filter(trade => 
      trade.poolId === poolId && trade.timestamp >= dayAgo
    );

    const prices24h = orderBook.priceHistory.filter(p => p.timestamp >= dayAgo);

    const lastPrice = orderBook.lastPrice;
    const price24hAgo = prices24h[0]?.price;
    const priceChange24h = lastPrice && price24hAgo ? 
      ((lastPrice - price24hAgo) / price24hAgo) * 100 : undefined;

    const high24h = prices24h.length > 0 ? 
      Math.max(...prices24h.map(p => p.price)) : undefined;

    const low24h = prices24h.length > 0 ? 
      Math.min(...prices24h.map(p => p.price)) : undefined;

    const volume24h = recentTrades.reduce((sum, trade) => sum + trade.amount, 0);

    return {
      lastPrice,
      priceChange24h,
      high24h,
      low24h,
      volume24h
    };
  }
}

// Export singleton instance
export const orderMatchingEngine = new OrderMatchingEngine();
