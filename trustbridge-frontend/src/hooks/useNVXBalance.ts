import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { novaxContractService } from '../services/novaxContractService';

export const useNVXBalance = () => {
  const { address, isConnected, provider, signer } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address && provider) {
      fetchBalance();
    } else {
      setBalance(0);
      setLoading(false);
    }
  }, [isConnected, address, provider, signer]);

  const fetchBalance = async () => {
    if (!address || !provider) return;
    
    try {
      setLoading(true);
      
      // Initialize service with provider (signer optional for read operations)
      const currentSigner = signer || await provider.getSigner().catch(() => null);
      novaxContractService.initialize(currentSigner || null, provider);
      
      const balanceBigInt = await novaxContractService.getNVXBalance(address);
      // NVX token has 18 decimals
      const balanceNumber = Number(balanceBigInt) / 1e18;
      setBalance(balanceNumber);
    } catch (error) {
      console.error('Failed to fetch NVX balance:', error);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  return {
    balance,
    loading,
    refreshBalance: fetchBalance
  };
};

