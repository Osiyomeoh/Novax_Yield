import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';

export type InvestmentDocument = Investment & Document;

@Schema({ timestamps: true, collection: 'investments' })
export class Investment {
  @Prop({ required: true, unique: true, index: true })
  investmentId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  assetId: string;

  @Prop({ required: true, index: true })
  amount: number; // Initial investment amount

  @Prop({ required: true })
  tokens: number; // Number of tokens purchased

  @Prop({
    type: String,
    enum: ['ACTIVE', 'MATURED', 'CANCELLED'],
    default: 'ACTIVE',
    index: true
  })
  status: 'ACTIVE' | 'MATURED' | 'CANCELLED';

  @Prop({ index: true })
  transactionHash?: string; // Blockchain transaction hash
}

// Export the model name for dependency injection
export const InvestmentModelName = 'Investment';

export const InvestmentSchema = SchemaFactory.createForClass(Investment);

// Add indexes for efficient queries
InvestmentSchema.index({ userId: 1, status: 1 });
InvestmentSchema.index({ assetId: 1, status: 1 });
InvestmentSchema.index({ amount: 1 });

export const InvestmentModel = mongoose.model<Investment>(InvestmentModelName, InvestmentSchema);
