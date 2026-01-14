import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/UI/Card';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import { useToast } from '../hooks/useToast';
import { useWallet } from '../contexts/WalletContext';
import { TrustTokenWalletService } from '../services/trust-token-wallet.service';
import { TrustTokenService } from '../services/trust-token.service';
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
  const { accountId, balance: hbarBalance, signer } = useWallet();
  const { toast } = useToast();
  
  const [trustBalance, setTrustBalance] = useState<number>(0);
  const [hbarAmount, setHbarAmount] = useState<string>('');
  const [trustAmount, setTrustAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [exchangeDirection, setExchangeDirection] = useState<'HBAR_TO_TRUST' | 'TRUST_TO_HBAR'>('HBAR_TO_TRUST');
  const [exchangeRate] = useState(100); // 1 HBAR = 100 TRUST tokens
  const [exchangeFee] = useState(0.1); // 0.1 HBAR fee
  
  useEffect(() => {
    if (accountId) {
      fetchTrustBalance();
    }
  }, [accountId]);

  const fetchTrustBalance = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching TRUST balance for account:', accountId);
      const balance = await TrustTokenService.hybridGetTrustTokenBalance(accountId!);
      console.log('📊 TRUST balance received:', balance);
      setTrustBalance(balance);
    } catch (error) {
      console.error('Failed to fetch TRUST balance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTrustAmount = (hbar: string) => {
    const hbarNum = parseFloat(hbar) || 0;
    if (hbarNum <= exchangeFee) return 0;
    const trust = Math.floor((hbarNum - exchangeFee) * exchangeRate);
    return Math.max(0, trust);
  };

  const calculateHbarAmount = (trust: string) => {
    const trustNum = parseFloat(trust) || 0;
    const hbar = (trustNum / exchangeRate) + exchangeFee;
    return hbar;
  };

  const handleAmountChange = (value: string) => {
    if (exchangeDirection === 'HBAR_TO_TRUST') {
      setHbarAmount(value);
      setTrustAmount(calculateTrustAmount(value));
    } else {
      setTrustAmount(parseFloat(value) || 0);
      setHbarAmount(calculateHbarAmount(value).toFixed(6));
    }
  };

  const handleSwap = () => {
    setExchangeDirection(prev => prev === 'HBAR_TO_TRUST' ? 'TRUST_TO_HBAR' : 'HBAR_TO_TRUST');
    setHbarAmount('');
    setTrustAmount(0);
  };

  const handleExchange = async () => {
    if (!accountId) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your HashPack wallet to exchange tokens',
        variant: 'destructive'
      });
      return;
    }

    if (!signer) {
      toast({
        title: 'Wallet Signer Not Available',
        description: 'Please reconnect your wallet',
        variant: 'destructive'
      });
      return;
    }

    if (exchangeDirection === 'HBAR_TO_TRUST') {
      if (!hbarAmount || parseFloat(hbarAmount) <= 0) {
        toast({
          title: 'Invalid Amount',
          description: 'Please enter a valid HBAR amount',
          variant: 'destructive'
        });
        return;
      }

      if (parseFloat(hbarAmount) > parseFloat(hbarBalance || '0')) {
        toast({
          title: 'Insufficient Balance',
          description: 'You do not have enough HBAR for this exchange',
          variant: 'destructive'
        });
        return;
      }

      setIsExchanging(true);

      try {
        console.log(`Exchanging ${hbarAmount} HBAR for ${trustAmount} TRUST tokens`);
        
        const trustTokenWalletService = new TrustTokenWalletService();
        const result = await trustTokenWalletService.exchangeHbarForTrust(
          accountId,
          parseFloat(hbarAmount),
          '0.0.6916959', // Treasury account ID
          '0.0.6916959', // Operations account ID
          '0.0.6916959', // Staking account ID
          signer
        );
        
        toast({
          title: 'Exchange Successful!',
          description: `Successfully exchanged ${hbarAmount} HBAR for ${result.trustAmount} TRUST tokens`,
          variant: 'default'
        });

        // Refresh balances
        await fetchTrustBalance();
        setHbarAmount('');
        setTrustAmount(0);
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
      // TRUST_TO_HBAR - Not implemented yet
      toast({
        title: 'Coming Soon',
        description: 'TRUST to HBAR exchange will be available soon',
        variant: 'default'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight-900 via-midnight-800 to-midnight-900 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-blue to-primary-blue-light rounded-full mb-4">
            <ArrowLeftRight className="w-8 h-8 text-midnight-900" />
          </div>
          <h1 className="text-4xl font-bold text-off-white mb-2">
            Token Exchange
          </h1>
          <p className="text-off-white/70 text-lg">
            Exchange HBAR for TRUST tokens
          </p>
        </div>

        {/* Exchange Card */}
        <Card className="bg-midnight-800/50 border-medium-gray/30">
          <CardContent className="p-8">
            {/* Balances */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-midnight-900/50 rounded-lg p-4 border border-medium-gray/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-primary-blue/20 rounded-full flex items-center justify-center">
                    <Coins className="w-4 h-4 text-primary-blue" />
                  </div>
                  <span className="text-sm text-text-secondary">HBAR Balance</span>
                </div>
                <div className="text-2xl font-bold text-off-white">
                  {parseFloat(hbarBalance || '0').toFixed(2)}
                </div>
              </div>

              <div className="bg-midnight-900/50 rounded-lg p-4 border border-medium-gray/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-primary-blue-light/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary-blue-light" />
                  </div>
                  <span className="text-sm text-text-secondary">TRUST Balance</span>
                </div>
                <div className="text-2xl font-bold text-off-white">
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary-blue" />
                  ) : (
                    trustBalance.toLocaleString()
                  )}
                </div>
              </div>
            </div>

            {/* Exchange Form */}
            <div className="bg-midnight-900/30 rounded-xl p-6 border border-medium-gray/20">
              <div className="space-y-4">
                {/* From */}
                <div className="relative">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {exchangeDirection === 'HBAR_TO_TRUST' ? 'From (HBAR)' : 'From (TRUST)'}
                  </label>
                  <Input
                    type="number"
                    value={exchangeDirection === 'HBAR_TO_TRUST' ? hbarAmount : trustAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="text-lg pr-12"
                    disabled={isExchanging}
                  />
                  <button
                    onClick={fetchTrustBalance}
                    className="absolute right-3 top-9 p-1 text-text-secondary hover:text-primary-blue transition-colors"
                    title="Refresh balance"
                  >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center -my-2">
                  <button
                    onClick={handleSwap}
                    className="p-3 bg-gradient-to-r from-primary-blue/20 to-primary-blue-light/20 rounded-full border border-primary-blue/40 hover:from-primary-blue/30 hover:to-primary-blue-light/30 transition-all duration-200 transform hover:scale-110"
                    disabled={isExchanging}
                  >
                    <ArrowDownUp className="w-6 h-6 text-primary-blue" />
                  </button>
                </div>

                {/* To */}
                <div className="relative">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {exchangeDirection === 'HBAR_TO_TRUST' ? 'To (TRUST)' : 'To (HBAR)'}
                  </label>
                  <Input
                    type="number"
                    value={exchangeDirection === 'HBAR_TO_TRUST' ? trustAmount : hbarAmount}
                    readOnly
                    className="text-lg bg-midnight-900/50"
                  />
                </div>
              </div>

              {/* Exchange Rate */}
              <div className="mt-6 p-4 bg-primary-blue/10 rounded-lg border border-primary-blue/20">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-primary-blue mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-text-secondary">
                    <p className="font-medium mb-1">Exchange Rate</p>
                    <p className="text-off-white">1 HBAR = {exchangeRate} TRUST</p>
                    <p className="mt-1">Fee: {exchangeFee} HBAR per transaction</p>
                  </div>
                </div>
              </div>

              {/* Exchange Button */}
              <Button
                onClick={handleExchange}
                disabled={isExchanging || !accountId || (exchangeDirection === 'HBAR_TO_TRUST' && (!hbarAmount || parseFloat(hbarAmount) <= 0)) || (exchangeDirection === 'TRUST_TO_HBAR' && (!trustAmount || trustAmount <= 0))}
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
        <Card className="mt-6 bg-midnight-800/50 border-medium-gray/30">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-off-white mb-4">About the Exchange</h3>
            <div className="space-y-3 text-text-secondary">
              <p className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary-blue mt-0.5 flex-shrink-0" />
                <span>Exchange HBAR for TRUST tokens at a fixed rate of 1:100</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary-blue mt-0.5 flex-shrink-0" />
                <span>All exchanges are executed on-chain for transparency and security</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary-blue mt-0.5 flex-shrink-0" />
                <span>TRUST tokens are used for governance, staking, and platform fees</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Exchange;

