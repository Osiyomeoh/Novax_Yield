import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AssetV2Document = AssetV2 & Document;

export enum AssetTypeV2 {
  DIGITAL = 'DIGITAL',
  RWA = 'RWA',
}

export enum AssetStatusV2 {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  ACTIVE = 'ACTIVE',
  DIGITAL_ACTIVE = 'DIGITAL_ACTIVE',
  VERIFIED_PENDING_AMC = 'VERIFIED_PENDING_AMC',
  AMC_MANAGED = 'AMC_MANAGED',
  MATURED = 'MATURED',
  SETTLED = 'SETTLED',
}

export enum VerificationLevel {
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  EXPERT = 'EXPERT',
  MASTER = 'MASTER',
}

@Schema({ timestamps: true })
export class AssetV2 {
  @Prop({ required: true, unique: true })
  assetId: string;

  @Prop({ required: true, enum: AssetTypeV2 })
  type: AssetTypeV2;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  assetType: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  location: string;

  @Prop({ required: true })
  totalValue: number;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true, enum: AssetStatusV2, default: AssetStatusV2.PENDING })
  status: AssetStatusV2;

  @Prop({ default: 0 })
  tokenizedAmount: number;

  @Prop({ default: 100, min: 0, max: 100 })
  maxInvestablePercentage: number; // Maximum percentage of asset that can be tokenized (0-100)

  @Prop({ default: 0 })
  verificationScore: number;

  @Prop({ enum: VerificationLevel, default: VerificationLevel.BASIC })
  verificationLevel: VerificationLevel;

  @Prop({ default: '' })
  imageURI: string;

  @Prop({ default: '' })
  documentURI: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: false })
  isTradeable: boolean;

  @Prop({ type: [String], default: [] })
  operations: string[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: null })
  verifiedAt: Date;

  @Prop({ default: null })
  tokenizedAt: Date;

  // RWA specific fields
  @Prop({ default: null })
  maturityDate: Date;

  @Prop({ type: [String], default: [] })
  evidenceHashes: string[];

  @Prop({ type: [String], default: [] })
  documentTypes: string[];

  // Digital specific fields
  @Prop({ default: false })
  isListed: boolean;

  @Prop({ default: 0 })
  listingPrice: number;

  @Prop({ default: null })
  listingExpiry: Date;

  // Trading fields
  @Prop({ default: 0 })
  tradingVolume: number;

  @Prop({ default: 0 })
  lastSalePrice: number;

  // AMC fields
  @Prop({ default: null })
  currentAMC: string;

  @Prop({ default: null })
  amcTransferredAt: Date;

  // Token fields
  @Prop({ default: null })
  tokenId: string;

  @Prop({ default: false })
  isTokenized: boolean;

  @Prop({ default: null })
  tokenizationDate: Date;

  // Additional metadata
  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const AssetV2Schema = SchemaFactory.createForClass(AssetV2);
