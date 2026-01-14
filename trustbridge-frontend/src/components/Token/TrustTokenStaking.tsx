import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { useToast } from '../../hooks/useToast';
import { trustTokenService, StakingInfo, StakingParams } from '../../services/trustTokenService';
import { useWallet } from '../../contexts/WalletContext';
import { 
  Coins, 
  TrendingUp, 
  Clock, 
  DollarSign,
  Lock,
  Unlock,
  Award,
  BarChart3
} from 'lucide-react';

const TrustTokenStaking: React.FC = () => {
  const { address, signer } = useWallet();
  const { toast } = useToast();
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [tokenInfo, setTokenInfo] = useState({
    name: 'TrustBridge',
    symbol: 'TRUST',
    decimals: 18,
    totalSupply: '0',
    maxSupply: '0',
  });
  const [loading, setLoading] = useState(true);
  const [showStakeForm, setShowStakeForm] = useState(false);
  const [showUnstakeForm, setShowUnstakeForm] = useState(false);

  // Stake form state
  const [stakeForm, setStakeForm] = useState<StakingParams>({
    amount: '',
    lockPeriod: '30', // 30 days default
  });

  useEffect(() => {
    if (signer) {
      try {
        trustTokenService.initialize(window.ethereum as any, signer);
        loadData();
      } catch (error) {
        console.error('TrustTokenService initialization failed:', error);
        loadEmptyData();
      }
    } else {
      loadDemoData();
    }
  }, [signer]);

  const loadEmptyData = () => {
    setLoading(true);
    // Show empty state when no wallet connected
    setTokenBalance('0');
    setTokenInfo({
      name: 'TrustBridge',
      symbol: 'TRUST',
      decimals: 18,
      totalSupply: '0',
      maxSupply: '100000000',
    });
    setStakingInfo({
      stakedAmount: '0',
      lockPeriod: '0',
      stakingTimestamp: '',
      canUnstake: false,
      pendingRewards: '0',
    });
    setLoading(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (address) {
        const [balance, staking, info] = await Promise.all([
          trustTokenService.getBalance(address),
          trustTokenService.getStakingInfo(address),
          trustTokenService.getTokenInfo(),
        ]);

        setTokenBalance(balance);
        setStakingInfo(staking);
        setTokenInfo(info);
      }
    } catch (error) {
      console.error('Failed to load token data:', error);
      toast({
        title: "Error",
        description: "Failed to load token data",
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStake = async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: 'destructive'
      });
      return;
    }

    if (Number(stakeForm.amount) > Number(tokenBalance)) {
      toast({
        title: "Error",
        description: "Insufficient TRUST token balance",
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await trustTokenService.stake(stakeForm);
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Successfully staked ${stakeForm.amount} TRUST tokens for ${stakeForm.lockPeriod} days`,
          variant: 'default'
        });
        setShowStakeForm(false);
        setStakeForm({ amount: '', lockPeriod: '30' });
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to stake tokens",
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Staking failed:', error);
      toast({
        title: "Error",
        description: "Failed to stake tokens",
        variant: 'destructive'
      });
    }
  };

  const handleUnstake = async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: 'destructive'
      });
      return;
    }

    if (!stakingInfo?.canUnstake) {
      toast({
        title: "Error",
        description: "Tokens are still locked",
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await trustTokenService.unstake();
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Successfully unstaked ${stakingInfo.stakedAmount} TRUST tokens with ${stakingInfo.pendingRewards} rewards`,
          variant: 'default'
        });
        setShowUnstakeForm(false);
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to unstake tokens",
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Unstaking failed:', error);
      toast({
        title: "Error",
        description: "Failed to unstake tokens",
        variant: 'destructive'
      });
    }
  };

  const formatCurrency = (amount: string) => {
    return `${Number(amount).toLocaleString()} TRUST`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getAPY = (lockPeriodDays: number) => {
    if (lockPeriodDays <= 30) return 5;
    else if (lockPeriodDays <= 90) return 10;
    else if (lockPeriodDays <= 180) return 15;
    else return 25;
  };

  const getLockPeriodOptions = () => [
    { days: 30, label: '30 days', apy: 5 },
    { days: 90, label: '90 days', apy: 10 },
    { days: 180, label: '180 days', apy: 15 },
    { days: 365, label: '365 days', apy: 25 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo Mode Notice */}
      {!address && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400">
            <Coins className="w-5 h-5" />
            <span className="font-semibold">Connect Wallet</span>
          </div>
          <p className="text-yellow-300 text-sm mt-1">
            Connect your wallet to access TRUST token staking functionality.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-off-white">TRUST Token Staking</h1>
          <p className="text-gray-300">Stake TRUST tokens and earn rewards</p>
        </div>
        <div className="flex space-x-2">
          {stakingInfo && stakingInfo.canUnstake && (
            <Button
              onClick={() => setShowUnstakeForm(true)}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              <Unlock className="w-4 h-4 mr-2" />
              Unstake
            </Button>
          )}
          <Button
            onClick={() => setShowStakeForm(true)}
            className="bg-primary-blue text-midnight-900 hover:bg-primary-blue-light"
          >
            <Lock className="w-4 h-4 mr-2" />
            Stake
          </Button>
        </div>
      </div>

      {/* Token Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card variant="floating">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Your Balance</p>
                <p className="text-2xl font-bold text-off-white">{formatCurrency(tokenBalance)}</p>
              </div>
              <Coins className="w-8 h-8 text-primary-blue" />
            </div>
          </CardContent>
        </Card>

        <Card variant="floating">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Staked Amount</p>
                <p className="text-2xl font-bold text-off-white">
                  {stakingInfo ? formatCurrency(stakingInfo.stakedAmount) : '0 TRUST'}
                </p>
              </div>
              <Lock className="w-8 h-8 text-primary-blue" />
            </div>
          </CardContent>
        </Card>

        <Card variant="floating">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Rewards</p>
                <p className="text-2xl font-bold text-off-white">
                  {stakingInfo ? formatCurrency(stakingInfo.pendingRewards) : '0 TRUST'}
                </p>
              </div>
              <Award className="w-8 h-8 text-primary-blue" />
            </div>
          </CardContent>
        </Card>

        <Card variant="floating">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Supply</p>
                <p className="text-2xl font-bold text-off-white">{formatCurrency(tokenInfo.totalSupply)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary-blue" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staking Status */}
      {stakingInfo && Number(stakingInfo.stakedAmount) > 0 && (
        <Card variant="floating">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Staking Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-400">Staked Amount</p>
                <p className="text-xl font-bold text-off-white">{formatCurrency(stakingInfo.stakedAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Lock Period</p>
                <p className="text-xl font-bold text-off-white">{stakingInfo.lockPeriod} days</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Staked Since</p>
                <p className="text-xl font-bold text-off-white">{formatDate(stakingInfo.stakingTimestamp)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">APY</p>
                <p className="text-xl font-bold text-primary-blue">{getAPY(Number(stakingInfo.lockPeriod))}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Can Unstake</p>
                <p className={`text-xl font-bold ${stakingInfo.canUnstake ? 'text-primary-blue' : 'text-red-400'}`}>
                  {stakingInfo.canUnstake ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Pending Rewards</p>
                <p className="text-xl font-bold text-orange-400">{formatCurrency(stakingInfo.pendingRewards)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staking Options */}
      <Card variant="floating">
        <CardHeader>
          <CardTitle>Staking Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {getLockPeriodOptions().map((option) => (
              <motion.div
                key={option.days}
                whileHover={{ scale: 1.05 }}
                className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-primary-blue transition-colors"
              >
                <div className="text-center">
                  <p className="text-lg font-bold text-off-white">{option.label}</p>
                  <p className="text-2xl font-bold text-primary-blue">{option.apy}% APY</p>
                  <p className="text-sm text-gray-400">Lock Period</p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stake Modal */}
      {showStakeForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Stake TRUST Tokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Amount (TRUST)"
                type="number"
                value={stakeForm.amount}
                onChange={(e) => setStakeForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter amount to stake"
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lock Period
                </label>
                <select
                  value={stakeForm.lockPeriod}
                  onChange={(e) => setStakeForm(prev => ({ ...prev, lockPeriod: e.target.value }))}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-off-white focus:border-primary-blue focus:outline-none"
                >
                  {getLockPeriodOptions().map((option) => (
                    <option key={option.days} value={option.days.toString()}>
                      {option.label} - {option.apy}% APY
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg">
                <p className="text-sm text-gray-400">Staking Details</p>
                <p className="text-sm text-off-white">Amount: {stakeForm.amount} TRUST</p>
                <p className="text-sm text-off-white">Lock Period: {stakeForm.lockPeriod} days</p>
                <p className="text-sm text-primary-blue">APY: {getAPY(Number(stakeForm.lockPeriod))}%</p>
                <p className="text-sm text-gray-400">Available Balance: {formatCurrency(tokenBalance)}</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowStakeForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStake}
                  className="flex-1 bg-primary-blue text-midnight-900 hover:bg-primary-blue-light"
                >
                  Stake Tokens
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Unstake Modal */}
      {showUnstakeForm && stakingInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Unstake TRUST Tokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-800 p-4 rounded-lg space-y-2">
                <p className="text-sm text-gray-400">Unstaking Details</p>
                <p className="text-sm text-off-white">Staked Amount: {formatCurrency(stakingInfo.stakedAmount)}</p>
                <p className="text-sm text-off-white">Lock Period: {stakingInfo.lockPeriod} days</p>
                <p className="text-sm text-orange-400">Pending Rewards: {formatCurrency(stakingInfo.pendingRewards)}</p>
                <p className="text-sm text-primary-blue">Total to Receive: {formatCurrency((Number(stakingInfo.stakedAmount) + Number(stakingInfo.pendingRewards)).toString())}</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUnstakeForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUnstake}
                  className="flex-1 bg-orange-500 text-white hover:bg-orange-600"
                >
                  Unstake & Claim Rewards
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TrustTokenStaking;
