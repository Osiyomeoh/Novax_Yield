import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OfferDocument = Offer & Document;

@Schema({ timestamps: true })
export class Offer {
  @Prop({ required: true })
  listingId: string;

  @Prop({ required: true })
  nftContract: string; // Hedera token ID

  @Prop({ required: true })
  tokenId: string; // Serial number

  @Prop({ required: true })
  buyer: string; // Buyer's Hedera account ID

  @Prop({ required: true })
  seller: string; // Seller's Hedera account ID

  @Prop({ required: true })
  offerAmount: number; // Offer price in TRUST

  @Prop({ default: 'active' })
  status: string; // active, accepted, rejected, cancelled, expired

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  transactionId?: string; // Hedera transaction ID

  @Prop()
  acceptedAt?: Date;

  @Prop()
  rejectedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const OfferSchema = SchemaFactory.createForClass(Offer);

// Indexes for efficient queries
OfferSchema.index({ listingId: 1, status: 1 });
OfferSchema.index({ buyer: 1, status: 1 });
OfferSchema.index({ seller: 1, status: 1 });
OfferSchema.index({ nftContract: 1, tokenId: 1 });
OfferSchema.index({ expiresAt: 1 });

