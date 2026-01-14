import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettlementDocument = Settlement & Document;

export enum SettlementStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  SETTLED = 'SETTLED',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class Settlement {
  @Prop({ required: true })
  assetId: string;

  @Prop({ required: true })
  buyer: string;

  @Prop({ required: true })
  seller: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: SettlementStatus, default: SettlementStatus.PENDING })
  status: SettlementStatus;

  @Prop({ required: true })
  deliveryDeadline: Date;

  @Prop()
  trackingHash?: string;

  @Prop({ type: Object })
  deliveryConfirmation?: {
    confirmedBy: string;
    confirmedAt: Date;
    evidence: string;
  };

  @Prop()
  disputeReason?: string;

  @Prop()
  resolvedAt?: Date;
}

export const SettlementSchema = SchemaFactory.createForClass(Settlement);
