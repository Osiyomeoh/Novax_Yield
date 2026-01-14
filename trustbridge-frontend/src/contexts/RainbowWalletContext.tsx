import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAccount, useBalance, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { ethers } from 'ethers';
import { useWalletClient, usePublicClient } from 'wagmi';
import { mantleContractService } from '../services/mantleContractService';

interface RainbowWalletContextType {
  isConnected: boolean;
  address: string | null;
  accountId: string | null; // Alias for address (compatibility with existing code)
  balance: string | null;
  walletType: 'rainbow' | null;
  signer: ethers.Signer | null;
  provider: ethers.Provider | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  loading: boolean;
  error: string | null;
}

const RainbowWalletContext = createContext<RainbowWalletContextType | undefined>(undefined);

export const RainbowWalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({
    address: address,
    watch: true,
  });
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();

  // Convert walletClient to ethers signer
  const [signer, setSigner] = React.useState<ethers.Signer | null>(null);
  const [provider, setProvider] = React.useState<ethers.Provider | null>(null);

  useEffect(() => {
    const setupProvider = async () => {
      if (walletClient && address) {
        try {
          // Create ethers provider from window.ethereum
          if (window.ethereum) {
            const ethersProvider = new ethers.BrowserProvider(window.ethereum);
            setProvider(ethersProvider);
            
            // Create signer from walletClient using ethers
            const ethersSigner = await ethersProvider.getSigner();
            setSigner(ethersSigner);
            
            // Initialize contract service with signer and provider
            mantleContractService.initialize(ethersSigner, ethersProvider);
          }
        } catch (error) {
          console.error('Failed to setup ethers provider:', error);
          setProvider(null);
          setSigner(null);
        }
      } else {
        setProvider(null);
        setSigner(null);
      }
    };

    setupProvider();
  }, [walletClient, address]);

  const connectWallet = async () => {
    try {
      // Get the first connector (usually MetaMask or WalletConnect)
      const connector = connectors[0];
      if (!connector) {
        throw new Error('No wallet connector available');
      }
      connect({ connector });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    try {
      const signature = await signMessageAsync({ message });
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  };

  const value: RainbowWalletContextType = {
    isConnected: isConnected || false,
    address: address || null,
    accountId: address || null, // Compatibility: accountId = address for EVM
    balance: balanceData ? ethers.formatEther(balanceData.value) : null,
    walletType: isConnected ? 'rainbow' : null,
    signer,
    provider,
    connectWallet,
    disconnectWallet,
    signMessage,
    loading: isConnecting,
    error: null, // Error handling can be added via wagmi hooks if needed
  };

  return (
    <RainbowWalletContext.Provider value={value}>
      {children}
    </RainbowWalletContext.Provider>
  );
};

export const useRainbowWallet = () => {
  const context = useContext(RainbowWalletContext);
  if (context === undefined) {
    throw new Error('useRainbowWallet must be used within a RainbowWalletProvider');
  }
  return context;
};

// Note: useWallet is now exported from PrivyWalletContext via WalletContext
// This export is kept for backward compatibility but should not be used
// export const useWallet = useRainbowWallet;

