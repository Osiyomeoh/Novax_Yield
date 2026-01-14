import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CollectionDocument = Collection & Document;

@Schema({ timestamps: true })
export class Collection {
  @Prop({ required: true, unique: true })
  collectionId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  symbol?: string;

  @Prop({ required: true })
  creator: string; // Hedera account ID

  @Prop()
  bannerImage?: string; // IPFS URL

  @Prop()
  profileImage?: string; // IPFS URL

  @Prop({ default: false })
  verified: boolean;

  @Prop({ type: [String], default: [] })
  nftTokenIds: string[]; // Array of Hedera token IDs in this collection

  @Prop({ default: 0 })
  totalVolume: number; // Total TRUST traded

  @Prop({ default: 0 })
  floorPrice: number; // Lowest listed price in TRUST

  @Prop({ default: 0 })
  itemCount: number; // Total NFTs in collection

  @Prop({ default: 0 })
  ownerCount: number; // Unique owners

  @Prop({ default: 0 })
  listedCount: number; // Currently listed for sale

  @Prop({ 
    type: {
      sales24h: { type: Number, default: 0 },
      volume24h: { type: Number, default: 0 },
      sales7d: { type: Number, default: 0 },
      volume7d: { type: Number, default: 0 },
      sales30d: { type: Number, default: 0 },
      volume30d: { type: Number, default: 0 },
      avgPrice: { type: Number, default: 0 },
      highestSale: { type: Number, default: 0 }
    },
    default: {}
  })
  stats: {
    sales24h?: number;
    volume24h?: number;
    sales7d?: number;
    volume7d?: number;
    sales30d?: number;
    volume30d?: number;
    avgPrice?: number;
    highestSale?: number;
  };

  @Prop({ 
    type: {
      percentage: { type: Number, default: 0 },
      receiver: { type: String, default: '' }
    },
    default: {}
  })
  royalty: {
    percentage: number; // e.g., 5 for 5%
    receiver: string; // Hedera account ID
  };

  @Prop({ type: [String], default: [] })
  category: string[]; // Art, Music, Photography, etc.

  @Prop({ 
    type: {
      twitter: { type: String, default: '' },
      discord: { type: String, default: '' },
      website: { type: String, default: '' },
      instagram: { type: String, default: '' }
    },
    default: {}
  })
  socialLinks: {
    twitter?: string;
    discord?: string;
    website?: string;
    instagram?: string;
  };

  @Prop({ type: Object, default: {} })
  metadata: any; // Additional metadata

  createdAt: Date;
  updatedAt: Date;
}

export const CollectionSchema = SchemaFactory.createForClass(Collection);

// Indexes for efficient queries
CollectionSchema.index({ creator: 1 });
CollectionSchema.index({ verified: 1, totalVolume: -1 });
CollectionSchema.index({ floorPrice: 1 });
CollectionSchema.index({ name: 'text', description: 'text' });

