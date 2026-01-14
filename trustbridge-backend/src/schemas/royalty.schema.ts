import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoyaltyDocument = RoyaltyPayment & Document;

@Schema({ timestamps: true })
export class RoyaltyPayment {
  @Prop({ required: true })
  transactionId: string; // Hedera transaction ID

  @Prop({ required: true })
  nftContract: string; // Hedera token ID

  @Prop({ required: true })
  tokenId: string; // Serial number

  @Prop({ required: true })
  salePrice: number; // Sale price in TRUST

  @Prop({ required: true })
  royaltyAmount: number; // Royalty amount in TRUST

  @Prop({ required: true })
  royaltyPercentage: number; // Percentage (e.g., 5 for 5%)

  @Prop({ required: true })
  creator: string; // Creator's Hedera account ID

  @Prop({ required: true })
  seller: string; // Seller's Hedera account ID

  @Prop({ required: true })
  buyer: string; // Buyer's Hedera account ID

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ default: 'paid' })
  status: string; // paid, pending, failed

  createdAt: Date;
  updatedAt: Date;
}

export const RoyaltyPaymentSchema = SchemaFactory.createForClass(RoyaltyPayment);

// Indexes for efficient queries
RoyaltyPaymentSchema.index({ creator: 1, timestamp: -1 });
RoyaltyPaymentSchema.index({ nftContract: 1, tokenId: 1 });
RoyaltyPaymentSchema.index({ transactionId: 1 }, { unique: true });

@Schema({ timestamps: true })
export class CreatorRoyaltyStats {
  @Prop({ required: true, unique: true })
  creator: string; // Hedera account ID

  @Prop({ default: 0 })
  totalEarned: number; // Total royalties earned in TRUST

  @Prop({ default: 0 })
  salesCount: number; // Number of sales generating royalties

  @Prop({ default: 0 })
  averageRoyalty: number; // Average royalty per sale

  @Prop({ 
    type: Map,
    of: Number,
    default: {}
  })
  monthlyEarnings: {
    [key: string]: number; // Format: "YYYY-MM" => amount
  };

  @Prop({ type: [String], default: [] })
  nftContracts: string[]; // List of NFT contracts this creator has

  createdAt: Date;
  updatedAt: Date;
}

export const CreatorRoyaltyStatsSchema = SchemaFactory.createForClass(CreatorRoyaltyStats);

// Indexes
CreatorRoyaltyStatsSchema.index({ creator: 1 }, { unique: true });
CreatorRoyaltyStatsSchema.index({ totalEarned: -1 });

