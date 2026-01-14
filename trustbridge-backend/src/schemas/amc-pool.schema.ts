import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AMCPoolDocument = AMCPool & Document;

export enum PoolStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  MATURED = 'MATURED',
  SUSPENDED = 'SUSPENDED'
}

export enum PoolType {
  REAL_ESTATE = 'REAL_ESTATE',
  AGRICULTURAL = 'AGRICULTURAL',
  COMMODITIES = 'COMMODITIES',
  MIXED = 'MIXED'
}

@Schema({ timestamps: true })
export class PoolAsset {
  @Prop({ required: true })
  assetId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  value: number;

  @Prop({ required: true })
  percentage: number; // Percentage of pool this asset represents

  @Prop({ default: true })
  isActive: boolean;
}

@Schema({ timestamps: true })
export class PoolInvestment {
  @Prop({ required: true })
  investorId: string;

  @Prop({ required: true })
  investorAddress: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  tokens: number;

  @Prop({ required: true })
  tokenPrice: number;

  @Prop({ default: Date.now })
  investedAt: Date;

  @Prop({ default: 0 })
  dividendsReceived: number;

  @Prop({ default: true })
  isActive: boolean;
}

@Schema({ timestamps: true })
export class DividendDistribution {
  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  perToken: number;

  @Prop({ required: true })
  distributedAt: Date;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  transactionHash: string;
}

@Schema({ timestamps: true })
export class AMCPool {
  @Prop({ required: true, unique: true })
  poolId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  createdBy: string; // AMC Admin wallet address

  @Prop({ required: true })
  createdByName: string; // AMC Admin name

  @Prop({ type: String, enum: Object.values(PoolType), required: true })
  type: PoolType;

  @Prop({ type: String, enum: Object.values(PoolStatus), default: PoolStatus.DRAFT })
  status: PoolStatus;

  @Prop({ type: [PoolAsset], default: [] })
  assets: PoolAsset[];

  @Prop({ required: true })
  totalValue: number;

  @Prop({ required: true })
  tokenSupply: number;

  @Prop({ required: true })
  tokenPrice: number;

  @Prop({ required: true })
  minimumInvestment: number;

  @Prop({ required: true })
  expectedAPY: number;

  @Prop({ required: true })
  maturityDate: Date;

  @Prop({ default: 0 })
  totalInvested: number;

  @Prop({ default: 0 })
  totalInvestors: number;

  @Prop({ type: [PoolInvestment], default: [] })
  investments: PoolInvestment[];

  @Prop({ type: [DividendDistribution], default: [] })
  dividends: DividendDistribution[];

  @Prop({ default: 0 })
  totalDividendsDistributed: number;

  @Prop({ default: '' })
  hederaTokenId: string; // Hedera Token Service token ID for pool tokens

  @Prop({ default: '' })
  hederaContractId: string; // Hedera contract for pool management

  @Prop({ default: '' })
  imageURI: string;

  @Prop({ default: '' })
  documentURI: string;

  @Prop({ default: [] })
  riskFactors: string[];

  @Prop({ default: [] })
  terms: string[];

  @Prop({ default: true })
  isTradeable: boolean; // Can pool tokens be traded on secondary market

  @Prop({ default: 0 })
  tradingVolume: number;

  @Prop({ default: 0 })
  currentPrice: number; // Current market price (may differ from tokenPrice)

  @Prop({ default: 0 })
  priceChange24h: number; // Price change in last 24 hours

  @Prop({ default: [] })
  operations: string[]; // Pool operations and updates

  @Prop({ 
    type: {
      riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
      liquidity: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
      diversification: { type: Number, default: 0 },
      geographicDistribution: { type: [String], default: [] },
      sectorDistribution: { type: Map, of: Number, default: {} }
    },
    default: {}
  })
  metadata: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    liquidity: 'HIGH' | 'MEDIUM' | 'LOW';
    diversification: number; // Number of different assets
    geographicDistribution: string[]; // Countries/regions
    sectorDistribution: { [key: string]: number }; // Asset type percentages
  };

  @Prop({ default: Date.now })
  launchedAt: Date;

  @Prop({ default: null })
  closedAt: Date;

  @Prop({ default: null })
  maturedAt: Date;
}

export const AMCPoolSchema = SchemaFactory.createForClass(AMCPool);

// Indexes for efficient queries
AMCPoolSchema.index({ poolId: 1 });
AMCPoolSchema.index({ status: 1 });
AMCPoolSchema.index({ type: 1 });
AMCPoolSchema.index({ createdBy: 1 });
AMCPoolSchema.index({ totalValue: 1, expectedAPY: -1 });
AMCPoolSchema.index({ maturityDate: 1 });
AMCPoolSchema.index({ 'assets.assetId': 1 });
AMCPoolSchema.index({ 'investments.investorId': 1 });
AMCPoolSchema.index({ isTradeable: 1, status: 1 });
