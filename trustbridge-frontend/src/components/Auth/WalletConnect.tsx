import React from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '../../contexts/WalletContext';
import Button from '../UI/Button';

const WalletConnect: React.FC = () => {
  const { connectWallet, isConnected, accountId, walletType, loading, error } = useWallet();

  const handleConnect = async () => {
    try {
      await connectWallet();
      // The AuthContext will automatically handle the flow progression
      // after wallet connection based on user status
    } catch (error) {
      console.error('Failed to connect HashPack wallet:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-off-white mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-gray-300">
          Connect your HashPack wallet to get started
        </p>
      </div>

      <div className="space-y-4">
        <Button
          onClick={handleConnect}
          className="w-full h-14 text-lg font-semibold"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Connecting...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded mr-3"></div>
              Connect HashPack
            </div>
          )}
        </Button>

      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="mt-6 text-center text-sm text-gray-400">
        <p>Supported networks: Hedera Testnet</p>
        <p>This will automatically switch your wallet to Hedera Testnet</p>
      </div>
    </motion.div>
  );
};

export default WalletConnect;