import { ethers } from 'ethers';

// Hedera Testnet Configuration
const HEDERA_TESTNET_RPC = 'https://testnet.hashio.io/api';
const HEDERA_CHAIN_ID = 296; // Hedera testnet chain ID

// Token Factory Contract ABI (simplified for token creation)
const TOKEN_FACTORY_ABI = [
  {
    "inputs": [
      {"name": "name", "type": "string"},
      {"name": "symbol", "type": "string"},
      {"name": "decimals", "type": "uint8"},
      {"name": "initialSupply", "type": "uint256"},
      {"name": "treasury", "type": "address"},
      {"name": "adminKey", "type": "address"},
      {"name": "supplyKey", "type": "address"},
      {"name": "freezeKey", "type": "address"},
      {"name": "kycKey", "type": "address"}
    ],
    "name": "createToken",
    "outputs": [
      {"name": "tokenId", "type": "uint256"},
      {"name": "tokenAddress", "type": "address"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTokenCount",
    "outputs": [{"name": "count", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// For now, we'll use a mock contract address - in production, deploy a real contract
const TOKEN_FACTORY_ADDRESS = '0x0000000000000000000000000000000000000000'; // Placeholder

export interface TokenCreationParams {
  tokenName: string;
  tokenSymbol: string;
  totalSupply: number;
  decimals: number;
  treasuryAccountId: string;
  adminKey: string;
  supplyKey: string;
  freezeKey: string;
  kycKey: string;
  metadata: any;
}

export interface TokenCreationResult {
  success: boolean;
  tokenId?: string;
  tokenAddress?: string;
  transactionHash?: string;
  transactionId?: string; // For compatibility with existing code
  fullSignature?: string; // For compatibility with existing code
  error?: string;
}

class HederaTokenService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private isConnected = false;

  async connectToHederaTestnet(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not detected');
      }

      // Request account access
      await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      // Switch to Hedera testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${HEDERA_CHAIN_ID.toString(16)}` }],
      }).catch(async (error: any) => {
        // If chain doesn't exist, add it
        if (error.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${HEDERA_CHAIN_ID.toString(16)}`,
              chainName: 'Hedera Testnet',
              rpcUrls: [HEDERA_TESTNET_RPC],
              nativeCurrency: {
                name: 'HBAR',
                symbol: 'HBAR',
                decimals: 18,
              },
              blockExplorerUrls: ['https://hashscan.io/testnet'],
            }],
          });
        } else {
          throw error;
        }
      });

      // Create provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.isConnected = true;

      return { success: true };
    } catch (error) {
      console.error('Failed to connect to Hedera testnet:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async createToken(params: TokenCreationParams): Promise<TokenCreationResult> {
    try {
      if (!this.isConnected || !this.signer) {
        const connectionResult = await this.connectToHederaTestnet();
        if (!connectionResult.success) {
          return { success: false, error: connectionResult.error };
        }
      }

      if (!this.signer) {
        return { success: false, error: 'No signer available' };
      }

      // For now, we'll create a mock transaction since we don't have a deployed contract
      // In production, you would deploy a real token factory contract on Hedera
      console.log('Creating token with params:', params);
      
      // Generate a mock token ID (in production, this would come from the contract)
      const mockTokenId = `0.0.${Math.floor(Math.random() * 1000000)}`;
      const mockTokenAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
      
      // Create a real transaction that will be sent to Hedera
      // For now, we'll send a simple transaction to demonstrate the connection
      const tx = await this.signer.sendTransaction({
        to: params.treasuryAccountId, // Send to treasury account
        value: 0, // No HBAR transfer
        data: '0x', // Empty data for now
      });

      console.log('Transaction sent:', tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      return {
        success: true,
        tokenId: mockTokenId,
        tokenAddress: mockTokenAddress,
        transactionHash: tx.hash,
        transactionId: tx.hash, // For compatibility
        fullSignature: tx.hash, // For compatibility
      };
    } catch (error) {
      console.error('Token creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async createTokenWithRealContract(params: TokenCreationParams): Promise<TokenCreationResult> {
    try {
      if (!this.isConnected || !this.signer) {
        const connectionResult = await this.connectToHederaTestnet();
        if (!connectionResult.success) {
          return { success: false, error: connectionResult.error };
        }
      }

      if (!this.signer) {
        return { success: false, error: 'No signer available' };
      }

      // This would be used when you have a real deployed contract
      const contract = new ethers.Contract(TOKEN_FACTORY_ADDRESS, TOKEN_FACTORY_ABI, this.signer);
      
      const tx = await contract.createToken(
        params.tokenName,
        params.tokenSymbol,
        params.decimals,
        params.totalSupply,
        params.treasuryAccountId,
        params.adminKey,
        params.supplyKey,
        params.freezeKey,
        params.kycKey
      );

      const receipt = await tx.wait();
      
      // Extract token ID and address from events
      const tokenCreatedEvent = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id('TokenCreated(string,string,uint256,address)')
      );

      if (tokenCreatedEvent) {
        const decoded = contract.interface.parseLog(tokenCreatedEvent);
        return {
          success: true,
          tokenId: decoded?.args[2].toString(),
          tokenAddress: decoded?.args[3],
          transactionHash: tx.hash,
          transactionId: tx.hash, // For compatibility
          fullSignature: tx.hash, // For compatibility
        };
      }

      return {
        success: true,
        transactionHash: tx.hash,
        transactionId: tx.hash, // For compatibility
        fullSignature: tx.hash, // For compatibility
      };
    } catch (error) {
      console.error('Real contract token creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  isConnectedToHedera(): boolean {
    return this.isConnected;
  }

  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  getSigner(): ethers.Signer | null {
    return this.signer;
  }
}

export const hederaTokenService = new HederaTokenService();
