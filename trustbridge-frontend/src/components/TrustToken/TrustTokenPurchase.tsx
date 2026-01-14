import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, ArrowRight, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { useWallet } from '../../contexts/WalletContext';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { useToast } from '../../hooks/useToast';
import { useTransactionBlock } from '../../hooks/useTransactionBlock';
import { ethers } from 'ethers';
import { mantleContractService } from '../../services/mantleContractService';

interface TrustTokenPurchaseProps {
  isOpen: boolean;
  onClose: () => void;
  requiredAmount?: number;
  onSuccess?: (amount: number) => void;
}

const TrustTokenPurchase: React.FC<TrustTokenPurchaseProps> = ({
  isOpen,
  onClose,
  requiredAmount = 0,
  onSuccess
}) => {
  const { address, isConnected, signer, provider } = useWallet();
  const { ready: privyReady } = usePrivy();
  const { wallets } = useWallets();
  const { toast } = useToast();
  const { shouldBlockTransactions, getBlockReason, openProfileCompletionModal } = useTransactionBlock();
  
  const [trustBalance, setTrustBalance] = useState<number>(0);
  const [mntBalance, setMntBalance] = useState<string>('0');
  const [mntAmount, setMntAmount] = useState<string>('0.1');
  const [trustAmount, setTrustAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [exchangeRate] = useState(100); // 1 MNT = 100 TRUST tokens
  const [exchangeFeeRate] = useState(0.05); // 5% fee (0.05 MNT for 1 MNT, 0.005 MNT for 0.1 MNT)

  // Fetch MNT and TRUST balances
  useEffect(() => {
    if (isConnected && address && provider) {
      fetchBalances();
    }
  }, [isConnected, address, provider]);

  // Calculate trust amount when MNT amount changes
  useEffect(() => {
    setTrustAmount(calculateTrustAmount(mntAmount));
  }, [mntAmount]);

  const fetchBalances = async () => {
    await Promise.all([fetchMNTBalance(), fetchTrustBalance()]);
  };

  const fetchMNTBalance = async () => {
    try {
      if (!address) return;
      
      // Initialize mantleContractService if signer and provider are available
      if (signer && provider) {
        mantleContractService.initialize(signer, provider);
      } else if (provider) {
        // For read-only operations, initialize with just provider
        // checkMNTBalance needs provider to get balance
        mantleContractService.initialize(null as any, provider);
      } else {
        console.warn('Provider not available yet, cannot fetch MNT balance');
        return;
      }

      const balance = await mantleContractService.checkMNTBalance(address);
      const formatted = ethers.formatEther(balance);
      setMntBalance(formatted);
    } catch (error) {
      console.error('Failed to fetch MNT balance:', error);
      setMntBalance('0');
    }
  };

  const fetchTrustBalance = async () => {
    try {
      setIsRefreshingBalance(true);
      if (!address) return;
      
      // Initialize mantleContractService if signer and provider are available
      // For read-only operations like getTrustBalance, we can use just provider
      if (signer && provider) {
        mantleContractService.initialize(signer, provider);
      } else if (provider) {
        // Initialize with just provider for read-only access
        mantleContractService.initialize(null as any, provider);
      } else {
        console.warn('Provider not available yet, cannot fetch TRUST balance');
        return;
      }
      
      // Use caching and retry logic
      const balance = await mantleContractService.getTrustBalance(address, true);
      const formatted = parseFloat(ethers.formatEther(balance));
      setTrustBalance(formatted);
    } catch (error: any) {
      console.error('Failed to fetch TRUST balance:', error);
      // Don't reset to 0 on error - keep last known value
      // setTrustBalance(0);
      
      // Log helpful error message
      const errorMessage = error.message || String(error);
      if (errorMessage.includes('too many errors') || error.code === -32002) {
        console.warn('⚠️ RPC rate limited, will retry automatically');
      } else if (errorMessage.includes('missing revert data') || errorMessage.includes('CALL_EXCEPTION')) {
        console.warn('⚠️ TRUST token contract may not be deployed or configured');
      }
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  const calculateTrustAmount = (mnt: string) => {
    const mntNum = parseFloat(mnt) || 0;
    if (mntNum <= 0) return 0;
    // Calculate fee as percentage (5% of amount)
    const fee = mntNum * exchangeFeeRate;
    const netMnt = mntNum - fee;
    const trust = Math.floor(netMnt * exchangeRate);
    return Math.max(0, trust);
  };

  const getExchangeFee = (mnt: string) => {
    const mntNum = parseFloat(mnt) || 0;
    return mntNum * exchangeFeeRate;
  };

  const handleMntChange = (value: string) => {
    setMntAmount(value);
    setTrustAmount(calculateTrustAmount(value));
  };

  const handleExchange = async () => {
    if (!address || !isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first.',
        variant: 'destructive'
      });
      return;
    }

    if (shouldBlockTransactions) {
      toast({
        title: 'Transaction Blocked',
        description: getBlockReason(),
        variant: 'destructive'
      });
      openProfileCompletionModal();
      return;
    }

    const mntNum = parseFloat(mntAmount);
    const fee = getExchangeFee(mntAmount);
    const totalCost = mntNum; // Total cost is just the amount (fee is deducted from it)
    const mntBalanceNum = parseFloat(mntBalance || '0');

    if (totalCost > mntBalanceNum) {
      toast({
        title: 'Insufficient MNT Balance',
        description: `You need ${totalCost.toFixed(4)} MNT but only have ${mntBalanceNum.toFixed(4)} MNT.`,
        variant: 'destructive'
      });
      return;
    }

    if (mntNum < 0.1) {
      toast({
        title: 'Minimum Amount Required',
        description: 'Minimum exchange amount is 0.1 MNT.',
        variant: 'destructive'
      });
      return;
    }

    if (trustAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid MNT amount.',
        variant: 'destructive'
      });
      return;
    }

    setIsExchanging(true);

    try {
      console.log(`Exchanging ${mntAmount} MNT for ${trustAmount} TRUST tokens`);

      // Initialize contract service if needed
      if (signer && provider) {
        mantleContractService.initialize(signer, provider);
      } else {
        throw new Error('Wallet not properly initialized');
      }

      // Execute the exchange
      const exchangeResult = await mantleContractService.exchangeMNTForTrust(
        ethers.parseEther(mntAmount)
      );

      console.log('Exchange successful:', exchangeResult);

      toast({
        title: 'Exchange Successful',
        description: `Successfully exchanged ${mntAmount} MNT for ${trustAmount.toFixed(2)} TRUST tokens. Transaction: ${exchangeResult.txHash.slice(0, 10)}...`,
        variant: 'success'
      });

      // Refresh balances
      await fetchBalances();

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(trustAmount);
      }
      
    } catch (error) {
      console.error('Exchange failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to exchange MNT for TRUST tokens. Please try again.';
      toast({
        title: 'Exchange Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsExchanging(false);
    }
  };

  const suggestedAmounts = [0.1, 0.5, 1.0, 2.0];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 min-h-screen"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-md mx-auto transform -translate-y-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="bg-white border border-gray-200 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200">
              <CardTitle className="text-black flex items-center space-x-2">
                <Coins className="w-5 h-5 text-black" />
                <span>Buy TRUST Tokens</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-600 hover:text-black"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-6">
              {/* Current Balance */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Current Balance</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-black font-semibold">{trustBalance.toFixed(2)} TRUST</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchTrustBalance}
                      disabled={isRefreshingBalance}
                      className="h-6 w-6 p-0"
                      title="Refresh balance"
                    >
                      <RefreshCw className={`w-3 h-3 text-gray-600 ${isRefreshingBalance ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">MNT Balance</span>
                  <span className="text-sm font-mono text-black font-semibold">{parseFloat(mntBalance).toFixed(4)} MNT</span>
                </div>
              </div>

              {/* Required Amount */}
              {requiredAmount > 0 && (
                <div className="bg-black/5 border border-black/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-black" />
                    <span className="text-sm text-black">
                      You need {requiredAmount} TRUST tokens to create this asset
                    </span>
                  </div>
                </div>
              )}

              {/* Exchange Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Amount to Exchange (MNT)
                  </label>
                  <Input
                    type="number"
                    value={mntAmount}
                    onChange={(e) => handleMntChange(e.target.value)}
                    placeholder="0.1"
                    step="0.1"
                    min="0.1"
                    className="bg-white border-gray-300 text-black focus:border-black focus:ring-black/20"
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex space-x-2">
                  {suggestedAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => handleMntChange(amount.toString())}
                      className="flex-1 text-xs border-gray-300 text-black hover:bg-gray-50 hover:border-black"
                    >
                      {amount} MNT
                    </Button>
                  ))}
                </div>

                {/* Exchange Details */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Exchange Rate</span>
                    <span className="text-black font-medium">1 MNT = {exchangeRate} TRUST</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Exchange Fee (5%)</span>
                    <span className="text-gray-900">-{getExchangeFee(mntAmount).toFixed(4)} MNT</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">You'll Receive</span>
                    <span className="text-black font-semibold">{trustAmount} TRUST</span>
                  </div>
                  
                  {/* MNT Distribution Breakdown */}
                  <div className="border-t border-gray-300 pt-3 mt-3">
                    <div className="text-xs text-gray-600 mb-2 font-medium">MNT Distribution:</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Community Treasury</span>
                        <span className="text-black">60% ({(parseFloat(mntAmount) * 0.6).toFixed(2)} MNT)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Platform Operations</span>
                        <span className="text-black">25% ({(parseFloat(mntAmount) * 0.25).toFixed(2)} MNT)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Staking Rewards</span>
                        <span className="text-black">10% ({(parseFloat(mntAmount) * 0.1).toFixed(2)} MNT)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Exchange Fee</span>
                        <span className="text-black">5% ({getExchangeFee(mntAmount).toFixed(4)} MNT)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm font-semibold border-t border-gray-300 pt-2">
                    <span className="text-black">Total Cost</span>
                    <span className="text-black">{parseFloat(mntAmount).toFixed(4)} MNT</span>
                  </div>
                </div>

                {/* Exchange Button */}
                <Button
                  onClick={handleExchange}
                  disabled={isExchanging || trustAmount <= 0 || shouldBlockTransactions}
                  className={`w-full font-semibold ${
                    shouldBlockTransactions 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-black text-white hover:bg-gray-900'
                  }`}
                >
                  {isExchanging ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exchanging...
                    </>
                  ) : shouldBlockTransactions ? (
                    <>
                      {getBlockReason()}
                    </>
                  ) : (
                    <>
                      Exchange {mntAmount} MNT for {trustAmount} TRUST
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>

              {/* Info */}
              <div className="text-xs text-gray-600 text-center">
                TRUST tokens are used for creating and trading RWA assets on TrustBridge. Gas fees are paid in MNT.
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TrustTokenPurchase;
