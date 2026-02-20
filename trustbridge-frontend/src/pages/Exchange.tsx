import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/UI/Card';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import { useToast } from '../hooks/useToast';
import { useWallet } from '../contexts/WalletContext';
import { novaxContractService } from '../services/novaxContractService';
import { ethers } from 'ethers';
import { 
  ArrowLeftRight, 
  ArrowDownUp,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Coins,
  TrendingUp,
  Info
} from 'lucide-react';

const Exchange: React.FC = () => {
  const { address, isConnected, provider } = useWallet();
  const { toast } = useToast();
  
  const [nvxBalance, setNvxBalance] = useState<number>(0);
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [ethAmount, setEthAmount] = useState<string>('');
  const [nvxAmount, setNvxAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [exchangeDirection, setExchangeDirection] = useState<'ETH_TO_NVX' | 'NVX_TO_ETH'>('ETH_TO_NVX');
  const [exchangeRate] = useState(100); // 1 ETH = 100 NVX tokens
  const [exchangeFee] = useState(0.001); // 0.001 ETH fee
  
  useEffect(() => {
    if (isConnected && address) {
      fetchBalances();
    }
  }, [isConnected, address]);

  const fetchBalances = async () => {
    await Promise.all([fetchNVXBalance(), fetchEthBalance()]);
  };

  const fetchNVXBalance = async () => {
    try {
      setIsLoading(true);
      if (!address) return;
      console.log('🔍 Fetching NVX balance for address:', address);
      const balanceBigInt = await novaxContractService.getNVXBalance(address);
      const balanceNumber = Number(balanceBigInt) / 1e18; // NVX has 18 decimals
      console.log('📊 NVX balance received:', balanceNumber);
      setNvxBalance(balanceNumber);
    } catch (error) {
      console.error('Failed to fetch NVX balance:', error);
      setNvxBalance(0);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEthBalance = async () => {
    try {
      if (!address || !provider) return;
      const balance = await provider.getBalance(address);
      const balanceInEth = ethers.formatEther(balance);
      setEthBalance(balanceInEth);
    } catch (error) {
      console.error('Failed to fetch ETH balance:', error);
      setEthBalance('0');
    }
  };

  const calculateNVXAmount = (eth: string) => {
    const ethNum = parseFloat(eth) || 0;
    if (ethNum <= exchangeFee) return 0;
    const nvx = Math.floor((ethNum - exchangeFee) * exchangeRate);
    return Math.max(0, nvx);
  };

  const calculateEthAmount = (nvx: string) => {
    const nvxNum = parseFloat(nvx) || 0;
    const eth = (nvxNum / exchangeRate) + exchangeFee;
    return eth;
  };

  const handleAmountChange = (value: string) => {
    if (exchangeDirection === 'ETH_TO_NVX') {
      setEthAmount(value);
      setNvxAmount(calculateNVXAmount(value));
    } else {
      setNvxAmount(parseFloat(value) || 0);
      setEthAmount(calculateEthAmount(value).toFixed(6));
    }
  };

  const handleSwap = () => {
    setExchangeDirection(prev => prev === 'ETH_TO_NVX' ? 'NVX_TO_ETH' : 'ETH_TO_NVX');
    setEthAmount('');
    setNvxAmount(0);
  };

  const handleExchange = async () => {
    if (!address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to exchange tokens',
        variant: 'destructive'
      });
      return;
    }

    if (!provider) {
      toast({
        title: 'Provider Not Available',
        description: 'Please reconnect your wallet',
        variant: 'destructive'
      });
      return;
    }

    if (exchangeDirection === 'ETH_TO_NVX') {
      if (!ethAmount || parseFloat(ethAmount) <= 0) {
        toast({
          title: 'Invalid Amount',
          description: 'Please enter a valid ETH amount',
          variant: 'destructive'
        });
        return;
      }

      if (parseFloat(ethAmount) > parseFloat(ethBalance || '0')) {
        toast({
          title: 'Insufficient Balance',
          description: 'You do not have enough ETH for this exchange',
          variant: 'destructive'
        });
        return;
      }

      setIsExchanging(true);

      try {
        console.log(`Exchanging ${ethAmount} ETH for ${nvxAmount} NVX tokens`);
        
        // TODO: Implement ETH to NVX exchange using novaxContractService
        // This would require a swap contract or DEX integration
        toast({
          title: 'Coming Soon',
          description: 'ETH to NVX exchange will be available soon. Please use a DEX to swap ETH for NVX.',
          variant: 'default'
        });

        // Refresh balances
        await fetchBalances();
        setEthAmount('');
        setNvxAmount(0);
      } catch (error: any) {
        console.error('Exchange failed:', error);
        toast({
          title: 'Exchange Failed',
          description: error.message || 'Failed to exchange tokens',
          variant: 'destructive'
        });
      } finally {
        setIsExchanging(false);
      }
    } else {
      // NVX_TO_ETH - Not implemented yet
      toast({
        title: 'Coming Soon',
        description: 'NVX to ETH exchange will be available soon',
        variant: 'default'
      });
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-4">
            <ArrowLeftRight className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-black mb-2">
            Token Exchange
          </h1>
          <p className="text-gray-600 text-lg">
            Exchange ETH for NVX tokens
          </p>
        </div>

        {/* Exchange Card */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-8">
            {/* Balances */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Coins className="w-4 h-4 text-black" />
                  </div>
                  <span className="text-sm text-gray-600">ETH Balance</span>
                </div>
                <div className="text-2xl font-bold text-black">
                  {parseFloat(ethBalance || '0').toFixed(4)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-black" />
                  </div>
                  <span className="text-sm text-gray-600">NVX Balance</span>
                </div>
                <div className="text-2xl font-bold text-black">
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-black" />
                  ) : (
                    nvxBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })
                  )}
                </div>
              </div>
            </div>

            {/* Exchange Form */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="space-y-4">
                {/* From */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    {exchangeDirection === 'ETH_TO_NVX' ? 'From (ETH)' : 'From (NVX)'}
                  </label>
                  <Input
                    type="number"
                    value={exchangeDirection === 'ETH_TO_NVX' ? ethAmount : nvxAmount.toString()}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="text-lg pr-12"
                    disabled={isExchanging}
                  />
                  <button
                    onClick={fetchBalances}
                    className="absolute right-3 top-9 p-1 text-gray-600 hover:text-black transition-colors"
                    title="Refresh balance"
                  >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center -my-2">
                  <button
                    onClick={handleSwap}
                    className="p-3 bg-gray-100 rounded-full border border-gray-300 hover:bg-gray-200 transition-all duration-200 transform hover:scale-110"
                    disabled={isExchanging}
                  >
                    <ArrowDownUp className="w-6 h-6 text-black" />
                  </button>
                </div>

                {/* To */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    {exchangeDirection === 'ETH_TO_NVX' ? 'To (NVX)' : 'To (ETH)'}
                  </label>
                  <Input
                    type="number"
                    value={exchangeDirection === 'ETH_TO_NVX' ? nvxAmount.toString() : ethAmount}
                    readOnly
                    className="text-lg bg-white"
                  />
                </div>
              </div>

              {/* Exchange Rate */}
              <div className="mt-6 p-4 bg-gray-100 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-black mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-1 text-black">Exchange Rate</p>
                    <p className="text-black">1 ETH = {exchangeRate} NVX</p>
                    <p className="mt-1">Fee: {exchangeFee} ETH per transaction</p>
                  </div>
                </div>
              </div>

              {/* Exchange Button */}
              <Button
                onClick={handleExchange}
                disabled={isExchanging || !address || (exchangeDirection === 'ETH_TO_NVX' && (!ethAmount || parseFloat(ethAmount) <= 0)) || (exchangeDirection === 'NVX_TO_ETH' && (!nvxAmount || nvxAmount <= 0))}
                className="w-full mt-6"
                variant="default"
              >
                {isExchanging ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Exchanging...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="w-5 h-5 mr-2" />
                    Exchange Tokens
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="mt-6 bg-white border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-black mb-4">About the Exchange</h3>
            <div className="space-y-3 text-gray-600">
              <p className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-black mt-0.5 flex-shrink-0" />
                <span>Exchange ETH for NVX tokens at a fixed rate of 1:100</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-black mt-0.5 flex-shrink-0" />
                <span>All exchanges are executed on-chain on Arbitrum Sepolia for transparency and security</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-black mt-0.5 flex-shrink-0" />
                <span>NVX tokens are used for governance, staking, and platform rewards</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Exchange;
