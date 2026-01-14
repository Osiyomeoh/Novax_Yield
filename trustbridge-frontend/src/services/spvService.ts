import { ethers } from 'ethers';

// Note: This service is for Ethereum-based SPV operations
// TrustBridge uses Hedera HTS/HCS for SPV management, not Ethereum contracts
// This file is kept for reference but not used in production

// Deployed contract addresses from hedera-universal-system.json
const SPV_MANAGER_ADDRESS = "0xBd75613A1A3dA62D52b0de6B840513E60df82850";

export interface SPV {
  spvId: string;
  name: string;
  manager: string;
  investors: string[];
  totalCapital: string;
  minimumInvestment: string;
  maximumInvestors: string;
  managementFee: string;
  performanceFee: string;
  status: number; // 0: Created, 1: Active, 2: Closed, 3: Liquidated
  createdAt: string;
  closedAt: string;
  jurisdiction: string;
  complianceStatus: string;
}

export interface Investment {
  investmentId: string;
  spvId: string;
  investor: string;
  amount: string;
  timestamp: string;
  status: number; // 0: Pending, 1: Approved, 2: Rejected
}

export interface SPVCreationParams {
  name: string;
  totalCapital: string;
  minimumInvestment: string;
  maximumInvestors: string;
  managementFee: string;
  performanceFee: string;
  jurisdiction: string;
}

export interface InvestmentProposalParams {
  spvId: string;
  amount: string;
}

class SPVService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private spvManagerContract: ethers.Contract | null = null;
  private isConnected = false;

  public initialize(provider: ethers.BrowserProvider | null, signer: ethers.Signer | null) {
    this.provider = provider;
    this.signer = signer;
    this.isConnected = !!provider && !!signer;

    if (this.isConnected && this.signer) {
      this.spvManagerContract = new ethers.Contract(SPV_MANAGER_ADDRESS, SPVManagerABI.abi, this.signer);
    } else {
      this.spvManagerContract = null;
    }
    console.log('SPVService initialized:', this.isConnected);
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

  public async createSPV(params: SPVCreationParams): Promise<{ success: boolean; spvId?: string; transactionHash?: string; error?: string }> {
    if (!this.spvManagerContract || !this.signer || !this.isConnected) {
      return { success: false, error: 'Wallet not connected or contract not initialized.' };
    }

    const isHederaTestnet = await this.ensureHederaTestnet();
    if (!isHederaTestnet) {
      return { success: false, error: 'Failed to connect to Hedera Testnet.' };
    }

    try {
      console.log('Creating SPV with params:', params);

      const tx = await this.spvManagerContract.createSPV(
        params.name,
        ethers.parseEther(params.totalCapital),
        ethers.parseEther(params.minimumInvestment),
        Number(params.maximumInvestors),
        ethers.parseUnits(params.managementFee, 2), // Convert percentage to basis points
        ethers.parseUnits(params.performanceFee, 2), // Convert percentage to basis points
        params.jurisdiction
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Extract SPV ID from events
      let spvId: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.spvManagerContract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'SPVCreated') {
            spvId = parsedLog.args.spvId;
            break;
          }
        } catch (e) {
          // Not an SPVCreated event, continue
        }
      }

      return {
        success: true,
        spvId: spvId,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error('SPV creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async proposeInvestment(params: InvestmentProposalParams): Promise<{ success: boolean; investmentId?: string; transactionHash?: string; error?: string }> {
    if (!this.spvManagerContract || !this.signer || !this.isConnected) {
      return { success: false, error: 'Wallet not connected or contract not initialized.' };
    }

    const isHederaTestnet = await this.ensureHederaTestnet();
    if (!isHederaTestnet) {
      return { success: false, error: 'Failed to connect to Hedera Testnet.' };
    }

    try {
      console.log('Proposing investment:', params);

      const tx = await this.spvManagerContract.proposeInvestment(
        params.spvId,
        ethers.parseEther(params.amount)
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Extract investment ID from events
      let investmentId: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.spvManagerContract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'InvestmentProposed') {
            investmentId = parsedLog.args.investmentId;
            break;
          }
        } catch (e) {
          // Not an InvestmentProposed event, continue
        }
      }

      return {
        success: true,
        investmentId: investmentId,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error('Investment proposal failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async getSPV(spvId: string): Promise<SPV | null> {
    if (!this.spvManagerContract) {
      return null;
    }

    try {
      const spv = await this.spvManagerContract.getSPV(spvId);
      return {
        spvId: spv.spvId,
        name: spv.name,
        manager: spv.manager,
        investors: spv.investors,
        totalCapital: ethers.formatEther(spv.totalCapital),
        minimumInvestment: ethers.formatEther(spv.minimumInvestment),
        maximumInvestors: spv.maximumInvestors.toString(),
        managementFee: ethers.formatUnits(spv.managementFee, 2),
        performanceFee: ethers.formatUnits(spv.performanceFee, 2),
        status: Number(spv.status),
        createdAt: new Date(Number(spv.createdAt) * 1000).toISOString(),
        closedAt: spv.closedAt > 0 ? new Date(Number(spv.closedAt) * 1000).toISOString() : '',
        jurisdiction: spv.jurisdiction,
        complianceStatus: spv.complianceStatus,
      };
    } catch (error) {
      console.error('Failed to get SPV:', error);
      return null;
    }
  }

  public async getSPVInvestors(spvId: string): Promise<string[]> {
    if (!this.spvManagerContract) {
      return [];
    }

    try {
      return await this.spvManagerContract.getSPVInvestors(spvId);
    } catch (error) {
      console.error('Failed to get SPV investors:', error);
      return [];
    }
  }

  public async getInvestorSPVs(investorAddress: string): Promise<string[]> {
    if (!this.spvManagerContract) {
      return [];
    }

    try {
      return await this.spvManagerContract.getInvestorSPVs(investorAddress);
    } catch (error) {
      console.error('Failed to get investor SPVs:', error);
      return [];
    }
  }

  public async getManagerSPVs(managerAddress: string): Promise<string[]> {
    if (!this.spvManagerContract) {
      return [];
    }

    try {
      return await this.spvManagerContract.getManagerSPVs(managerAddress);
    } catch (error) {
      console.error('Failed to get manager SPVs:', error);
      return [];
    }
  }

  public async getInvestment(investmentId: string): Promise<Investment | null> {
    if (!this.spvManagerContract) {
      return null;
    }

    try {
      const investment = await this.spvManagerContract.investments(investmentId);
      return {
        investmentId: investment.investmentId,
        spvId: investment.spvId,
        investor: investment.investor,
        amount: ethers.formatEther(investment.amount),
        timestamp: new Date(Number(investment.timestamp) * 1000).toISOString(),
        status: Number(investment.status),
      };
    } catch (error) {
      console.error('Failed to get investment:', error);
      return null;
    }
  }

  public async getTotalSPVs(): Promise<number> {
    if (!this.spvManagerContract) {
      return 0;
    }

    try {
      return Number(await this.spvManagerContract.totalSPVs());
    } catch (error) {
      console.error('Failed to get total SPVs:', error);
      return 0;
    }
  }

  public async getTotalInvestments(): Promise<number> {
    if (!this.spvManagerContract) {
      return 0;
    }

    try {
      return Number(await this.spvManagerContract.totalInvestments());
    } catch (error) {
      console.error('Failed to get total investments:', error);
      return 0;
    }
  }

  public getStatusText(status: number): string {
    switch (status) {
      case 0: return 'Created';
      case 1: return 'Active';
      case 2: return 'Closed';
      case 3: return 'Liquidated';
      default: return 'Unknown';
    }
  }

  public getInvestmentStatusText(status: number): string {
    switch (status) {
      case 0: return 'Pending';
      case 1: return 'Approved';
      case 2: return 'Rejected';
      default: return 'Unknown';
    }
  }
}

export const spvService = new SPVService();
