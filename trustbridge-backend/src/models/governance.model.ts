import mongoose, { Schema, Document } from 'mongoose';

export enum ProposalType {
  PARAMETER_CHANGE = 'PARAMETER_CHANGE',
  ASSET_TYPE_ADDITION = 'ASSET_TYPE_ADDITION',
  ORACLE_CHANGE = 'ORACLE_CHANGE',
  TREASURY_ALLOCATION = 'TREASURY_ALLOCATION',
  PROTOCOL_UPGRADE = 'PROTOCOL_UPGRADE'
}

export enum ProposalStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PASSED = 'PASSED',
  REJECTED = 'REJECTED',
  EXECUTED = 'EXECUTED',
  EXPIRED = 'EXPIRED'
}

export interface ProposalDocument extends Document {
  id: string;
  proposer: string;
  type: ProposalType;
  title: string;
  description: string;
  parameters?: any;
  status: ProposalStatus;
  votingStart: Date;
  votingEnd: Date;
  quorumRequired: string; // BigInt as string
  votesFor: string; // BigInt as string
  votesAgainst: string; // BigInt as string
  totalVotes: string; // BigInt as string
  execution: {
    executed: boolean;
    executionTimestamp?: Date;
    executionTxHash?: string;
  };
  votes: Array<{
    voter: string;
    vote: 'FOR' | 'AGAINST' | 'ABSTAIN';
    weight: string; // Voting power
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const VoteSchema = new Schema({
  voter: { type: String, required: true },
  vote: { 
    type: String, 
    enum: ['FOR', 'AGAINST', 'ABSTAIN'],
    required: true 
  },
  weight: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const ExecutionSchema = new Schema({
  executed: { type: Boolean, default: false },
  executionTimestamp: { type: Date },
  executionTxHash: { type: String }
});

const ProposalSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  proposer: { type: String, required: true, index: true },
  type: { 
    type: String, 
    enum: Object.values(ProposalType),
    required: true,
    index: true
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  parameters: { type: Schema.Types.Mixed },
  status: { 
    type: String, 
    enum: Object.values(ProposalStatus),
    default: ProposalStatus.DRAFT,
    index: true
  },
  votingStart: { type: Date, required: true, index: true },
  votingEnd: { type: Date, required: true, index: true },
  quorumRequired: { type: String, required: true },
  votesFor: { type: String, default: '0' },
  votesAgainst: { type: String, default: '0' },
  totalVotes: { type: String, default: '0' },
  execution: ExecutionSchema,
  votes: [VoteSchema]
}, {
  timestamps: true,
  collection: 'proposals'
});

ProposalSchema.index({ status: 1, votingEnd: 1 });
ProposalSchema.index({ proposer: 1, createdAt: -1 });

export const ProposalModel = mongoose.model<ProposalDocument>('Proposal', ProposalSchema);
