import { ethers } from 'ethers';
import { novaxContractAddresses } from '../config/contracts';
import NovaxStakingVaultABI from '../contracts/NovaxStakingVault.json';
import VaultCapacityManagerABI from '../contracts/VaultCapacityManager.json';
import MockUSDCABI from '../contracts/MockUSDC.json';

export class StakingVaultService {
  private static instance: StakingVaultService;
  private signer: ethers.Signer | null = null;
  private provider: ethers.Provider | null = null;

  private constructor() {}

  public static getInstance(): StakingVaultService {
    if (!StakingVaultService.instance) {
      StakingVaultService.instance = new StakingVaultService();
    }
    return StakingVaultService.instance;
  }

  initialize(signer: ethers.Signer | null, provider: ethers.Provider) {
    this.signer = signer;
    this.provider = provider;
  }

  private getContract(address: string, abi: any) {
    if (!this.signer && !this.provider) {
      throw new Error('Service not initialized');
    }
    
    // Validate contract address
    if (!address || address.trim() === '' || address === '0x0000000000000000000000000000000000000000') {
      throw new Error('Staking Vault contract address is not configured. Please deploy the contract or set VITE_STAKING_VAULT_ADDRESS in your environment variables.');
    }
    
    // Extract ABI from JSON if needed (handles both direct array and { abi: [...] } formats)
    const abiArray = Array.isArray(abi) ? abi : abi.abi || abi;
    return new ethers.Contract(address, abiArray, this.signer || this.provider!);
  }

  /**
   * Get gas options with proper buffering to prevent "max fee per gas less than block base fee" errors
   */
  private async getGasOptions(bufferPercentage: number = 20): Promise<ethers.TransactionRequest> {
    if (!this.provider) {
      console.warn('Provider not available for gas options, returning empty object.');
      return {};
    }
    try {
      const feeData = await this.provider.getFeeData();
      let gasOptions: ethers.TransactionRequest = {};

      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        const bufferedMaxFee = (feeData.maxFeePerGas * BigInt(100 + bufferPercentage)) / 100n;
        const bufferedPriorityFee = (feeData.maxPriorityFeePerGas * BigInt(100 + bufferPercentage)) / 100n;
        gasOptions = {
          maxFeePerGas: bufferedMaxFee,
          maxPriorityFeePerGas: bufferedPriorityFee,
        };
        console.log(`⛽ Using buffered EIP-1559 fees (${bufferPercentage}% buffer):`, {
          maxFeePerGas: bufferedMaxFee.toString(),
          maxPriorityFeePerGas: bufferedPriorityFee.toString(),
        });
      } else if (feeData.gasPrice) {
        const bufferedGasPrice = (feeData.gasPrice * BigInt(100 + bufferPercentage)) / 100n;
        gasOptions = { gasPrice: bufferedGasPrice };
        console.log(`⛽ Using buffered legacy gas price (${bufferPercentage}% buffer):`, {
          gasPrice: bufferedGasPrice.toString(),
        });
      }
      return gasOptions;
    } catch (error) {
      console.warn('⚠️ Failed to fetch gas fee data, proceeding without explicit gas options:', error);
      return {};
    }
  }

  /**
   * Stake USDC to vault
   */
  async stake(
    amount: bigint,
    tier: number,
    autoCompound: boolean
  ): Promise<{ txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer not available');
    }

    // Check and approve USDC if needed
    const usdc = this.getContract(novaxContractAddresses.USDC, MockUSDCABI);
    const userAddress = await this.signer.getAddress();
    const stakingVaultAddress = novaxContractAddresses.STAKING_VAULT;
    
    const allowance = await usdc.allowance(userAddress, stakingVaultAddress);
    if (allowance < amount) {
      console.log('📝 Approving USDC spending for staking vault...');
      const gasOptions = await this.getGasOptions(30); // Use 30% buffer for safety
      try {
        const approveTx = await usdc.approve(stakingVaultAddress, ethers.MaxUint256, gasOptions);
        await approveTx.wait();
        console.log('✅ USDC approved');
      } catch (txError: any) {
        if (txError.message?.includes('max fee per gas') || txError.message?.includes('base fee')) {
          console.warn('⚠️ Gas price issue detected, retrying with fresh fee data...');
          const freshGasOptions = await this.getGasOptions(40); // Use 40% buffer on retry
          const approveTx = await usdc.approve(stakingVaultAddress, ethers.MaxUint256, freshGasOptions);
          await approveTx.wait();
          console.log('✅ USDC approved (retry successful)');
        } else {
          throw txError;
        }
      }
    }

    const vault = this.getContract(
      stakingVaultAddress,
      NovaxStakingVaultABI
    );

    const gasOptions = await this.getGasOptions(30); // Use 30% buffer for safety
    let tx;
    try {
      tx = await vault.stake(amount, tier, autoCompound, gasOptions);
    } catch (txError: any) {
      if (txError.message?.includes('max fee per gas') || txError.message?.includes('base fee')) {
        console.warn('⚠️ Gas price issue detected, retrying with fresh fee data...');
        const freshGasOptions = await this.getGasOptions(40); // Use 40% buffer on retry
        tx = await vault.stake(amount, tier, autoCompound, freshGasOptions);
      } else {
        throw txError;
      }
    }
    
    const receipt = await tx.wait();

    return { txHash: receipt.hash };
  }

  /**
   * Unstake from vault
   */
  async unstake(stakeIndex: number): Promise<{ txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer not available');
    }

    const vault = this.getContract(
      novaxContractAddresses.STAKING_VAULT,
      NovaxStakingVaultABI
    );

    const gasOptions = await this.getGasOptions(30); // Use 30% buffer for safety
    let tx;
    try {
      tx = await vault.unstake(stakeIndex, gasOptions);
    } catch (txError: any) {
      if (txError.message?.includes('max fee per gas') || txError.message?.includes('base fee')) {
        console.warn('⚠️ Gas price issue detected, retrying with fresh fee data...');
        const freshGasOptions = await this.getGasOptions(40); // Use 40% buffer on retry
        tx = await vault.unstake(stakeIndex, freshGasOptions);
      } else {
        throw txError;
      }
    }
    
    const receipt = await tx.wait();

    return { txHash: receipt.hash };
  }

  /**
   * Get vault status
   */
  async getVaultStatus(): Promise<{
    total: number;
    deployed: number;
    available: number;
    utilizationBps: number;
  }> {
    const vault = this.getContract(
      novaxContractAddresses.STAKING_VAULT,
      NovaxStakingVaultABI
    );

    const [total, deployed, available, utilizationBps] = await vault.getVaultStatus();

    return {
      total: Number(ethers.formatUnits(total, 6)),
      deployed: Number(ethers.formatUnits(deployed, 6)),
      available: Number(ethers.formatUnits(available, 6)),
      utilizationBps: Number(utilizationBps)
    };
  }

  /**
   * Get user stakes
   */
  async getUserStakes(address: string): Promise<any[]> {
    const vault = this.getContract(
      novaxContractAddresses.STAKING_VAULT,
      NovaxStakingVaultABI
    );

    const stakes = await vault.getUserStakes(address);
    return stakes;
  }

  /**
   * Get pending yield for a stake
   */
  async getPendingYield(address: string, stakeIndex: number): Promise<number> {
    const vault = this.getContract(
      novaxContractAddresses.STAKING_VAULT,
      NovaxStakingVaultABI
    );

    const yield_ = await vault.getPendingYield(address, stakeIndex);
    return Number(ethers.formatUnits(yield_, 6));
  }

  /**
   * Get complete user dashboard in ONE call (efficient!)
   */
  async getUserDashboard(address: string): Promise<{
    totalStaked: number;
    totalPendingYield: number;
    activeStakesCount: number;
    stakes: any[];
    vaultTotal: number;
    vaultDeployed: number;
    vaultUtilization: number;
  }> {
    const vault = this.getContract(
      novaxContractAddresses.STAKING_VAULT,
      NovaxStakingVaultABI
    );

    const [
      totalStakedAmount,
      totalPendingYield,
      activeStakesCount,
      stakes,
      vaultTotal,
      vaultDeployed,
      vaultUtilization
    ] = await vault.getUserDashboard(address);

    return {
      totalStaked: Number(ethers.formatUnits(totalStakedAmount, 6)),
      totalPendingYield: Number(ethers.formatUnits(totalPendingYield, 6)),
      activeStakesCount: Number(activeStakesCount),
      stakes: stakes,
      vaultTotal: Number(ethers.formatUnits(vaultTotal, 6)),
      vaultDeployed: Number(ethers.formatUnits(vaultDeployed, 6)),
      vaultUtilization: Number(vaultUtilization) / 100
    };
  }

  /**
   * Get complete vault analytics in ONE call (efficient!)
   */
  async getVaultAnalytics(): Promise<{
    totalStaked: number;
    totalDeployed: number;
    totalAvailable: number;
    utilization: number;
    totalYield: number;
    activePoolsCount: number;
    activePools: string[];
  }> {
    const vault = this.getContract(
      novaxContractAddresses.STAKING_VAULT,
      NovaxStakingVaultABI
    );

    const [
      totalStaked,
      totalDeployed,
      totalAvailable,
      utilizationBps,
      totalYield,
      activePoolsCount,
      activePools
    ] = await vault.getVaultAnalytics();

    return {
      totalStaked: Number(ethers.formatUnits(totalStaked, 6)),
      totalDeployed: Number(ethers.formatUnits(totalDeployed, 6)),
      totalAvailable: Number(ethers.formatUnits(totalAvailable, 6)),
      utilization: Number(utilizationBps) / 100,
      totalYield: Number(ethers.formatUnits(totalYield, 6)),
      activePoolsCount: Number(activePoolsCount),
      activePools: activePools
    };
  }

  /**
   * Get all tier configs in ONE call (efficient!)
   */
  async getAllTierConfigs(): Promise<{
    silver: any;
    gold: any;
    platinum: any;
    diamond: any;
  }> {
    const vault = this.getContract(
      novaxContractAddresses.STAKING_VAULT,
      NovaxStakingVaultABI
    );

    const [silver, gold, platinum, diamond] = await vault.getAllTierConfigs();

    return { silver, gold, platinum, diamond };
  }

  /**
   * Check if can stake
   */
  async canStake(amount: bigint): Promise<{ canStake: boolean; shouldWaitlist: boolean }> {
    const capacityManager = this.getContract(
      novaxContractAddresses.VAULT_CAPACITY_MANAGER,
      VaultCapacityManagerABI
    );

    const [canStake, shouldWaitlist] = await capacityManager.canStake(amount);
    return { canStake, shouldWaitlist };
  }

  /**
   * Get waitlist position
   */
  async getWaitlistPosition(address: string): Promise<{ position: number | null; amount: number }> {
    const capacityManager = this.getContract(
      novaxContractAddresses.VAULT_CAPACITY_MANAGER,
      VaultCapacityManagerABI
    );

    const [position, amount] = await capacityManager.getWaitlistPosition(address);
    
    return {
      position: Number(position) === -1 ? null : Number(position),
      amount: Number(ethers.formatUnits(amount, 6))
    };
  }

  /**
   * Get capacity status
   */
  async getCapacityStatus(): Promise<{
    capacity: number;
    staked: number;
    available: number;
    utilizationBps: number;
    waitlistTotal: number;
  }> {
    const capacityManager = this.getContract(
      novaxContractAddresses.VAULT_CAPACITY_MANAGER,
      VaultCapacityManagerABI
    );

    const [capacity, staked, available, utilizationBps, waitlistTotal] = 
      await capacityManager.getVaultStatus();

    return {
      capacity: Number(ethers.formatUnits(capacity, 6)),
      staked: Number(ethers.formatUnits(staked, 6)),
      available: Number(ethers.formatUnits(available, 6)),
      utilizationBps: Number(utilizationBps),
      waitlistTotal: Number(ethers.formatUnits(waitlistTotal, 6))
    };
  }
}

export const stakingVaultService = StakingVaultService.getInstance();

