import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PoolDocument = Pool & Document;

export enum PoolStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  MATURED = 'matured'
}

export enum PoolRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum TrancheType {
  SENIOR = 'senior', // DROP tokens - safer, lower returns
  JUNIOR = 'junior'  // TIN tokens - riskier, higher returns
}

@Schema({ timestamps: true })
export class Pool {
  @Prop({ required: true, unique: true })
  poolId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  manager: string; // Wallet address of pool manager

  @Prop({ required: true })
  managerName: string;

  @Prop({ required: true })
  managerEmail: string;

  @Prop({ required: true })
  strategy: string; // Investment strategy description

  @Prop({ required: true, type: [String] })
  assetIds: string[]; // Array of asset IDs in the pool

  @Prop({ required: true })
  totalValue: number; // Total value of all assets in pool

  @Prop({ required: true })
  dropTokens: number; // Senior tranche token supply

  @Prop({ required: true })
  tinTokens: number; // Junior tranche token supply

  @Prop({ required: true })
  dropTokenPrice: number; // Price per DROP token

  @Prop({ required: true })
  tinTokenPrice: number; // Price per TIN token

  @Prop({ required: true })
  targetAPY: number; // Target annual percentage yield

  @Prop({ required: true })
  actualAPY: number; // Current actual APY

  @Prop({ required: true, enum: PoolRiskLevel })
  riskLevel: PoolRiskLevel;

  @Prop({ required: true, enum: PoolStatus, default: PoolStatus.DRAFT })
  status: PoolStatus;

  @Prop({ required: true })
  minimumInvestment: number; // Minimum investment amount

  @Prop({ required: true })
  maximumInvestment: number; // Maximum investment per investor

  @Prop({ required: true })
  lockupPeriod: number; // Lockup period in days

  @Prop({ required: true })
  maturityDate: Date; // Pool maturity date

  @Prop({ required: true })
  totalInvestors: number; // Total number of investors

  @Prop({ required: true })
  totalInvested: number; // Total amount invested

  @Prop({ required: true })
  dropTokenContract: string; // DROP token contract address

  @Prop({ required: true })
  tinTokenContract: string; // TIN token contract address

  @Prop({ required: true })
  poolContract: string; // Pool management contract address

  @Prop({ 
    type: {
      totalReturn: { type: Number, default: 0 },
      monthlyReturn: { type: Number, default: 0 },
      volatility: { type: Number, default: 0 },
      sharpeRatio: { type: Number, default: 0 },
      maxDrawdown: { type: Number, default: 0 }
    },
    default: {}
  })
  performanceMetrics: {
    totalReturn: number;
    monthlyReturn: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };

  @Prop({ 
    type: {
      managementFee: { type: Number, default: 0 },
      performanceFee: { type: Number, default: 0 },
      entryFee: { type: Number, default: 0 },
      exitFee: { type: Number, default: 0 }
    },
    default: {}
  })
  feeStructure: {
    managementFee: number; // Annual management fee percentage
    performanceFee: number; // Performance fee percentage
    entryFee: number; // Entry fee percentage
    exitFee: number; // Exit fee percentage
  };

  @Prop({ type: [Object] })
  investors: Array<{
    address: string;
    amount: number;
    dropTokens: number;
    tinTokens: number;
    entryDate: Date;
    lastUpdate: Date;
  }>;

  @Prop({ type: [Object] })
  distributions: Array<{
    date: Date;
    amount: number;
    dropAmount: number;
    tinAmount: number;
    type: 'dividend' | 'capital_gain' | 'interest';
  }>;

  @Prop({ 
    type: {
      jurisdiction: { type: String, default: '' },
      regulatoryStatus: { type: String, default: '' },
      kycRequired: { type: Boolean, default: false },
      accreditationRequired: { type: Boolean, default: false },
      minimumInvestment: { type: Number, default: 0 }
    },
    default: {}
  })
  compliance: {
    jurisdiction: string;
    regulatoryStatus: string;
    kycRequired: boolean;
    accreditationRequired: boolean;
    minimumInvestment: number;
  };

  @Prop({ type: [String] })
  tags: string[]; // Tags for categorization

  @Prop({ 
    type: {
      website: { type: String, default: '' },
      whitepaper: { type: String, default: '' },
      socialMedia: {
        type: {
          twitter: { type: String, default: '' },
          linkedin: { type: String, default: '' },
          telegram: { type: String, default: '' }
        },
        default: {}
      },
      documents: { type: [Object], default: [] }
    },
    default: {}
  })
  metadata: {
    website: string;
    whitepaper: string;
    socialMedia: {
      twitter: string;
      linkedin: string;
      telegram: string;
    };
    documents: Array<{
      name: string;
      url: string;
      type: string;
    }>;
  };

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const PoolSchema = SchemaFactory.createForClass(Pool);
