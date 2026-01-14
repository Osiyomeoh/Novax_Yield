import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PoolTokenHoldingsDocument = PoolTokenHoldings & Document;

export enum TokenTransferType {
  INVESTMENT = 'INVESTMENT',
  DIVIDEND = 'DIVIDEND',
  TRADE = 'TRADE',
  BURN = 'BURN',
  MINT = 'MINT',
  TRANSFER = 'TRANSFER',
  REWARD = 'REWARD'
}

@Schema({ timestamps: true })
export class TokenTransfer {
  @Prop({ required: true })
  transferId: string;

  @Prop({ type: String, enum: Object.values(TokenTransferType), required: true })
  type: TokenTransferType;

  @Prop({ required: true })
  fromAddress: string;

  @Prop({ required: true })
  toAddress: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  pricePerToken: number;

  @Prop({ required: true })
  totalValue: number;

  @Prop({ default: '' })
  transactionHash: string;

  @Prop({ default: '' })
  hederaTransactionId: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: null })
  transferDate: Date;

  @Prop({ default: 0 })
  fees: number;

  @Prop({ default: '' })
  referenceId: string; // Reference to order, trade, or other transaction
}

@Schema({ timestamps: true })
export class DividendRecord {
  @Prop({ required: true })
  dividendId: string;

  @Prop({ required: true })
  poolId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  perToken: number;

  @Prop({ required: true })
  distributedAt: Date;

  @Prop({ default: '' })
  transactionHash: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: false })
  isClaimed: boolean;

  @Prop({ default: null })
  claimedAt: Date;
}

@Schema({ timestamps: true })
export class PoolTokenHoldings {
  @Prop({ required: true })
  holderAddress: string;

  @Prop({ required: true })
  poolId: string;

  @Prop({ required: true })
  poolTokenId: string; // Hedera token ID

  @Prop({ required: true })
  poolName: string;

  @Prop({ required: true, default: 0 })
  totalTokens: number;

  @Prop({ required: true, default: 0 })
  availableTokens: number;

  @Prop({ required: true, default: 0 })
  lockedTokens: number;

  @Prop({ required: true, default: 0 })
  totalInvested: number;

  @Prop({ required: true, default: 0 })
  totalDividendsReceived: number;

  @Prop({ required: true, default: 0 })
  totalDividendsClaimed: number;

  @Prop({ required: true, default: 0 })
  totalDividendsUnclaimed: number;

  @Prop({ required: true, default: 0 })
  averageBuyPrice: number;

  @Prop({ required: true, default: 0 })
  currentValue: number;

  @Prop({ required: true, default: 0 })
  unrealizedPnL: number;

  @Prop({ required: true, default: 0 })
  realizedPnL: number;

  @Prop({ required: true, default: 0 })
  totalPnL: number;

  @Prop({ required: true, default: 0 })
  roi: number; // Return on Investment percentage

  @Prop({ type: [TokenTransfer], default: [] })
  transfers: TokenTransfer[];

  @Prop({ type: [DividendRecord], default: [] })
  dividends: DividendRecord[];

  @Prop({ default: Date.now })
  firstInvestmentDate: Date;

  @Prop({ default: null })
  lastActivityDate: Date;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ 
    type: {
      riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
      poolType: { type: String, default: '' },
      expectedAPY: { type: Number, default: 0 },
      maturityDate: { type: Date, default: null },
      isTradeable: { type: Boolean, default: false },
      lastPriceUpdate: { type: Date, default: null },
      priceChange24h: { type: Number, default: 0 }
    },
    default: {}
  })
  metadata: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    poolType: string;
    expectedAPY: number;
    maturityDate: Date;
    isTradeable: boolean;
    lastPriceUpdate: Date;
    priceChange24h: number;
  };

  @Prop({ default: [] })
  stakingRecords: {
    stakingId: string;
    amount: number;
    stakedAt: Date;
    unstakedAt?: Date;
    rewards: number;
    status: 'ACTIVE' | 'UNSTAKED' | 'REWARDS_CLAIMED';
  }[];
}

export const PoolTokenHoldingsSchema = SchemaFactory.createForClass(PoolTokenHoldings);

// Indexes for efficient queries
PoolTokenHoldingsSchema.index({ holderAddress: 1 });
PoolTokenHoldingsSchema.index({ poolId: 1 });
PoolTokenHoldingsSchema.index({ poolTokenId: 1 });
PoolTokenHoldingsSchema.index({ holderAddress: 1, poolId: 1 });
PoolTokenHoldingsSchema.index({ holderAddress: 1, isActive: 1 });
PoolTokenHoldingsSchema.index({ totalTokens: 1 });
PoolTokenHoldingsSchema.index({ lastActivityDate: 1 });
PoolTokenHoldingsSchema.index({ 'transfers.transferId': 1 });
PoolTokenHoldingsSchema.index({ 'dividends.dividendId': 1 });
