import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AssetDocument = Asset & Document;

export enum AssetType {
  AGRICULTURAL = 'AGRICULTURAL',
  REAL_ESTATE = 'REAL_ESTATE',
  EQUIPMENT = 'EQUIPMENT',
  INVENTORY = 'INVENTORY',
  COMMODITY = 'COMMODITY',
}

export enum AssetStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  ACTIVE = 'ACTIVE',
  OPERATIONAL = 'OPERATIONAL',
  MATURED = 'MATURED',
  SETTLED = 'SETTLED',
}

@Schema({ timestamps: true })
export class Location {
  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  region: string;

  @Prop({ type: Object })
  coordinates?: {
    lat: number;
    lng: number;
  };
}

@Schema({ timestamps: true })
export class Investment {
  @Prop({ required: true })
  investor: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  tokens: number;

  @Prop({ required: true })
  pricePerToken: number;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ default: 'CONFIRMED' })
  status: string;

  @Prop()
  transactionHash?: string;
}

@Schema({ timestamps: true })
export class Asset {
  @Prop({ required: true, unique: true })
  assetId: string;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true, enum: AssetType })
  type: AssetType;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: Location, required: true })
  location: Location;

  @Prop({ required: true })
  totalValue: number;

  @Prop({ required: true })
  tokenSupply: number;

  @Prop({ default: 0 })
  tokenizedAmount: number;

  @Prop({ required: true })
  maturityDate: Date;

  @Prop({ required: true })
  expectedAPY: number;

  @Prop({ default: 0 })
  verificationScore: number;

  @Prop({ default: 0 })
  earnings: number; // Total earnings/ROI received

  @Prop({ required: true, enum: AssetStatus, default: AssetStatus.PENDING })
  status: AssetStatus;

  @Prop()
  tokenContract?: string;

  @Prop()
  transactionHash?: string;

  @Prop({ type: Object })
  verificationData?: any;

  @Prop({ type: [Investment], default: [] })
  investments: Investment[];

  @Prop({ type: [String], default: [] })
  operations: string[];
}

export const AssetSchema = SchemaFactory.createForClass(Asset);
