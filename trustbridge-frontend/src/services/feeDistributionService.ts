import { ethers } from 'ethers';

// Note: This service is for Ethereum-based fee distribution
// TrustBridge uses Hedera HTS for fee distribution, not Ethereum contracts
// This file is kept for reference but not used in production

// Deployed contract addresses from hedera-universal-system.json
const FEE_DISTRIBUTION_ADDRESS = "0x091320a22B021BD5630a5df8bC0eA213fDeeee27";

export interface FeeAllocation {
  treasury: string;
  stakers: string;
  insurance: string;
  validators: string;
}

export interface FeeStats {
  totalFeesDistributed: string;
  treasuryFees: string;
  stakerFees: string;
  insuranceFees: string;
  validatorFees: string;
  totalStakerRewards: string;
}

class FeeDistributionService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private feeDistributionContract: ethers.Contract | null = null;
  private isConnected = false;

  public initialize(provider: ethers.BrowserProvider | null, signer: ethers.Signer | null) {
    this.provider = provider;
    this.signer = signer;
    this.isConnected = !!provider && !!signer;

    if (this.isConnected && this.signer) {
      this.feeDistributionContract = new ethers.Contract(FEE_DISTRIBUTION_ADDRESS, FeeDistributionABI.abi, this.signer);
    } else {
      this.feeDistributionContract = null;
    }
    console.log('FeeDistributionService initialized:', this.isConnected);
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

  public async distributeFees(amount: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.feeDistributionContract || !this.signer || !this.isConnected) {
      return { success: false, error: 'Wallet not connected or contract not initialized.' };
    }

    const isHederaTestnet = await this.ensureHederaTestnet();
    if (!isHederaTestnet) {
      return { success: false, error: 'Failed to connect to Hedera Testnet.' };
    }

    try {
      console.log('Distributing fees:', amount);

      const tx = await this.feeDistributionContract.distributeFees({
        value: ethers.parseEther(amount)
      });

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      return {
        success: true,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error('Fee distribution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async claimValidatorRewards(): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.feeDistributionContract || !this.signer || !this.isConnected) {
      return { success: false, error: 'Wallet not connected or contract not initialized.' };
    }

    const isHederaTestnet = await this.ensureHederaTestnet();
    if (!isHederaTestnet) {
      return { success: false, error: 'Failed to connect to Hedera Testnet.' };
    }

    try {
      console.log('Claiming validator rewards');

      const tx = await this.feeDistributionContract.claimValidatorRewards();
      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      return {
        success: true,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error('Validator reward claim failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async getValidatorRewards(validatorAddress: string): Promise<string> {
    if (!this.feeDistributionContract) {
      return '0';
    }

    try {
      const rewards = await this.feeDistributionContract.validatorRewards(validatorAddress);
      return ethers.formatEther(rewards);
    } catch (error) {
      console.error('Failed to get validator rewards:', error);
      return '0';
    }
  }

  public async getTotalStakerRewards(): Promise<string> {
    if (!this.feeDistributionContract) {
      return '0';
    }

    try {
      const totalRewards = await this.feeDistributionContract.totalStakerRewards();
      return ethers.formatEther(totalRewards);
    } catch (error) {
      console.error('Failed to get total staker rewards:', error);
      return '0';
    }
  }

  public async getTreasuryWallet(): Promise<string> {
    if (!this.feeDistributionContract) {
      return '';
    }

    try {
      return await this.feeDistributionContract.treasuryWallet();
    } catch (error) {
      console.error('Failed to get treasury wallet:', error);
      return '';
    }
  }

  public async getInsurancePool(): Promise<string> {
    if (!this.feeDistributionContract) {
      return '';
    }

    try {
      return await this.feeDistributionContract.insurancePool();
    } catch (error) {
      console.error('Failed to get insurance pool:', error);
      return '';
    }
  }

  public async getTrustToken(): Promise<string> {
    if (!this.feeDistributionContract) {
      return '';
    }

    try {
      return await this.feeDistributionContract.trustToken();
    } catch (error) {
      console.error('Failed to get trust token address:', error);
      return '';
    }
  }

  public calculateFeeAllocation(totalFees: string): FeeAllocation {
    const total = Number(totalFees);
    return {
      treasury: (total * 0.4).toString(), // 40%
      stakers: (total * 0.3).toString(),  // 30%
      insurance: (total * 0.2).toString(), // 20%
      validators: (total * 0.1).toString(), // 10%
    };
  }

  public async getFeeStats(): Promise<FeeStats> {
    try {
      const [treasuryWallet, insurancePool, totalStakerRewards] = await Promise.all([
        this.getTreasuryWallet(),
        this.getInsurancePool(),
        this.getTotalStakerRewards(),
      ]);

      // Get balances of treasury and insurance pools
      const treasuryBalance = treasuryWallet ? await this.getContractBalance(treasuryWallet) : '0';
      const insuranceBalance = insurancePool ? await this.getContractBalance(insurancePool) : '0';

      return {
        totalFeesDistributed: (Number(treasuryBalance) + Number(insuranceBalance) + Number(totalStakerRewards)).toString(),
        treasuryFees: treasuryBalance,
        stakerFees: totalStakerRewards,
        insuranceFees: insuranceBalance,
        validatorFees: '0', // Would need to track this separately
        totalStakerRewards: totalStakerRewards,
      };
    } catch (error) {
      console.error('Failed to get fee stats:', error);
      return {
        totalFeesDistributed: '0',
        treasuryFees: '0',
        stakerFees: '0',
        insuranceFees: '0',
        validatorFees: '0',
        totalStakerRewards: '0',
      };
    }
  }

  private async getContractBalance(address: string): Promise<string> {
    if (!this.provider) {
      return '0';
    }

    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get contract balance:', error);
      return '0';
    }
  }

  public getFeeAllocationPercentages(): { treasury: number; stakers: number; insurance: number; validators: number } {
    return {
      treasury: 40,
      stakers: 30,
      insurance: 20,
      validators: 10,
    };
  }
}

export const feeDistributionService = new FeeDistributionService();
