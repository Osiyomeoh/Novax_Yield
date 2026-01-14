import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TradingOrderDocument = TradingOrder & Document;

export enum OrderType {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export enum OrderSide {
  BID = 'BID', // Buy order
  ASK = 'ASK'  // Sell order
}

@Schema({ timestamps: true })
export class TradingOrder {
  @Prop({ required: true, unique: true })
  orderId: string;

  @Prop({ required: true })
  poolId: string;

  @Prop({ required: true })
  poolTokenId: string; // Hedera token ID

  @Prop({ required: true })
  traderAddress: string;

  @Prop({ type: String, enum: Object.values(OrderType), required: true })
  orderType: OrderType;

  @Prop({ type: String, enum: Object.values(OrderSide), required: true })
  orderSide: OrderSide;

  @Prop({ required: true })
  tokenAmount: number; // Amount of pool tokens

  @Prop({ required: true })
  pricePerToken: number; // Price per token in HBAR/USD

  @Prop({ required: true })
  totalValue: number; // Total order value (tokenAmount * pricePerToken)

  @Prop({ required: true })
  filledAmount: number; // Amount of tokens filled

  @Prop({ required: true })
  remainingAmount: number; // Amount remaining to be filled

  @Prop({ type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ required: true })
  paymentToken: string; // 'HBAR', 'TRUST', 'USD'

  @Prop({ default: 0 })
  fees: number; // Trading fees

  @Prop({ default: 0 })
  gasFees: number; // Gas fees for Hedera transactions

  @Prop({ default: null })
  expiresAt: Date; // Order expiration time

  @Prop({ default: null })
  filledAt: Date; // When order was completely filled

  @Prop({ default: null })
  cancelledAt: Date; // When order was cancelled

  @Prop({ default: [] })
  fills: {
    fillId: string;
    amount: number;
    price: number;
    timestamp: Date;
    counterpartyAddress: string;
    transactionHash: string;
  }[];

  @Prop({ default: '' })
  transactionHash: string; // Hedera transaction hash

  @Prop({ default: '' })
  metadata: string; // Additional order metadata

  @Prop({ default: false })
  isMarketOrder: boolean; // Market order vs limit order

  @Prop({ default: 0 })
  stopPrice: number; // Stop loss/take profit price

  @Prop({ default: false })
  isStopOrder: boolean; // Stop order flag

  @Prop({ default: 0 })
  timeInForce: number; // Time in force (0 = GTC, 1 = IOC, 2 = FOK)

  @Prop({ default: '' })
  parentOrderId: string; // Parent order for partial fills

  @Prop({ default: [] })
  childOrderIds: string[]; // Child orders for complex orders

  @Prop({ 
    type: {
      slippageTolerance: { type: Number, default: 0.5 },
      maxGasPrice: { type: Number, default: 0 },
      deadline: { type: Number, default: 0 }
    },
    default: {}
  })
  orderParams: {
    slippageTolerance: number;
    maxGasPrice: number;
    deadline: number;
  };
}

export const TradingOrderSchema = SchemaFactory.createForClass(TradingOrder);

// Indexes for efficient queries
TradingOrderSchema.index({ orderId: 1 });
TradingOrderSchema.index({ poolId: 1, status: 1 });
TradingOrderSchema.index({ poolTokenId: 1, status: 1 });
TradingOrderSchema.index({ traderAddress: 1 });
TradingOrderSchema.index({ orderType: 1, status: 1 });
TradingOrderSchema.index({ orderSide: 1, status: 1 });
TradingOrderSchema.index({ pricePerToken: 1, status: 1 });
TradingOrderSchema.index({ status: 1, createdAt: 1 });
TradingOrderSchema.index({ expiresAt: 1, status: 1 });
