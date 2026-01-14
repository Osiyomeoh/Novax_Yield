import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  HBAR = 'HBAR',
  TRUST = 'TRUST', // TRUST tokens (replaces HBAR for Mantle)
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  BANK_TRANSFER = 'BANK_TRANSFER',
  MOBILE_MONEY = 'MOBILE_MONEY',
}

export enum PaymentType {
  TOKENIZATION_FEE = 'TOKENIZATION_FEE',
  VERIFICATION_FEE = 'VERIFICATION_FEE',
  INVESTMENT = 'INVESTMENT',
  ESCROW = 'ESCROW',
  SETTLEMENT = 'SETTLEMENT',
  REFUND = 'REFUND',
  PLATFORM_FEE = 'PLATFORM_FEE',
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true })
  paymentId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  assetId?: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true, enum: PaymentMethod })
  method: PaymentMethod;

  @Prop({ required: true, enum: PaymentType })
  type: PaymentType;

  @Prop({ required: true, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop()
  description?: string;

  @Prop()
  externalTransactionId?: string;

  @Prop()
  blockchainTxId?: string;

  @Prop()
  feeAmount?: number;

  @Prop()
  netAmount?: number;

  @Prop({ type: Object })
  metadata?: {
    stripePaymentIntentId?: string;
    paypalOrderId?: string;
    bankReference?: string;
    mobileMoneyReference?: string;
    hbarAccountId?: string;
    hbarTokenId?: string;
  };

  @Prop()
  failureReason?: string;

  @Prop()
  refundAmount?: number;

  @Prop()
  refundReason?: string;

  @Prop()
  refundedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  expiresAt?: Date;
}

export type PaymentDocument = Payment & Document;
export const PaymentSchema = SchemaFactory.createForClass(Payment);
