import { ethers } from 'ethers';

// Note: This service is for Ethereum-based TRUST token operations
// TrustBridge uses Hedera HTS for TRUST token, not Ethereum contracts
// This file is kept for reference but not used in production

// Deployed contract addresses from fresh deployment
const TRUST_TOKEN_ADDRESS = "0x0fB610F665dCfd6A55515eBe735413ceB82a1501";

export interface StakingInfo {
  stakedAmount: string;
  stakingTimestamp: string;
  lockPeriod: string;
  pendingRewards: string;
  canUnstake: boolean;
}

export interface StakingParams {
  amount: string;
  lockPeriod: string; // in days
}

class TrustTokenService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private trustTokenContract: ethers.Contract | null = null;
  private isConnected = false;

  public initialize(provider: ethers.BrowserProvider | null, signer: ethers.Signer | null) {
    this.provider = provider;
    this.signer = signer;
    this.isConnected = !!provider && !!signer;

    if (this.isConnected && this.signer) {
      this.trustTokenContract = new ethers.Contract(TRUST_TOKEN_ADDRESS, TrustTokenABI.abi, this.signer);
    } else {
      this.trustTokenContract = null;
    }
    console.log('TrustTokenService initialized:', this.isConnected);
  }

  public async ensureHederaTestnet(): Promise<boolean> {
    if (!window.ethereum) {
      console.error("MetaMask is not installed!");
      return false;
    }

    const HEDERA_TESTNET_CHAIN_ID = '0x128'; // 296 in decimal
    const HEDERA_TESTNET_RPC_URL = 'https://testnet.hashio.io/api';
    const HEDERA_TESTNET_CHAIN_NAME = 'Hedera Testnet';
    const HEDERA_TESTNET_CURRENCY_SYMBOL = 'HBAR';

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });

      if (chainId !== HEDERA_TESTNET_CHAIN_ID) {
        console.log('Switching to Hedera Testnet...');
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: HEDERA_TESTNET_CHAIN_ID }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: HEDERA_TESTNET_CHAIN_ID,
                    chainName: HEDERA_TESTNET_CHAIN_NAME,
                    rpcUrls: [HEDERA_TESTNET_RPC_URL],
                    nativeCurrency: {
                      name: HEDERA_TESTNET_CURRENCY_SYMBOL,
                      symbol: HEDERA_TESTNET_CURRENCY_SYMBOL,
                      decimals: 18,
                    },
                    blockExplorerUrls: ['https://hashscan.io/testnet/'],
                  },
                ],
              });
            } catch (addError) {
              console.error('Failed to add Hedera Testnet:', addError);
              return false;
            }
          } else {
            console.error('Failed to switch to Hedera Testnet:', switchError);
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Error ensuring Hedera Testnet:', error);
      return false;
    }
  }

  public async getBalance(userAddress: string): Promise<string> {
    if (!this.trustTokenContract) {
      return '0';
    }

    try {
      const balance = await this.trustTokenContract.balanceOf(userAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get TRUST token balance:', error);
      return '0';
    }
  }

  public async getTotalSupply(): Promise<string> {
    if (!this.trustTokenContract) {
      return '0';
    }

    try {
      const totalSupply = await this.trustTokenContract.totalSupply();
      return ethers.formatEther(totalSupply);
    } catch (error) {
      console.error('Failed to get total supply:', error);
      return '0';
    }
  }

  public async getMaxSupply(): Promise<string> {
    if (!this.trustTokenContract) {
      return '0';
    }

    try {
      const maxSupply = await this.trustTokenContract.MAX_SUPPLY();
      return ethers.formatEther(maxSupply);
    } catch (error) {
      console.error('Failed to get max supply:', error);
      return '0';
    }
  }

  public async stake(params: StakingParams): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.trustTokenContract || !this.signer || !this.isConnected) {
      return { success: false, error: 'Wallet not connected or contract not initialized.' };
    }

    const isHederaTestnet = await this.ensureHederaTestnet();
    if (!isHederaTestnet) {
      return { success: false, error: 'Failed to connect to Hedera Testnet.' };
    }

    try {
      console.log('Staking TRUST tokens:', params);

      const lockPeriodSeconds = Number(params.lockPeriod) * 24 * 60 * 60; // Convert days to seconds

      const tx = await this.trustTokenContract.stake(
        ethers.parseEther(params.amount),
        lockPeriodSeconds
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      return {
        success: true,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error('Staking failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async unstake(): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.trustTokenContract || !this.signer || !this.isConnected) {
      return { success: false, error: 'Wallet not connected or contract not initialized.' };
    }

    const isHederaTestnet = await this.ensureHederaTestnet();
    if (!isHederaTestnet) {
      return { success: false, error: 'Failed to connect to Hedera Testnet.' };
    }

    try {
      console.log('Unstaking TRUST tokens');

      const tx = await this.trustTokenContract.unstake();
      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      return {
        success: true,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error('Unstaking failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async getStakingInfo(userAddress: string): Promise<StakingInfo | null> {
    if (!this.trustTokenContract) {
      return null;
    }

    try {
      const [stakedAmount, stakingTimestamp, lockPeriod, pendingRewards] = await Promise.all([
        this.trustTokenContract.stakingBalances(userAddress),
        this.trustTokenContract.stakingTimestamps(userAddress),
        this.trustTokenContract.lockPeriods(userAddress),
        this.trustTokenContract.calculateReward(userAddress),
      ]);

      const currentTime = Math.floor(Date.now() / 1000);
      const lockEndTime = Number(stakingTimestamp) + Number(lockPeriod);
      const canUnstake = currentTime >= lockEndTime;

      return {
        stakedAmount: ethers.formatEther(stakedAmount),
        stakingTimestamp: new Date(Number(stakingTimestamp) * 1000).toISOString(),
        lockPeriod: (Number(lockPeriod) / (24 * 60 * 60)).toString(), // Convert seconds to days
        pendingRewards: ethers.formatEther(pendingRewards),
        canUnstake,
      };
    } catch (error) {
      console.error('Failed to get staking info:', error);
      return null;
    }
  }

  public async calculateReward(userAddress: string): Promise<string> {
    if (!this.trustTokenContract) {
      return '0';
    }

    try {
      const reward = await this.trustTokenContract.calculateReward(userAddress);
      return ethers.formatEther(reward);
    } catch (error) {
      console.error('Failed to calculate reward:', error);
      return '0';
    }
  }

  public async getStakingAPY(lockPeriodDays: number): Promise<number> {
    // APY calculation based on lock period (from contract logic)
    if (lockPeriodDays <= 30) return 5; // 5%
    else if (lockPeriodDays <= 90) return 10; // 10%
    else if (lockPeriodDays <= 180) return 15; // 15%
    else return 25; // 25%
  }

  public async getTokenInfo(): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
    maxSupply: string;
  }> {
    if (!this.trustTokenContract) {
      return {
        name: 'TrustBridge',
        symbol: 'TRUST',
        decimals: 18,
        totalSupply: '0',
        maxSupply: '0',
      };
    }

    try {
      const [name, symbol, decimals, totalSupply, maxSupply] = await Promise.all([
        this.trustTokenContract.name(),
        this.trustTokenContract.symbol(),
        this.trustTokenContract.decimals(),
        this.trustTokenContract.totalSupply(),
        this.trustTokenContract.MAX_SUPPLY(),
      ]);

      return {
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: ethers.formatEther(totalSupply),
        maxSupply: ethers.formatEther(maxSupply),
      };
    } catch (error) {
      console.error('Failed to get token info:', error);
      return {
        name: 'TrustBridge',
        symbol: 'TRUST',
        decimals: 18,
        totalSupply: '0',
        maxSupply: '0',
      };
    }
  }

  public async approve(spender: string, amount: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.trustTokenContract || !this.signer || !this.isConnected) {
      return { success: false, error: 'Wallet not connected or contract not initialized.' };
    }

    const isHederaTestnet = await this.ensureHederaTestnet();
    if (!isHederaTestnet) {
      return { success: false, error: 'Failed to connect to Hedera Testnet.' };
    }

    try {
      console.log('Approving TRUST token spend:', { spender, amount });

      const tx = await this.trustTokenContract.approve(spender, ethers.parseEther(amount));
      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      return {
        success: true,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error('Approval failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async getAllowance(owner: string, spender: string): Promise<string> {
    if (!this.trustTokenContract) {
      return '0';
    }

    try {
      const allowance = await this.trustTokenContract.allowance(owner, spender);
      return ethers.formatEther(allowance);
    } catch (error) {
      console.error('Failed to get allowance:', error);
      return '0';
    }
  }
}

export const trustTokenService = new TrustTokenService();
