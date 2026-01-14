import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DividendDistributionDocument = DividendDistribution & Document;

export enum DividendStatus {
  PENDING = 'PENDING',
  DISTRIBUTING = 'DISTRIBUTING',
  DISTRIBUTED = 'DISTRIBUTED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum DividendType {
  REGULAR = 'REGULAR',
  SPECIAL = 'SPECIAL',
  BONUS = 'BONUS',
  FINAL = 'FINAL',
  INTERIM = 'INTERIM'
}

@Schema({ timestamps: true })
export class DividendRecipient {
  @Prop({ required: true })
  holderAddress: string;

  @Prop({ required: true })
  tokenAmount: number;

  @Prop({ required: true })
  dividendAmount: number;

  @Prop({ required: true })
  perTokenRate: number;

  @Prop({ default: false })
  isClaimed: boolean;

  @Prop({ default: null })
  claimedAt: Date;

  @Prop({ default: '' })
  claimTransactionHash: string;

  @Prop({ default: '' })
  hederaTransactionId: string;
}

@Schema({ timestamps: true })
export class DividendDistribution {
  @Prop({ required: true, unique: true })
  distributionId: string;

  @Prop({ required: true })
  poolId: string;

  @Prop({ required: true })
  poolName: string;

  @Prop({ required: true })
  createdBy: string; // AMC Admin address

  @Prop({ type: String, enum: Object.values(DividendType), required: true })
  dividendType: DividendType;

  @Prop({ type: String, enum: Object.values(DividendStatus), default: DividendStatus.PENDING })
  status: DividendStatus;

  @Prop({ required: true })
  totalDividendAmount: number;

  @Prop({ required: true })
  perTokenRate: number;

  @Prop({ required: true })
  totalTokensEligible: number;

  @Prop({ required: true })
  totalRecipients: number;

  @Prop({ required: true })
  distributionDate: Date;

  @Prop({ required: true })
  recordDate: Date; // Date when token holders were recorded

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  sourceOfFunds: string; // Description of where the dividend comes from

  @Prop({ default: '' })
  transactionHash: string;

  @Prop({ default: '' })
  hederaTransactionId: string;

  @Prop({ type: [DividendRecipient], default: [] })
  recipients: DividendRecipient[];

  @Prop({ default: 0 })
  totalClaimed: number;

  @Prop({ default: 0 })
  totalUnclaimed: number;

  @Prop({ default: 0 })
  claimCount: number;

  @Prop({ default: null })
  distributedAt: Date;

  @Prop({ default: null })
  completedAt: Date;

  @Prop({ default: null })
  cancelledAt: Date;

  @Prop({ default: '' })
  failureReason: string;

  @Prop({ default: 0 })
  distributionFees: number;

  @Prop({ default: 0 })
  gasFees: number;

  @Prop({ 
    type: {
      previousDividendId: { type: String, default: '' },
      dividendYield: { type: Number, default: 0 },
      payoutRatio: { type: Number, default: 0 },
      frequency: { type: String, enum: ['MONTHLY', 'QUARTERLY', 'ANNUALLY', 'SPECIAL'], default: 'SPECIAL' },
      taxWithholding: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
      exchangeRate: { type: Number, default: 1 }
    },
    default: {}
  })
  metadata: {
    previousDividendId: string;
    dividendYield: number; // Annual dividend yield
    payoutRatio: number; // Percentage of profits paid as dividends
    frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'SPECIAL';
    taxWithholding: number; // Tax withholding percentage
    currency: string;
    exchangeRate: number; // If different from base currency
  };

  @Prop({ default: [] })
  auditTrail: {
    action: string;
    timestamp: Date;
    performedBy: string;
    details: string;
  }[];
}

export const DividendDistributionSchema = SchemaFactory.createForClass(DividendDistribution);

// Indexes for efficient queries
DividendDistributionSchema.index({ distributionId: 1 });
DividendDistributionSchema.index({ poolId: 1 });
DividendDistributionSchema.index({ createdBy: 1 });
DividendDistributionSchema.index({ status: 1 });
DividendDistributionSchema.index({ distributionDate: 1 });
DividendDistributionSchema.index({ recordDate: 1 });
DividendDistributionSchema.index({ dividendType: 1 });
DividendDistributionSchema.index({ 'recipients.holderAddress': 1 });
DividendDistributionSchema.index({ poolId: 1, status: 1 });
DividendDistributionSchema.index({ distributionDate: 1, status: 1 });
