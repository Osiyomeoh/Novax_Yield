import { ethers } from 'ethers';

// Note: This service is for Ethereum-based trading
// TrustBridge uses Hedera HTS/HCS for trading, not Ethereum contracts
// This file is kept for reference but not used in production

// Deployed contract addresses from hedera-universal-system.json
const TRADING_ENGINE_ADDRESS = "0x6DF144710E0CD4a96D36f50248027ABFe6DDA91A";
const TRUST_TOKEN_ADDRESS = "0x0D46E302DA114B52403747a3487c24d46aEe8352";

export interface Order {
  id: string;
  trader: string;
  tokenContract: string;
  amount: string;
  price: string;
  isBuy: boolean;
  timestamp: string;
  expiry: string;
  isActive: boolean;
}

export interface OrderParams {
  tokenContract: string;
  amount: string;
  price: string;
  isBuy: boolean;
  expiry: string; // ISO date string
}

export interface TradeParams {
  buyOrderId: string;
  sellOrderId: string;
  amount: string;
}

export interface DepositParams {
  tokenContract: string;
  amount: string;
}

class TradingService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private tradingEngineContract: ethers.Contract | null = null;
  private isConnected = false;

  public initialize(provider: ethers.BrowserProvider | null, signer: ethers.Signer | null) {
    this.provider = provider;
    this.signer = signer;
    this.isConnected = !!provider && !!signer;

    if (this.isConnected && this.signer) {
      this.tradingEngineContract = new ethers.Contract(TRADING_ENGINE_ADDRESS, TradingEngineABI.abi, this.signer);
    } else {
      this.tradingEngineContract = null;
    }
    console.log('TradingService initialized:', this.isConnected);
  }

  public async ensureHederaTestnet(): Promise<boolean> {
    if (!window.ethereum) {
      console.error("MetaMask is not installed!");
      return false;
    }

    const HEDERA_TESTNET_CHAIN_ID = '0x128'; // 296 in decimal
    const HEDERA_TESTNET_RPC_URL = 'https://testnet.hashio.io/api';
    const HEDERA_TESTNET_CHAIN_NAME = 'Hedera Testnet';
    const HEDERA_TESTNET_CURRENCY_SYMBOL = 'HBAR';

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });

      if (chainId !== HEDERA_TESTNET_CHAIN_ID) {
        console.log('Switching to Hedera Testnet...');
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: HEDERA_TESTNET_CHAIN_ID }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: HEDERA_TESTNET_CHAIN_ID,
                    chainName: HEDERA_TESTNET_CHAIN_NAME,
                    rpcUrls: [HEDERA_TESTNET_RPC_URL],
                    nativeCurrency: {
                      name: HEDERA_TESTNET_CURRENCY_SYMBOL,
                      symbol: HEDERA_TESTNET_CURRENCY_SYMBOL,
                      decimals: 18,
                    },
                    blockExplorerUrls: ['https://hashscan.io/testnet/'],
                  },
                ],
              });
            } catch (addError) {
              console.error('Failed to add Hedera Testnet:', addError);
              return false;
            }
          } else {
            console.error('Failed to switch to Hedera Testnet:', switchError);
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Error ensuring Hedera Testnet:', error);
      return false;
    }
  }

  public async createOrder(params: OrderParams): Promise<{ success: boolean; orderId?: string; transactionHash?: string; error?: string }> {
    if (!this.tradingEngineContract || !this.signer || !this.isConnected) {
      return { success: false, error: 'Wallet not connected or contract not initialized.' };
    }

    const isHederaTestnet = await this.ensureHederaTestnet();
    if (!isHederaTestnet) {
      return { success: false, error: 'Failed to connect to Hedera Testnet.' };
    }

    try {
      console.log('Creating order with params:', params);

      const tx = await this.tradingEngineContract.createOrder(
        params.tokenContract,
        ethers.parseEther(params.amount),
        ethers.parseEther(params.price),
        params.isBuy,
        Math.floor(new Date(params.expiry).getTime() / 1000) // Convert to Unix timestamp
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Extract order ID from events
      let orderId: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.tradingEngineContract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'OrderCreated') {
            orderId = parsedLog.args.orderId.toString();
            break;
          }
        } catch (e) {
          // Not an OrderCreated event, continue
        }
      }

      return {
        success: true,
        orderId: orderId,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error('Order creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async cancelOrder(orderId: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.tradingEngineContract || !this.signer || !this.isConnected) {
      return { success: false, error: 'Wallet not connected or contract not initialized.' };
    }

    const isHederaTestnet = await this.ensureHederaTestnet();
    if (!isHederaTestnet) {
      return { success: false, error: 'Failed to connect to Hedera Testnet.' };
    }

    try {
      console.log('Cancelling order:', orderId);

      const tx = await this.tradingEngineContract.cancelOrder(orderId);
      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      return {
        success: true,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error('Order cancellation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async deposit(params: DepositParams): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.tradingEngineContract || !this.signer || !this.isConnected) {
      return { success: false, error: 'Wallet not connected or contract not initialized.' };
    }

    const isHederaTestnet = await this.ensureHederaTestnet();
    if (!isHederaTestnet) {
      return { success: false, error: 'Failed to connect to Hedera Testnet.' };
    }

    try {
      console.log('Depositing:', params);

      let tx;
      if (params.tokenContract === '0x0000000000000000000000000000000000000000') {
        // HBAR deposit
        tx = await this.tradingEngineContract.deposit(
          ethers.ZeroAddress,
          0,
          { value: ethers.parseEther(params.amount) }
        );
      } else {
        // ERC20 token deposit
        tx = await this.tradingEngineContract.deposit(
          params.tokenContract,
          ethers.parseEther(params.amount)
        );
      }

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      return {
        success: true,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error('Deposit failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async withdraw(tokenContract: string, amount: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.tradingEngineContract || !this.signer || !this.isConnected) {
      return { success: false, error: 'Wallet not connected or contract not initialized.' };
    }

    const isHederaTestnet = await this.ensureHederaTestnet();
    if (!isHederaTestnet) {
      return { success: false, error: 'Failed to connect to Hedera Testnet.' };
    }

    try {
      console.log('Withdrawing:', { tokenContract, amount });

      const tx = await this.tradingEngineContract.withdraw(
        tokenContract,
        ethers.parseEther(amount)
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      return {
        success: true,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error('Withdrawal failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async getOrderBook(tokenContract: string, isBuy: boolean): Promise<Order[]> {
    if (!this.tradingEngineContract) {
      return [];
    }

    try {
      const orders = await this.tradingEngineContract.getOrderBook(tokenContract, isBuy);
      return orders.map((order: any) => ({
        id: order.id.toString(),
        trader: order.trader,
        tokenContract: order.tokenContract,
        amount: ethers.formatEther(order.amount),
        price: ethers.formatEther(order.price),
        isBuy: order.isBuy,
        timestamp: new Date(Number(order.timestamp) * 1000).toISOString(),
        expiry: new Date(Number(order.expiry) * 1000).toISOString(),
        isActive: order.isActive,
      }));
    } catch (error) {
      console.error('Failed to get order book:', error);
      return [];
    }
  }

  public async getUserOrders(userAddress: string): Promise<string[]> {
    if (!this.tradingEngineContract) {
      return [];
    }

    try {
      const orderIds = await this.tradingEngineContract.getUserOrders(userAddress);
      return orderIds.map((id: any) => id.toString());
    } catch (error) {
      console.error('Failed to get user orders:', error);
      return [];
    }
  }

  public async getBalance(userAddress: string, tokenContract: string): Promise<string> {
    if (!this.tradingEngineContract) {
      return '0';
    }

    try {
      const balance = await this.tradingEngineContract.getBalance(userAddress, tokenContract);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0';
    }
  }

  public async getTradingFee(): Promise<string> {
    if (!this.tradingEngineContract) {
      return '0';
    }

    try {
      const fee = await this.tradingEngineContract.tradingFee();
      return (Number(fee) / 100).toString(); // Convert basis points to percentage
    } catch (error) {
      console.error('Failed to get trading fee:', error);
      return '0';
    }
  }

  public async getOrderLimits(): Promise<{ minAmount: string; maxAmount: string }> {
    if (!this.tradingEngineContract) {
      return { minAmount: '0', maxAmount: '0' };
    }

    try {
      const minAmount = await this.tradingEngineContract.minOrderAmount();
      const maxAmount = await this.tradingEngineContract.maxOrderAmount();
      return {
        minAmount: ethers.formatEther(minAmount),
        maxAmount: ethers.formatEther(maxAmount),
      };
    } catch (error) {
      console.error('Failed to get order limits:', error);
      return { minAmount: '0', maxAmount: '0' };
    }
  }
}

export const tradingService = new TradingService();
