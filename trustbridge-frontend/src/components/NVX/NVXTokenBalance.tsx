import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Coins, Plus, Loader2 } from 'lucide-react';
import { useWallet } from '../../contexts/WalletContext';
import { novaxContractService } from '../../services/novaxContractService';

interface NVXTokenBalanceProps {
  className?: string;
  showPurchaseButton?: boolean;
}

const NVXTokenBalance: React.FC<NVXTokenBalanceProps> = ({
  className = '',
  showPurchaseButton = true
}) => {
  const navigate = useNavigate();
  const { address, isConnected } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      fetchBalance();
    } else {
      setBalance(0);
    }
  }, [isConnected, address]);

  const fetchBalance = async () => {
    if (!address) return;
    
    try {
      setLoading(true);
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

  const formatBalance = (balance: number) => {
    if (balance >= 1000000) {
      return `${(balance / 1000000).toFixed(2)}M`;
    } else if (balance >= 1000) {
      return `${(balance / 1000).toFixed(1)}K`;
    }
    return balance.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  return (
    <motion.div
      className={`flex items-center space-x-2 ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* NVX Token Icon - Clickable */}
      <button
        onClick={() => navigate('/exchange')}
        className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
        title="View NVX balance and exchange"
      >
        <Coins className="w-3 h-3 text-white" />
      </button>

      {/* Balance - Clickable */}
      <button
        onClick={() => navigate('/exchange')}
        className="flex items-center space-x-1 hover:opacity-80 transition-opacity cursor-pointer"
        title="View NVX balance and exchange"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : (
          <>
            <span className="text-sm font-mono text-gray-600">
              {formatBalance(balance)}
            </span>
            <span className="text-xs text-gray-500">NVX</span>
          </>
        )}
      </button>

      {/* Purchase Button */}
      {showPurchaseButton && (
        <button
          onClick={() => {
            // Navigate to exchange page to buy NVX tokens
            navigate('/exchange');
          }}
          className="w-5 h-5 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center transition-colors relative z-10 shadow-sm cursor-pointer"
          title="Buy NVX tokens"
        >
          <Plus className="w-3 h-3 text-white" />
        </button>
      )}
    </motion.div>
  );
};

export default NVXTokenBalance;

