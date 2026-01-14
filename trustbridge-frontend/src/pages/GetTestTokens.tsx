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
  RefreshCw
} from 'lucide-react';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';
import { useToast } from '../hooks/useToast';

// Import the correct contract configuration
import { CONTRACT_ADDRESSES } from '../config/contracts';
import TrustTokenABI from '../contracts/TrustToken.json';

// TRUST Token Testnet Contract Address - UPDATED WITH NEW CONTRACT
const TRUST_TOKEN_ADDRESS = CONTRACT_ADDRESSES.trustToken;
const TRUST_TOKEN_ABI = TrustTokenABI.abi;

const MINT_AMOUNTS = [
  { label: "100 TRUST", value: "100", description: "Basic testing" },
  { label: "500 TRUST", value: "500", description: "Standard testing" },
  { label: "1,000 TRUST", value: "1000", description: "Maximum per mint" }
];

export default function GetTestTokens() {
  const { isConnected, address, connectWallet } = useWallet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState("1000");
  const [customAmount, setCustomAmount] = useState("");
  const [balance, setBalance] = useState("0");
  const [contractInfo, setContractInfo] = useState({
    name: "",
    symbol: "",
    totalSupply: "0"
  });

  // Load contract information
  const loadContractInfo = async () => {
    if (!isConnected || !window.ethereum || !address || isLoading) return;

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(TRUST_TOKEN_ADDRESS, TRUST_TOKEN_ABI, provider);

      const [name, symbol, totalSupply, balance] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.totalSupply(),
        contract.balanceOf(address)
      ]);

      setContractInfo({
        name,
        symbol,
        totalSupply: ethers.formatEther(totalSupply)
      });

      setBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error("Failed to load contract info:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      loadContractInfo();
    }
  }, [isConnected, address, loadContractInfo]);

  const handleMint = async () => {
    if (!isConnected) {
      await connectWallet('metamask');
      return;
    }

    if (!window.ethereum) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please install MetaMask or connect your wallet',
        variant: 'destructive'
      });
      return;
    }

    const amount = customAmount || selectedAmount;
    const mintAmount = ethers.parseEther(amount);

    // Check if amount is within reasonable limits (max 1000 TRUST per mint)
    if (mintAmount > ethers.parseEther("1000")) {
      toast({
        title: 'Amount Too Large',
        description: 'Maximum 1,000 TRUST tokens per mint',
        variant: 'destructive'
      });
      return;
    }

    setIsMinting(true);

    try {
      console.log('🚀 === GET TEST TOKENS PAGE MINTING ===');
      console.log('💰 Amount to mint:', amount, 'TRUST');
      console.log('📍 TrustToken address:', TRUST_TOKEN_ADDRESS);
      console.log('👤 User address:', address);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(TRUST_TOKEN_ADDRESS, TRUST_TOKEN_ABI, signer);

      console.log('📞 Calling mintTestTokens on contract...');
      const tx = await contract.mintTestTokens(mintAmount);
      toast({
        title: 'Minting Started',
        description: 'Transaction submitted, waiting for confirmation...',
        variant: 'default'
      });

      console.log('📝 Transaction submitted:', tx.hash);
      console.log('⏳ Waiting for transaction confirmation...');
      
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
      console.log('⛽ Gas used:', receipt.gasUsed.toString());
      
      toast({
        title: 'Success!',
        description: `Successfully minted ${amount} TRUST tokens`,
        variant: 'default'
      });

      // Refresh balance
      await loadContractInfo();
    } catch (error: any) {
      console.error("Minting failed:", error);
      toast({
        title: 'Minting Failed',
        description: error.message || 'Failed to mint tokens',
        variant: 'destructive'
      });
    } finally {
      setIsMinting(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address || '');
    toast({
      title: 'Copied!',
      description: 'Wallet address copied to clipboard',
      variant: 'default'
    });
  };

  const formatNumber = (num: string) => {
    return new Intl.NumberFormat().format(parseFloat(num));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight-900 via-midnight-800 to-midnight-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-blue to-primary-blue-light rounded-full mb-4">
            <Coins className="w-8 h-8 text-midnight-900" />
          </div>
          <h1 className="text-4xl font-bold text-off-white mb-2">
            Get Test Tokens
          </h1>
          <p className="text-off-white/70 text-lg">
            Mint TRUST tokens for testing the TrustBridge protocol
          </p>
        </div>

        {/* Contract Info */}
        <Card className="mb-8 p-6 bg-midnight-800/50 border-medium-gray/30">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-blue mr-2" />
              <span className="text-off-white">Loading contract info...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-off-white/60 mb-1">Token Name</div>
                <div className="text-lg font-semibold text-off-white">
                  {contractInfo.name || "Loading..."}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-off-white/60 mb-1">Symbol</div>
                <div className="text-lg font-semibold text-primary-blue-light">
                  {contractInfo.symbol || "Loading..."}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-off-white/60 mb-1">Total Supply</div>
                <div className="text-lg font-semibold text-off-white">
                  {formatNumber(contractInfo.totalSupply)} TRUST
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Minting Section */}
          <Card className="p-6 bg-midnight-800/50 border-medium-gray/30">
            <h2 className="text-2xl font-bold text-off-white mb-6 flex items-center">
              <Download className="w-6 h-6 mr-3 text-primary-blue" />
              Mint TRUST Tokens
            </h2>

            {!isConnected ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <p className="text-off-white/70 mb-4">
                  Connect your wallet to mint test tokens
                </p>
                <Button onClick={() => connectWallet('metamask')} className="w-full">
                  Connect Wallet
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Wallet Info */}
                <div className="bg-midnight-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-off-white/60">Your Wallet</span>
                    <button
                      onClick={copyAddress}
                      className="text-xs text-primary-blue-light hover:text-primary-blue-light/80 flex items-center"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </button>
                  </div>
                  <div className="text-sm font-mono text-off-white">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </div>
                </div>

                {/* Current Balance */}
                <div className="bg-midnight-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-off-white/60">Current Balance</span>
                    <button
                      onClick={loadContractInfo}
                      className="text-xs text-primary-blue-light hover:text-primary-blue-light/80 flex items-center"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Refresh
                    </button>
                  </div>
                  <div className="text-2xl font-bold text-primary-blue-light">
                    {formatNumber(balance)} TRUST
                  </div>
                </div>

                {/* Amount Selection */}
                <div>
                  <label className="block text-sm font-medium text-off-white mb-3">
                    Select Amount to Mint
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {MINT_AMOUNTS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedAmount(option.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selectedAmount === option.value
                            ? 'border-primary-blue bg-primary-blue/10 text-primary-blue'
                            : 'border-medium-gray/50 bg-midnight-700/50 text-off-white hover:border-medium-gray'
                        }`}
                      >
                        <div className="font-semibold">{option.label}</div>
                        <div className="text-xs text-off-white/60">{option.description}</div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Amount */}
                  <div>
                    <label className="block text-sm font-medium text-off-white mb-2">
                      Or enter custom amount
                    </label>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Enter amount (e.g., 500)"
                      className="w-full px-4 py-3 bg-dark-gray border border-medium-gray/50 rounded-lg text-off-white placeholder-off-white/40 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 focus:outline-none transition-all duration-200 dark:bg-dark-gray dark:text-off-white dark:border-medium-gray/50"
                    />
                  </div>
                </div>

                {/* Limits Info */}
                <div className="bg-midnight-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-off-white mb-2">Minting Limits</h4>
                  <div className="space-y-1 text-xs text-off-white/60">
                    <div>Per mint: 1,000 TRUST maximum</div>
                    <div>No daily limits - mint as needed for testing</div>
                    <div>Multiple mints allowed for larger amounts</div>
                  </div>
                </div>

                {/* Mint Button */}
                <Button
                  onClick={handleMint}
                  disabled={isMinting}
                  className="w-full"
                >
                  {isMinting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Minting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Mint {customAmount || selectedAmount} TRUST
                    </>
                  )}
                </Button>

                {/* Helpful note for larger amounts */}
                {parseFloat(customAmount || selectedAmount) > 1000 && (
                  <div className="flex items-center text-yellow-400 text-sm">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Amount exceeds 1,000 limit. Please mint in smaller batches.
                  </div>
                )}

              </div>
            )}
          </Card>

          {/* Info Section */}
          <Card className="p-6 bg-midnight-800/50 border-medium-gray/30">
            <h2 className="text-2xl font-bold text-off-white mb-6 flex items-center">
              <CheckCircle className="w-6 h-6 mr-3 text-primary-blue-light" />
              How to Use
            </h2>

            <div className="space-y-4">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-primary-blue/20 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-bold text-primary-blue">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-off-white mb-1">Connect Wallet</h4>
                  <p className="text-sm text-off-white/70">
                    Connect your MetaMask wallet to the Hedera testnet
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-6 h-6 bg-primary-blue/20 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-bold text-primary-blue">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-off-white mb-1">Mint Tokens</h4>
                  <p className="text-sm text-off-white/70">
                    Choose an amount (max 1,000 per mint) and mint TRUST tokens for testing
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-6 h-6 bg-primary-blue/20 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-bold text-primary-blue">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-off-white mb-1">Test Features</h4>
                  <p className="text-sm text-off-white/70">
                    Use tokens to register as an attestor or test other features
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-midnight-700/50 rounded-lg">
              <h4 className="font-semibold text-off-white mb-2">Testnet Limits</h4>
              <ul className="text-sm text-off-white/70 space-y-1">
                <li>• Maximum 1,000 TRUST per mint</li>
                <li>• No daily limits - mint as needed</li>
                <li>• Multiple mints allowed for larger amounts</li>
                <li>• Tokens are for testing only</li>
                <li>• No real value on mainnet</li>
              </ul>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-primary-blue/10 to-primary-blue-light/10 rounded-lg border border-primary-blue/20">
              <h4 className="font-semibold text-primary-blue mb-2">Need Help?</h4>
              <p className="text-sm text-off-white/70 mb-3">
                If you encounter any issues, check the console for detailed error messages.
              </p>
              <a
                href="https://docs.hedera.com/hedera/networks/testnet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-blue-light hover:text-primary-blue-light/80 flex items-center"
              >
                Hedera Testnet Documentation
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
