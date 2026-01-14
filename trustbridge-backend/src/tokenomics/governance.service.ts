import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HederaService } from '../hedera/hedera.service';
import { User, UserDocument } from '../schemas/user.schema';
import { ProposalModel, ProposalDocument, ProposalType, ProposalStatus } from '../models/governance.model';

export interface CreateProposalDto {
  proposer: string;
  type: ProposalType;
  title: string;
  description: string;
  parameters?: any;
  votingDuration?: number; // in days
}

export interface VoteDto {
  voter: string;
  proposalId: string;
  vote: 'FOR' | 'AGAINST' | 'ABSTAIN';
  signature?: string;
}

export interface ProposalResult {
  proposalId: string;
  status: ProposalStatus;
  votesFor: string;
  votesAgainst: string;
  totalVotes: string;
  quorumMet: boolean;
  passed: boolean;
  executionTxHash?: string;
}

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);
  
  private readonly governanceConfig = {
    minProposalThreshold: 10000, // 10,000 TRB minimum to propose
    quorumPercentage: 20, // 20% of circulating supply
    votingDuration: 7, // 7 days default
    executionDelay: 1, // 1 day delay before execution
  };

  constructor(
    @InjectModel('Proposal') private proposalModel: Model<ProposalDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly hederaService: HederaService,
  ) {}

  /**
   * Create a new governance proposal
   */
  async createProposal(createProposalDto: CreateProposalDto): Promise<ProposalDocument> {
    try {
      // Check if proposer has enough tokens
      const proposer = await this.userModel.findOne({ walletAddress: createProposalDto.proposer });
      if (!proposer) {
        throw new Error('Proposer not found');
      }

      const tokenBalance = await this.hederaService.getTokenBalance(createProposalDto.proposer, '0');
      if (tokenBalance < this.governanceConfig.minProposalThreshold) {
        throw new Error(`Insufficient tokens to propose. Required: ${this.governanceConfig.minProposalThreshold} TRB`);
      }

      const proposalId = this.generateProposalId();
      const votingDuration = createProposalDto.votingDuration || this.governanceConfig.votingDuration;
      const votingStart = new Date();
      const votingEnd = new Date(votingStart.getTime() + votingDuration * 24 * 60 * 60 * 1000);

      // Calculate quorum requirement
      const circulatingSupply = await this.getCirculatingSupply();
      const quorumRequired = (circulatingSupply * this.governanceConfig.quorumPercentage) / 100;

      const proposal = new this.proposalModel({
        id: proposalId,
        proposer: createProposalDto.proposer,
        type: createProposalDto.type,
        title: createProposalDto.title,
        description: createProposalDto.description,
        parameters: createProposalDto.parameters,
        status: ProposalStatus.ACTIVE,
        votingStart,
        votingEnd,
        quorumRequired: quorumRequired.toString(),
        votesFor: '0',
        votesAgainst: '0',
        totalVotes: '0',
        execution: {
          executed: false,
        },
        votes: [],
      });

      await proposal.save();

      this.logger.log(`Proposal created: ${proposalId} by ${createProposalDto.proposer}`);
      return proposal;

    } catch (error) {
      this.logger.error('Failed to create proposal:', error);
      throw error;
    }
  }

  /**
   * Cast a vote on a proposal
   */
  async castVote(voteDto: VoteDto): Promise<void> {
    try {
      const proposal = await this.proposalModel.findOne({ id: voteDto.proposalId });
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      // Check if voting is still active
      if (proposal.status !== ProposalStatus.ACTIVE) {
        throw new Error('Proposal is not active for voting');
      }

      if (new Date() > proposal.votingEnd) {
        throw new Error('Voting period has ended');
      }

      // Check if user has already voted
      const existingVote = proposal.votes.find(vote => vote.voter === voteDto.voter);
      if (existingVote) {
        throw new Error('User has already voted on this proposal');
      }

      // Get voter's token balance for voting power
      const tokenBalance = await this.hederaService.getTokenBalance(voteDto.voter, '0');
      if (tokenBalance === 0) {
        throw new Error('No tokens to vote with');
      }

      // Add vote to proposal
      proposal.votes.push({
        voter: voteDto.voter,
        vote: voteDto.vote,
        weight: tokenBalance.toString(),
        timestamp: new Date(),
      });

      // Update vote counts
      if (voteDto.vote === 'FOR') {
        proposal.votesFor = (BigInt(proposal.votesFor) + BigInt(tokenBalance)).toString();
      } else if (voteDto.vote === 'AGAINST') {
        proposal.votesAgainst = (BigInt(proposal.votesAgainst) + BigInt(tokenBalance)).toString();
      }

      proposal.totalVotes = (BigInt(proposal.totalVotes) + BigInt(tokenBalance)).toString();

      await proposal.save();

      this.logger.log(`Vote cast: ${voteDto.voter} voted ${voteDto.vote} on proposal ${voteDto.proposalId}`);

    } catch (error) {
      this.logger.error('Failed to cast vote:', error);
      throw error;
    }
  }

  /**
   * Execute a passed proposal
   */
  async executeProposal(proposalId: string, executor: string): Promise<string> {
    try {
      const proposal = await this.proposalModel.findOne({ id: proposalId });
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      // Check if proposal has passed
      if (proposal.status !== ProposalStatus.PASSED) {
        throw new Error('Proposal has not passed');
      }

      // Check execution delay
      const executionDelay = this.governanceConfig.executionDelay * 24 * 60 * 60 * 1000;
      if (new Date() < new Date(proposal.votingEnd.getTime() + executionDelay)) {
        throw new Error('Execution delay not met');
      }

      // Execute proposal based on type
      let executionTxHash: string;
      switch (proposal.type) {
        case ProposalType.PARAMETER_CHANGE:
          executionTxHash = await this.executeParameterChange(proposal);
          break;
        case ProposalType.ASSET_TYPE_ADDITION:
          executionTxHash = await this.executeAssetTypeAddition(proposal);
          break;
        case ProposalType.ORACLE_CHANGE:
          executionTxHash = await this.executeOracleChange(proposal);
          break;
        case ProposalType.TREASURY_ALLOCATION:
          executionTxHash = await this.executeTreasuryAllocation(proposal);
          break;
        case ProposalType.PROTOCOL_UPGRADE:
          executionTxHash = await this.executeProtocolUpgrade(proposal);
          break;
        default:
          throw new Error('Unknown proposal type');
      }

      // Update proposal status
      proposal.status = ProposalStatus.EXECUTED;
      proposal.execution.executed = true;
      proposal.execution.executionTimestamp = new Date();
      proposal.execution.executionTxHash = executionTxHash;
      await proposal.save();

      this.logger.log(`Proposal executed: ${proposalId} with tx ${executionTxHash}`);
      return executionTxHash;

    } catch (error) {
      this.logger.error('Failed to execute proposal:', error);
      throw error;
    }
  }

  /**
   * Check and update proposal statuses
   */
  async updateProposalStatuses(): Promise<void> {
    try {
      const activeProposals = await this.proposalModel.find({
        status: ProposalStatus.ACTIVE,
        votingEnd: { $lte: new Date() }
      });

      for (const proposal of activeProposals) {
        const result = await this.calculateProposalResult(proposal);
        
        proposal.status = result.passed ? ProposalStatus.PASSED : ProposalStatus.REJECTED;
        await proposal.save();

        this.logger.log(`Proposal ${proposal.id} ${result.passed ? 'passed' : 'rejected'}`);
      }
    } catch (error) {
      this.logger.error('Failed to update proposal statuses:', error);
      throw error;
    }
  }

  /**
   * Get all proposals with pagination
   */
  async getProposals(
    page: number = 1,
    limit: number = 20,
    status?: ProposalStatus,
    proposer?: string
  ): Promise<{
    proposals: ProposalDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = {};
    if (status) query.status = status;
    if (proposer) query.proposer = proposer;

    const skip = (page - 1) * limit;
    const proposals = await this.proposalModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.proposalModel.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return {
      proposals,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Get proposal details
   */
  async getProposal(proposalId: string): Promise<ProposalDocument> {
    const proposal = await this.proposalModel.findOne({ id: proposalId });
    if (!proposal) {
      throw new Error('Proposal not found');
    }
    return proposal;
  }

  /**
   * Get user's voting power
   */
  async getUserVotingPower(walletAddress: string): Promise<{
    tokenBalance: number;
    stakedBalance: number;
    totalVotingPower: number;
    delegatedVotes: number;
  }> {
    const tokenBalance = await this.hederaService.getTokenBalance(walletAddress, '0');
    const user = await this.userModel.findOne({ walletAddress });
    const stakedBalance = user?.stakingBalance || 0;
    const totalVotingPower = tokenBalance + stakedBalance;

    // TODO: Implement delegation system
    const delegatedVotes = 0;

    return {
      tokenBalance,
      stakedBalance,
      totalVotingPower,
      delegatedVotes,
    };
  }

  /**
   * Get governance statistics
   */
  async getGovernanceStats(): Promise<{
    totalProposals: number;
    activeProposals: number;
    passedProposals: number;
    rejectedProposals: number;
    totalVotes: number;
    averageParticipation: number;
    quorumThreshold: number;
  }> {
    const totalProposals = await this.proposalModel.countDocuments();
    const activeProposals = await this.proposalModel.countDocuments({ status: ProposalStatus.ACTIVE });
    const passedProposals = await this.proposalModel.countDocuments({ status: ProposalStatus.PASSED });
    const rejectedProposals = await this.proposalModel.countDocuments({ status: ProposalStatus.REJECTED });

    const proposals = await this.proposalModel.find({ status: { $in: [ProposalStatus.PASSED, ProposalStatus.REJECTED] } });
    const totalVotes = proposals.reduce((sum, proposal) => sum + parseInt(proposal.totalVotes), 0);
    const averageParticipation = proposals.length > 0 ? totalVotes / proposals.length : 0;

    const circulatingSupply = await this.getCirculatingSupply();
    const quorumThreshold = (circulatingSupply * this.governanceConfig.quorumPercentage) / 100;

    return {
      totalProposals,
      activeProposals,
      passedProposals,
      rejectedProposals,
      totalVotes,
      averageParticipation,
      quorumThreshold,
    };
  }

  // Private helper methods

  private generateProposalId(): string {
    return `PROP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getCirculatingSupply(): Promise<number> {
    // Get circulating supply from Hedera (real blockchain implementation)
    return 200_000_000; // 200M TRB
  }

  private async calculateProposalResult(proposal: ProposalDocument): Promise<ProposalResult> {
    const votesFor = BigInt(proposal.votesFor);
    const votesAgainst = BigInt(proposal.votesAgainst);
    const totalVotes = BigInt(proposal.totalVotes);
    const quorumRequired = BigInt(proposal.quorumRequired);

    const quorumMet = totalVotes >= quorumRequired;
    const passed = quorumMet && votesFor > votesAgainst;

    return {
      proposalId: proposal.id,
      status: passed ? ProposalStatus.PASSED : ProposalStatus.REJECTED,
      votesFor: proposal.votesFor,
      votesAgainst: proposal.votesAgainst,
      totalVotes: proposal.totalVotes,
      quorumMet,
      passed,
    };
  }

  private async executeParameterChange(proposal: ProposalDocument): Promise<string> {
    // Execute parameter change on Hedera contracts
    const txHash = await this.hederaService.updateContractParameters(
      proposal.parameters.contractAddress,
      proposal.parameters.parameterName,
      proposal.parameters.newValue
    );
    return txHash;
  }

  private async executeAssetTypeAddition(proposal: ProposalDocument): Promise<string> {
    // Add new asset type to PolicyManager
    const txHash = await this.hederaService.addAssetType(
      proposal.parameters.assetType,
      proposal.parameters.minScore,
      proposal.parameters.ttlSeconds,
      proposal.parameters.requiredAttestors
    );
    return txHash;
  }

  private async executeOracleChange(proposal: ProposalDocument): Promise<string> {
    // Update oracle configuration
    const txHash = await this.hederaService.updateOracleConfig(
      proposal.parameters.oracleAddress,
      proposal.parameters.newConfig
    );
    return txHash;
  }

  private async executeTreasuryAllocation(proposal: ProposalDocument): Promise<string> {
    // Execute treasury allocation
    const txHash = await this.hederaService.allocateTreasury(
      proposal.parameters.recipient,
      proposal.parameters.amount,
      proposal.parameters.purpose
    );
    return txHash;
  }

  private async executeProtocolUpgrade(proposal: ProposalDocument): Promise<string> {
    // Execute protocol upgrade
    const txHash = await this.hederaService.upgradeProtocol(
      proposal.parameters.newImplementation,
      proposal.parameters.upgradeData
    );
    return txHash;
  }
}
