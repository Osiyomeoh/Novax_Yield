import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/UI/Card';
import Button from '../components/UI/Button';
import { 
  Coins, 
  DollarSign, 
  ArrowRight, 
  CheckCircle, 
  Loader2,
  TrendingUp,
  BarChart3,
  ArrowLeftRight,
  Zap,
  Info,
  ExternalLink
} from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useToast } from '../hooks/useToast';
import { novaxContractService } from '../services/novaxContractService';
import { ethers } from 'ethers';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: string;
  href: string;
  completed: boolean;
  available: boolean;
}

const InvestorHub: React.FC = () => {
  const { address, isConnected, provider, connectWallet } = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [nvxBalance, setNvxBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (isConnected && address && provider) {
      fetchBalances();
    } else {
      setLoading(false);
    }
  }, [isConnected, address, provider]);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      if (!provider || !address) {
        setLoading(false);
        return;
      }

      // Initialize contract service first
      try {
        const signer = await provider.getSigner();
        novaxContractService.initialize(signer, provider);
      } catch (error) {
        console.error('Error initializing contract service:', error);
      }

      // Fetch ETH balance
      try {
        const balance = await provider.getBalance(address);
        setEthBalance(ethers.formatEther(balance));
      } catch (error) {
        console.error('Error fetching ETH balance:', error);
        setEthBalance('0');
      }

      // Fetch NVX balance
      try {
        // Service should be initialized above, but try to get balance anyway
        const nvxBalanceBigInt = await novaxContractService.getNVXBalance(address);
        setNvxBalance(Number(nvxBalanceBigInt) / 1e18);
      } catch (error: any) {
        console.error('Error fetching NVX balance:', error);
        // If provider not initialized or contract not deployed, set to 0
        if (error.message?.includes('not initialized') || error.code === 'BAD_DATA' || error.message?.includes('decode')) {
          console.warn('NVX token contract may not be deployed or provider not ready');
        }
        setNvxBalance(0);
      }

      // Fetch USDC balance
      try {
        const { novaxContractAddresses } = await import('../config/contracts');
        const MockUSDCABI = await import('../contracts/MockUSDC.json');
        
        // Handle artifact format (has .abi property) or direct ABI array
        let abi;
        if (Array.isArray(MockUSDCABI.default)) {
          abi = MockUSDCABI.default;
        } else if (MockUSDCABI.default?.abi) {
          abi = MockUSDCABI.default.abi;
        } else if (MockUSDCABI.default) {
          abi = MockUSDCABI.default;
        } else if (Array.isArray(MockUSDCABI)) {
          abi = MockUSDCABI;
        } else if (MockUSDCABI.abi) {
          abi = MockUSDCABI.abi;
        } else {
          abi = MockUSDCABI;
        }
        
        // Check if contract exists at address
        const code = await provider.getCode(novaxContractAddresses.USDC);
        if (code === '0x' || !code) {
          console.warn('MockUSDC contract not deployed at address:', novaxContractAddresses.USDC);
          setUsdcBalance('0');
        } else {
          const usdcContract = new ethers.Contract(
            novaxContractAddresses.USDC,
            abi,
            provider
          );
          const balance = await usdcContract.balanceOf(address);
          setUsdcBalance(ethers.formatUnits(balance, 6));
        }
      } catch (error: any) {
        console.error('Error fetching USDC balance:', error);
        // If it's a decode error, contract might not be deployed or wrong address
        if (error.code === 'BAD_DATA' || error.message?.includes('decode') || error.message?.includes('0x')) {
          console.warn('USDC contract may not be deployed or ABI mismatch');
        }
        setUsdcBalance('0');
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const steps: Step[] = [
    {
      id: 1,
      title: 'Get ETH (Native Token)',
      description: 'You need ETH for gas fees and to exchange for NVX tokens',
      icon: Zap,
      action: 'Get ETH',
      href: '/dashboard/get-test-tokens',
      completed: parseFloat(ethBalance) > 0.01,
      available: true
    },
    {
      id: 2,
      title: 'Exchange ETH for NVX',
      description: 'Exchange ETH for NVX tokens (1 ETH = 100 NVX) for governance and rewards',
      icon: ArrowLeftRight,
      action: 'Exchange Now',
      href: '/exchange',
      completed: nvxBalance > 0,
      available: parseFloat(ethBalance) > 0.1
    },
    {
      id: 3,
      title: 'Get Test USDC',
      description: 'Get test USDC to invest in pools and stake in the vault',
      icon: DollarSign,
      action: 'Get USDC',
      href: '/dashboard/get-test-tokens',
      completed: parseFloat(usdcBalance) > 0,
      available: true
    },
    {
      id: 4,
      title: 'Invest in Pools',
      description: 'Browse and invest in trade receivable pools to earn 8-12% APY',
      icon: BarChart3,
      action: 'Browse Pools',
      href: '/dashboard/marketplace',
      completed: false,
      available: parseFloat(usdcBalance) > 0
    },
    {
      id: 5,
      title: 'Stake USDC',
      description: 'Stake USDC in the vault for 8.5-12% APY with auto-compounding',
      icon: TrendingUp,
      action: 'Start Staking',
      href: '/dashboard/staking',
      completed: false,
      available: parseFloat(usdcBalance) > 0
    }
  ];

  const getNextStep = () => {
    return steps.find(step => !step.completed && step.available) || steps[0];
  };

  const nextStep = getNextStep();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 text-black p-8 sm:p-12 lg:p-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Coins className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-4">Investor Hub</h1>
            <p className="text-gray-600 mb-4">
              Connect your wallet to get started with investing
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The signature request is for authentication only. All transactions will use <strong>Arbitrum Sepolia</strong> network (Chain ID: 421614).
              </p>
            </div>
            <Button onClick={async () => {
              try {
                await connectWallet();
                toast({
                  title: 'Wallet Connected',
                  description: 'Your wallet has been connected successfully',
                  variant: 'default'
                });
              } catch (error: any) {
                console.error('Failed to connect wallet:', error);
                toast({
                  title: 'Connection Failed',
                  description: error.message || 'Failed to connect wallet. Please try again.',
                  variant: 'destructive'
                });
              }
            }}>
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black p-8 sm:p-12 lg:p-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Investor Hub</h1>
          <p className="text-gray-600 text-lg">
            Complete guide to start investing and earning on Novax Yield
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card variant="default">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-6 h-6 text-yellow-500" />
                <span className="text-sm text-gray-600">ETH Balance</span>
              </div>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  parseFloat(ethBalance).toFixed(4)
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">For gas fees & exchange</p>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Coins className="w-6 h-6 text-blue-500" />
                <span className="text-sm text-gray-600">NVX Balance</span>
              </div>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  nvxBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Governance & rewards</p>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-6 h-6 text-green-500" />
                <span className="text-sm text-gray-600">USDC Balance</span>
              </div>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  parseFloat(usdcBalance).toLocaleString('en-US', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">For investing & staking</p>
            </CardContent>
          </Card>
        </div>

        {/* Next Step CTA */}
        {nextStep && (
          <Card variant="default" className="mb-12 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                      {nextStep.id}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Next Step: {nextStep.title}</h3>
                      <p className="text-gray-600">{nextStep.description}</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(nextStep.href)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {nextStep.action}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step-by-Step Guide */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Complete Investment Flow</h2>
          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === nextStep?.id;
              const isCompleted = step.completed;
              
              return (
                <Card 
                  key={step.id} 
                  variant="default"
                  className={`transition-all ${
                    isActive ? 'ring-2 ring-green-500 bg-green-50' : ''
                  } ${isCompleted ? 'opacity-75' : ''}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Step Number */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                        isCompleted 
                          ? 'bg-green-600 text-white' 
                          : isActive
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          step.id
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Icon className={`w-6 h-6 ${
                              isCompleted ? 'text-green-600' : isActive ? 'text-green-600' : 'text-gray-400'
                            }`} />
                            <h3 className={`text-xl font-bold ${
                              isCompleted ? 'text-gray-500 line-through' : ''
                            }`}>
                              {step.title}
                            </h3>
                          </div>
                          {isCompleted && (
                            <span className="text-sm text-green-600 font-medium">Completed</span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-4">{step.description}</p>
                        
                        {/* Action Button */}
                        <div className="flex items-center gap-4">
                          <Button
                            onClick={() => navigate(step.href)}
                            variant={isActive ? "default" : "outline"}
                            disabled={!step.available}
                            className={isActive ? 'bg-green-600 hover:bg-green-700' : ''}
                          >
                            {step.action}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                          {!step.available && (
                            <span className="text-sm text-gray-500">
                              Complete previous steps first
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <Card variant="default">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/get-test-tokens')}
                className="h-auto py-4 flex flex-col items-center"
              >
                <DollarSign className="w-8 h-8 mb-2" />
                <span className="font-semibold">Get Test USDC</span>
                <span className="text-xs text-gray-500 mt-1">1,000 USDC per request</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/exchange')}
                className="h-auto py-4 flex flex-col items-center"
              >
                <ArrowLeftRight className="w-8 h-8 mb-2" />
                <span className="font-semibold">Exchange ETH/NVX</span>
                <span className="text-xs text-gray-500 mt-1">1 ETH = 100 NVX</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/marketplace')}
                className="h-auto py-4 flex flex-col items-center"
              >
                <BarChart3 className="w-8 h-8 mb-2" />
                <span className="font-semibold">Browse Pools</span>
                <span className="text-xs text-gray-500 mt-1">8-12% APY</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card variant="default" className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-black mb-2">About Novax Yield Tokenomics</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• <strong>ETH</strong>: Native token for gas fees and exchange</li>
                  <li>• <strong>NVX</strong>: Governance token (1 ETH = 100 NVX), used for voting and rewards</li>
                  <li>• <strong>USDC</strong>: Stablecoin for investing in pools and staking</li>
                  <li>• <strong>Pool Tokens</strong>: Represent your investment in trade receivable pools</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvestorHub;

