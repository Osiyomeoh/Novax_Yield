import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ethers } from 'ethers';
import { 
  Coins, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ExternalLink,
  Copy,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';
import { useToast } from '../hooks/useToast';
import { novaxContractAddresses } from '../config/contracts';
import MockUSDCABI from '../contracts/MockUSDC.json';

const USDC_ADDRESS = novaxContractAddresses.USDC;
// Handle artifact format (has .abi property) or direct ABI array
// Vite imports JSON files directly, so MockUSDCABI should be the object itself
const getUSDCABI = () => {
  let abiData: any = MockUSDCABI;
  
  // Handle default export (some bundlers wrap in default)
  if ((MockUSDCABI as any).default) {
    abiData = (MockUSDCABI as any).default;
  }
  
  // Check if it's already an array (direct ABI)
  if (Array.isArray(abiData)) {
    return abiData;
  }
  
  // Check if it has .abi property (artifact format from Hardhat)
  if (abiData && typeof abiData === 'object' && 'abi' in abiData && Array.isArray(abiData.abi)) {
    return abiData.abi;
  }
  
  // If it's an object but not the right structure, log for debugging
  if (abiData && typeof abiData === 'object' && !Array.isArray(abiData)) {
    console.warn('Unexpected ABI structure:', {
      keys: Object.keys(abiData),
      hasAbi: 'abi' in abiData,
      abiType: abiData.abi ? typeof abiData.abi : 'no abi'
    });
  }
  
  // Fallback: return as-is (might be array or might fail)
  return abiData;
};

const USDC_ABI = getUSDCABI();

// Debug: Log ABI structure (only in dev)
if (import.meta.env.DEV) {
  console.log('MockUSDC ABI extraction:', {
    rawType: typeof MockUSDCABI,
    hasDefault: !!(MockUSDCABI as any).default,
    extractedType: typeof USDC_ABI,
    isArray: Array.isArray(USDC_ABI),
    length: Array.isArray(USDC_ABI) ? USDC_ABI.length : 'N/A',
    hasFaucet: Array.isArray(USDC_ABI) && USDC_ABI.some((item: any) => item.name === 'faucet'),
    hasBalanceOf: Array.isArray(USDC_ABI) && USDC_ABI.some((item: any) => item.name === 'balanceOf')
  });
}

export default function GetTestTokens() {
  const { isConnected, address, provider, connectWallet } = useWallet();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'usdc' | 'trust'>('usdc');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [faucetStatus, setFaucetStatus] = useState<{
    canRequest: boolean;
    timeUntilNextRequest: number;
    dailyAmountRemaining: number;
  } | null>(null);

  // Load USDC balance and faucet status
  const loadUSDCInfo = async () => {
    if (!isConnected || !provider || !address || isLoading) return;

    setIsLoading(true);
    try {
      // Validate ABI first
      if (!Array.isArray(USDC_ABI) || USDC_ABI.length === 0) {
        console.error('Invalid USDC ABI structure:', {
          isArray: Array.isArray(USDC_ABI),
          type: typeof USDC_ABI,
          keys: USDC_ABI && typeof USDC_ABI === 'object' ? Object.keys(USDC_ABI) : 'not object',
          raw: MockUSDCABI
        });
        toast({
          title: 'ABI Error',
          description: 'Invalid contract ABI. Please check MockUSDC.json file.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Check if contract is deployed
      const code = await provider.getCode(USDC_ADDRESS);
      console.log('Contract deployment check:', {
        address: USDC_ADDRESS,
        codeLength: code?.length || 0,
        hasCode: code && code !== '0x' && code.length > 2
      });
      
      if (code === '0x' || !code || code.length <= 2) {
        console.warn('MockUSDC contract not deployed at address:', USDC_ADDRESS);
        console.warn('Please deploy the contract or update the address in config/contracts.ts');
        toast({
          title: 'Contract Not Deployed',
          description: `MockUSDC not found at ${USDC_ADDRESS.slice(0, 10)}... Please deploy the contract first.`,
          variant: 'destructive'
        });
        setUsdcBalance('0');
        setIsLoading(false);
        return;
      }

      console.log('Creating contract with ABI:', {
        abiLength: USDC_ABI.length,
        hasBalanceOf: USDC_ABI.some((item: any) => item.name === 'balanceOf'),
        hasFaucet: USDC_ABI.some((item: any) => item.name === 'faucet')
      });
      
      const contract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);

      // Get balance
      try {
        const balance = await contract.balanceOf(address);
        setUsdcBalance(ethers.formatUnits(balance, 6));
      } catch (error: any) {
        console.error('Error getting USDC balance:', error);
        if (error.code === 'BAD_DATA' || error.message?.includes('decode')) {
          console.warn('USDC contract ABI mismatch or contract not fully deployed');
        }
        setUsdcBalance('0');
      }

      // Get faucet status (if function exists)
      try {
        if (USDC_ABI.some((item: any) => item.name === 'getFaucetStatus')) {
          const [canRequest, timeUntilNext, dailyRemaining] = await contract.getFaucetStatus(address);
          setFaucetStatus({
            canRequest,
            timeUntilNextRequest: Number(timeUntilNext),
            dailyAmountRemaining: Number(ethers.formatUnits(dailyRemaining, 6))
          });
        }
      } catch (error) {
        console.error('Error getting faucet status:', error);
        // Don't show error to user, just log it
      }
    } catch (error: any) {
      console.error("Failed to load USDC info:", error);
      // Only show error if it's not a contract deployment issue
      if (!error.message?.includes('not deployed') && !error.code === 'BAD_DATA') {
        toast({
          title: 'Error',
          description: 'Failed to load USDC information. Contract may not be deployed.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address && provider) {
      loadUSDCInfo();
    }
  }, [isConnected, address, provider]);

  const handleFaucet = async () => {
    if (!isConnected || !provider || !address) {
      await connectWallet('metamask');
      return;
    }

    setIsMinting(true);

    try {
      // Check network first
      const network = await provider.getNetwork();
      const expectedChainId = BigInt(127823);
      if (network.chainId !== expectedChainId) {
        toast({
          title: 'Wrong Network',
          description: `Please switch to Etherlink Shadownet (Chain ID: 127823). Current: ${network.chainId}`,
          variant: 'destructive'
        });
        setIsMinting(false);
        return;
      }

      // Check if contract is deployed
      const code = await provider.getCode(USDC_ADDRESS);
      console.log('Contract deployment check:', {
        address: USDC_ADDRESS,
        codeLength: code?.length || 0,
        hasCode: code && code !== '0x' && code.length > 2,
        network: network.name,
        chainId: network.chainId.toString()
      });
      
      if (code === '0x' || !code || code.length <= 2) {
        toast({
          title: 'Contract Not Found',
          description: `MockUSDC not found at ${USDC_ADDRESS.slice(0, 10)}... Make sure you're on Etherlink Shadownet and the contract is deployed.`,
          variant: 'destructive'
        });
        setIsMinting(false);
        return;
      }

      // Check if faucet function exists in ABI
      const hasFaucet = USDC_ABI.some((item: any) => item.name === 'faucet' && item.type === 'function');
      if (!hasFaucet) {
        toast({
          title: 'Faucet Not Available',
          description: 'Faucet function not found in contract. Please use mint function or contact admin.',
          variant: 'destructive'
        });
        setIsMinting(false);
        return;
      }

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

      toast({
        title: 'Requesting Test USDC',
        description: 'Transaction submitted, waiting for confirmation...',
        variant: 'default'
      });

      const tx = await contract.faucet();
      const receipt = await tx.wait();

      toast({
        title: 'Success!',
        description: 'Successfully received 1,000 test USDC',
        variant: 'default'
      });

      // Refresh balance and status
      await loadUSDCInfo();
    } catch (error: any) {
      console.error("Faucet request failed:", error);
      let errorMessage = 'Failed to request test USDC';
      
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      }
      
      toast({
        title: 'Request Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsMinting(false);
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast({
        title: 'Copied!',
        description: 'Wallet address copied to clipboard',
        variant: 'default'
      });
    }
  };

  const formatNumber = (num: string | number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(num.toString()));
  };

  const formatTime = (seconds: number) => {
    if (seconds === 0) return 'Now';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black p-6 sm:p-8 lg:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-4">
            <Coins className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-black mb-2">
            Get Test Tokens
          </h1>
          <p className="text-gray-600 text-lg">
            Get test USDC to invest in pools and stake in the vault
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 justify-center">
          <button
            onClick={() => setActiveTab('usdc')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'usdc'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <DollarSign className="w-5 h-5 inline mr-2" />
            Test USDC
          </button>
          <button
            onClick={() => setActiveTab('trust')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'trust'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Coins className="w-5 h-5 inline mr-2" />
            NVX Tokens
          </button>
        </div>

        {/* USDC Tab */}
        {activeTab === 'usdc' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Faucet Section */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-black mb-6 flex items-center">
                <DollarSign className="w-6 h-6 mr-3 text-green-600" />
                Get Test USDC
              </h2>

              {!isConnected ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    Connect your wallet to get test USDC
                  </p>
                  <Button onClick={() => connectWallet('metamask')} className="w-full">
                    Connect Wallet
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Wallet Info */}
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Your Wallet</span>
                      <button
                        onClick={copyAddress}
                        className="text-xs text-green-600 hover:text-green-700 flex items-center"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </button>
                    </div>
                    <div className="text-sm font-mono text-black">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </div>
                  </div>

                  {/* Current Balance */}
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Current Balance</span>
                      <button
                        onClick={loadUSDCInfo}
                        disabled={isLoading}
                        className="text-xs text-green-600 hover:text-green-700 flex items-center disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatNumber(usdcBalance)} USDC
                    </div>
                  </div>

                  {/* Faucet Status */}
                  {faucetStatus && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-black mb-2">Faucet Status</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Can Request:</span>
                          <span className={faucetStatus.canRequest ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {faucetStatus.canRequest ? 'Yes' : 'No'}
                          </span>
                        </div>
                        {!faucetStatus.canRequest && faucetStatus.timeUntilNextRequest > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Next Request:</span>
                            <span className="text-gray-800 font-medium">
                              {formatTime(faucetStatus.timeUntilNextRequest)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Daily Remaining:</span>
                          <span className="text-gray-800 font-medium">
                            {formatNumber(faucetStatus.dailyAmountRemaining)} USDC
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Faucet Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-black mb-2">Faucet Limits</h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>• 1,000 USDC per request</div>
                      <div>• 1 day cooldown between requests</div>
                      <div>• Max 10,000 USDC per day</div>
                    </div>
                  </div>

                  {/* Faucet Button */}
                  <Button
                    onClick={handleFaucet}
                    disabled={isMinting || (faucetStatus && !faucetStatus.canRequest)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isMinting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Requesting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Get 1,000 Test USDC
                      </>
                    )}
                  </Button>

                  {faucetStatus && !faucetStatus.canRequest && (
                    <p className="text-sm text-gray-600 text-center">
                      {faucetStatus.timeUntilNextRequest > 0
                        ? `Wait ${formatTime(faucetStatus.timeUntilNextRequest)} before next request`
                        : 'Daily limit reached. Try again tomorrow.'}
                    </p>
                  )}
                </div>
              )}
            </Card>

            {/* Info Section */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-black mb-6 flex items-center">
                <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
                How to Use Test USDC
              </h2>

              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-green-600/20 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <span className="text-xs font-bold text-green-600">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-1">Get Test USDC</h4>
                    <p className="text-sm text-gray-600">
                      Click "Get 1,000 Test USDC" to receive test tokens. You can request once per day.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-6 h-6 bg-green-600/20 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <span className="text-xs font-bold text-green-600">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-1">Invest in Pools</h4>
                    <p className="text-sm text-gray-600">
                      Use your test USDC to invest in trade receivable pools and earn yield.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-6 h-6 bg-green-600/20 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <span className="text-xs font-bold text-green-600">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-1">Stake in Vault</h4>
                    <p className="text-sm text-gray-600">
                      Stake your test USDC in the staking vault to earn 8.5-12% APY with auto-compounding.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-black mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <a
                    href="/dashboard/marketplace"
                    className="block text-sm text-green-600 hover:text-green-700"
                  >
                    → Browse Investment Pools
                  </a>
                  <a
                    href="/dashboard/staking"
                    className="block text-sm text-green-600 hover:text-green-700"
                  >
                    → Stake USDC in Vault
                  </a>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-black mb-2">Testnet Limits</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 1,000 USDC per faucet request</li>
                  <li>• 1 day cooldown between requests</li>
                  <li>• Max 10,000 USDC per day</li>
                  <li>• Tokens are for testing only</li>
                  <li>• No real value on mainnet</li>
                </ul>
              </div>
            </Card>
          </div>
        )}

        {/* NVX Token Tab - Exchange XTZ for NVX */}
        {activeTab === 'trust' && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              NVX token exchange is available on the Exchange page.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Use XTZ to get NVX tokens (1 XTZ = 100 NVX) for governance and rewards.
            </p>
            <Button onClick={() => window.location.href = '/exchange'}>
              Go to Exchange
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
