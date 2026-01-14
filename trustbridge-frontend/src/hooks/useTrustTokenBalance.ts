import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../contexts/WalletContext';
import { mantleContractService } from '../services/mantleContractService';

export const useTrustTokenBalance = () => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected, signer, provider } = useWallet();
  
  const fetchBalance = async () => {
    if (!address || !isConnected) {
      setBalance(0);
      return;
    }

    // Wait for provider to be available
    if (!provider) {
      setBalance(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Initialize mantleContractService if we have signer and provider
      // getTrustBalance will create a read-only provider if needed
      if (signer && provider) {
        mantleContractService.initialize(signer, provider);
      } else if (provider) {
        // Set provider for read-only access (getTrustBalance will handle it)
        mantleContractService.initialize(null as any, provider);
      }
      // If no provider, getTrustBalance will create a read-only provider

      // Fetch balance from Mantle blockchain (with caching and retry logic)
      const balanceBigInt = await mantleContractService.getTrustBalance(address, true);
      const balanceNumber = parseFloat(ethers.formatEther(balanceBigInt));
      setBalance(balanceNumber);
      
      // Clear error on success
      if (error) {
        setError(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch TRUST token balance from Mantle:', err);
      
      // Provide more helpful error messages
      const errorMessage = err.message || String(err);
      if (errorMessage.includes('too many errors') || err.code === -32002) {
        setError('RPC endpoint rate limited. Please try again in a moment.');
      } else if (errorMessage.includes('missing revert data') || errorMessage.includes('CALL_EXCEPTION')) {
        setError('TRUST token contract not found or not configured. Balance set to 0.');
      } else {
        setError('Failed to fetch TRUST token balance. Using cached value if available.');
      }
      
      // Don't set balance to 0 on error - keep last known value if available
      // setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = () => {
    fetchBalance();
  };

  useEffect(() => {
    // Debounce balance fetching to avoid rapid requests
    const timeoutId = setTimeout(() => {
      fetchBalance();
    }, 500); // Wait 500ms after dependencies change
    
    return () => clearTimeout(timeoutId);
  }, [address, isConnected, signer, provider]);

  return {
    balance,
    loading,
    error,
    refreshBalance
  };
};