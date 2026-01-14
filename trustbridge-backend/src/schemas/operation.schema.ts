import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OperationDocument = Operation & Document;

export enum OperationType {
  INVESTMENT = 'INVESTMENT',
  WITHDRAWAL = 'WITHDRAWAL',
  VERIFICATION = 'VERIFICATION',
  SETTLEMENT = 'SETTLEMENT',
  STAKE = 'STAKE',
  UNSTAKE = 'UNSTAKE',
}

export enum OperationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class Operation {
  @Prop({ required: true })
  assetId: string;

  @Prop({ required: true })
  userAddress: string;

  @Prop({ required: true, enum: OperationType })
  type: OperationType;

  @Prop({ required: true, enum: OperationStatus, default: OperationStatus.PENDING })
  status: OperationStatus;

  @Prop()
  amount?: number;

  @Prop()
  tokens?: number;

  @Prop()
  transactionHash?: string;

  @Prop()
  blockchainTxId?: string;

  @Prop()
  userId?: string;

  @Prop({ type: Object })
  data?: any;

  @Prop({ type: Object })
  metadata?: any;

  @Prop()
  completedAt?: Date;
}

export const OperationSchema = SchemaFactory.createForClass(Operation);
