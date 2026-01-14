import { ethers } from 'ethers';

// Note: This service is for Ethereum-based governance
// TrustBridge uses Hedera HCS for governance, not Ethereum contracts
// This file is kept for reference but not used in production

// Deployed contract addresses from hedera-universal-system.json
const GOVERNANCE_ADDRESS = "0x9E12ae4320D02b566e9E25dD007c04c727c9fa5b";

export interface Proposal {
  id: string;
  proposer: string;
  targets: string[];
  values: string[];
  signatures: string[];
  calldatas: string[];
  startBlock: string;
  endBlock: string;
  forVotes: string;
  againstVotes: string;
  canceled: boolean;
  executed: boolean;
  description: string;
}

export interface ProposalParams {
  targets: string[];
  values: string[];
  signatures: string[];
  calldatas: string[];
  description: string;
}

export interface VoteParams {
  proposalId: string;
  support: boolean; // true for "for", false for "against"
}

class GovernanceService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private governanceContract: ethers.Contract | null = null;
  private isConnected = false;

  public initialize(provider: ethers.BrowserProvider | null, signer: ethers.Signer | null) {
    this.provider = provider;
    this.signer = signer;
    this.isConnected = !!provider && !!signer;

    if (this.isConnected && this.signer) {
      this.governanceContract = new ethers.Contract(GOVERNANCE_ADDRESS, GovernanceABI.abi, this.signer);
    } else {
      this.governanceContract = null;
    }
    console.log('GovernanceService initialized:', this.isConnected);
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

  public async createProposal(params: ProposalParams): Promise<{ success: boolean; proposalId?: string; transactionHash?: string; error?: string }> {
    if (!this.governanceContract || !this.signer || !this.isConnected) {
      return { success: false, error: 'Wallet not connected or contract not initialized.' };
    }

    const isHederaTestnet = await this.ensureHederaTestnet();
    if (!isHederaTestnet) {
      return { success: false, error: 'Failed to connect to Hedera Testnet.' };
    }

    try {
      console.log('Creating proposal with params:', params);

      const tx = await this.governanceContract.propose(
        params.targets,
        params.values.map(v => ethers.parseEther(v)),
        params.signatures,
        params.calldatas,
        params.description
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Extract proposal ID from events
      let proposalId: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.governanceContract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'ProposalCreated') {
            proposalId = parsedLog.args.proposalId.toString();
            break;
          }
        } catch (e) {
          // Not a ProposalCreated event, continue
        }
      }

      return {
        success: true,
        proposalId: proposalId,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error('Proposal creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async castVote(params: VoteParams): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.governanceContract || !this.signer || !this.isConnected) {
      return { success: false, error: 'Wallet not connected or contract not initialized.' };
    }

    const isHederaTestnet = await this.ensureHederaTestnet();
    if (!isHederaTestnet) {
      return { success: false, error: 'Failed to connect to Hedera Testnet.' };
    }

    try {
      console.log('Casting vote:', params);

      const tx = await this.governanceContract.castVote(
        params.proposalId,
        params.support
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      return {
        success: true,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error('Vote casting failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async executeProposal(proposalId: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.governanceContract || !this.signer || !this.isConnected) {
      return { success: false, error: 'Wallet not connected or contract not initialized.' };
    }

    const isHederaTestnet = await this.ensureHederaTestnet();
    if (!isHederaTestnet) {
      return { success: false, error: 'Failed to connect to Hedera Testnet.' };
    }

    try {
      console.log('Executing proposal:', proposalId);

      const tx = await this.governanceContract.execute(proposalId);
      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      return {
        success: true,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error('Proposal execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async getProposal(proposalId: string): Promise<Proposal | null> {
    if (!this.governanceContract) {
      return null;
    }

    try {
      const proposal = await this.governanceContract.proposals(proposalId);
      return {
        id: proposal.id.toString(),
        proposer: proposal.proposer,
        targets: proposal.targets,
        values: proposal.values.map((v: any) => ethers.formatEther(v)),
        signatures: proposal.signatures,
        calldatas: proposal.calldatas,
        startBlock: proposal.startBlock.toString(),
        endBlock: proposal.endBlock.toString(),
        forVotes: ethers.formatEther(proposal.forVotes),
        againstVotes: ethers.formatEther(proposal.againstVotes),
        canceled: proposal.canceled,
        executed: proposal.executed,
        description: proposal.description,
      };
    } catch (error) {
      console.error('Failed to get proposal:', error);
      return null;
    }
  }

  public async hasVoted(userAddress: string, proposalId: string): Promise<boolean> {
    if (!this.governanceContract) {
      return false;
    }

    try {
      return await this.governanceContract.hasVoted(userAddress, proposalId);
    } catch (error) {
      console.error('Failed to check if user has voted:', error);
      return false;
    }
  }

  public async getProposalCount(): Promise<number> {
    if (!this.governanceContract) {
      return 0;
    }

    try {
      return Number(await this.governanceContract.proposalCount());
    } catch (error) {
      console.error('Failed to get proposal count:', error);
      return 0;
    }
  }

  public async getVotingPower(userAddress: string): Promise<string> {
    if (!this.governanceContract) {
      return '0';
    }

    try {
      // This would need to be implemented based on TRUST token balance
      // For now, we'll return a placeholder
      return '0';
    } catch (error) {
      console.error('Failed to get voting power:', error);
      return '0';
    }
  }

  public async getProposalThreshold(): Promise<string> {
    if (!this.governanceContract) {
      return '0';
    }

    try {
      const threshold = await this.governanceContract.PROPOSAL_THRESHOLD();
      return ethers.formatEther(threshold);
    } catch (error) {
      console.error('Failed to get proposal threshold:', error);
      return '0';
    }
  }

  public async getVotingDelay(): Promise<number> {
    if (!this.governanceContract) {
      return 0;
    }

    try {
      return Number(await this.governanceContract.VOTING_DELAY());
    } catch (error) {
      console.error('Failed to get voting delay:', error);
      return 0;
    }
  }

  public async getVotingPeriod(): Promise<number> {
    if (!this.governanceContract) {
      return 0;
    }

    try {
      return Number(await this.governanceContract.VOTING_PERIOD());
    } catch (error) {
      console.error('Failed to get voting period:', error);
      return 0;
    }
  }

  public getProposalStatus(proposal: Proposal, currentBlock: number): string {
    if (proposal.canceled) return 'Canceled';
    if (proposal.executed) return 'Executed';
    if (currentBlock < Number(proposal.startBlock)) return 'Pending';
    if (currentBlock <= Number(proposal.endBlock)) return 'Active';
    if (Number(proposal.forVotes) <= Number(proposal.againstVotes)) return 'Defeated';
    return 'Succeeded';
  }

  public getVotePercentage(forVotes: string, againstVotes: string): { for: number; against: number } {
    const forNum = Number(forVotes);
    const againstNum = Number(againstVotes);
    const total = forNum + againstNum;
    
    if (total === 0) return { for: 0, against: 0 };
    
    return {
      for: (forNum / total) * 100,
      against: (againstNum / total) * 100,
    };
  }
}

export const governanceService = new GovernanceService();
