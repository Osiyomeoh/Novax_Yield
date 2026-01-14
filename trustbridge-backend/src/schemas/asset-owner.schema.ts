import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AssetOwnerDocument = AssetOwner & Document;

export enum RevenueReportStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  DISTRIBUTED = 'DISTRIBUTED',
}

@Schema({ timestamps: true })
export class RevenueReport {
  @Prop({ required: true })
  reportId: string;

  @Prop({ required: true })
  assetId: string;

  @Prop({ required: true })
  ownerAddress: string;

  @Prop({ required: true })
  periodStart: Date;

  @Prop({ required: true })
  periodEnd: Date;

  @Prop({ required: true })
  grossRevenue: number; // Total revenue before expenses

  @Prop({ required: true })
  expenses: number; // Operating expenses

  @Prop({ required: true })
  netProfit: number; // grossRevenue - expenses

  @Prop({ required: true, enum: RevenueReportStatus, default: RevenueReportStatus.PENDING })
  status: RevenueReportStatus;

  @Prop({ type: [String], default: [] })
  documentHashes: string[]; // IPFS hashes for invoices, bank statements, etc.

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>; // Additional data (currency, breakdown, etc.)

  @Prop()
  verifiedBy?: string; // AMC admin address who verified

  @Prop()
  verifiedAt?: Date;

  @Prop()
  rejectionReason?: string;

  @Prop()
  distributedAt?: Date;

  @Prop()
  distributionTxHash?: string;
}

@Schema({ timestamps: true })
export class OwnershipRecord {
  @Prop({ required: true })
  assetId: string;

  @Prop({ required: true })
  ownerAddress: string; // Original owner

  @Prop({ required: true, default: 100 })
  ownershipPercentage: number; // Percentage owned (e.g., 90 = 90%)

  @Prop({ required: true, default: 0 })
  tokenizedPercentage: number; // Percentage tokenized (e.g., 10 = 10%)

  @Prop({ required: true, default: 0 })
  capitalReceived: number; // Total capital received from tokenization (in TRUST tokens)

  @Prop({ required: true, default: 0 })
  totalRevenueReceived: number; // Total revenue received by owner (in TRUST tokens)

  @Prop({ type: [String], default: [] })
  poolIds: string[]; // Pools this asset is in

  @Prop({ type: Object, default: {} })
  revenueShareHistory: Record<string, number>; // Monthly revenue received

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

@Schema({ timestamps: true })
export class AssetOwner {
  @Prop({ required: true, unique: true })
  ownerAddress: string; // Wallet address

  @Prop({ required: true })
  email?: string;

  @Prop()
  name?: string;

  @Prop({ type: [String], default: [] })
  assetIds: string[]; // Assets owned by this address

  @Prop({ type: [Object], default: [] })
  ownershipRecords: OwnershipRecord[]; // Detailed ownership per asset

  @Prop({ required: true, default: 0 })
  totalCapitalReceived: number; // Total capital from all tokenizations

  @Prop({ required: true, default: 0 })
  totalRevenueReceived: number; // Total revenue received across all assets

  @Prop({ type: [Object], default: [] })
  revenueReports: RevenueReport[]; // All revenue reports submitted

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const RevenueReportSchema = SchemaFactory.createForClass(RevenueReport);
export const OwnershipRecordSchema = SchemaFactory.createForClass(OwnershipRecord);
export const AssetOwnerSchema = SchemaFactory.createForClass(AssetOwner);

