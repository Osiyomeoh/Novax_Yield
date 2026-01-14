import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TradeExecutionDocument = TradeExecution & Document;

export enum TradeStatus {
  PENDING = 'PENDING',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

@Schema({ timestamps: true })
export class TradeExecution {
  @Prop({ required: true, unique: true })
  tradeId: string;

  @Prop({ required: true })
  poolId: string;

  @Prop({ required: true })
  poolTokenId: string;

  @Prop({ required: true })
  buyOrderId: string;

  @Prop({ required: true })
  sellOrderId: string;

  @Prop({ required: true })
  buyerAddress: string;

  @Prop({ required: true })
  sellerAddress: string;

  @Prop({ required: true })
  tokenAmount: number; // Amount of pool tokens traded

  @Prop({ required: true })
  pricePerToken: number; // Execution price per token

  @Prop({ required: true })
  totalValue: number; // Total trade value

  @Prop({ type: String, enum: Object.values(TradeStatus), default: TradeStatus.PENDING })
  status: TradeStatus;

  @Prop({ required: true })
  paymentToken: string; // 'HBAR', 'TRUST', 'USD'

  @Prop({ default: 0 })
  tradingFees: number; // Platform trading fees

  @Prop({ default: 0 })
  gasFees: number; // Hedera transaction fees

  @Prop({ default: 0 })
  totalFees: number; // Total fees (trading + gas)

  @Prop({ default: '' })
  hederaTransactionHash: string; // Hedera transaction hash

  @Prop({ default: null })
  executedAt: Date; // When trade was executed

  @Prop({ default: null })
  failedAt: Date; // When trade failed

  @Prop({ default: '' })
  failureReason: string; // Reason for trade failure

  @Prop({ 
    type: {
      blockNumber: { type: Number, default: 0 },
      gasUsed: { type: Number, default: 0 },
      gasPrice: { type: Number, default: 0 },
      nonce: { type: Number, default: 0 },
      fromAddress: { type: String, default: '' },
      toAddress: { type: String, default: '' }
    },
    default: {}
  })
  executionDetails: {
    blockNumber: number;
    gasUsed: number;
    gasPrice: number;
    nonce: number;
    fromAddress: string;
    toAddress: string;
  };

  @Prop({ default: [] })
  tokenTransfers: {
    from: string;
    to: string;
    amount: number;
    tokenId: string;
    transactionHash: string;
  }[];

  @Prop({ 
    type: {
      beforePrice: { type: Number, default: 0 },
      afterPrice: { type: Number, default: 0 },
      impactPercentage: { type: Number, default: 0 },
      volumeWeightedPrice: { type: Number, default: 0 }
    },
    default: {}
  })
  priceImpact: {
    beforePrice: number;
    afterPrice: number;
    impactPercentage: number;
    volumeWeightedPrice: number;
  };

  @Prop({ default: '' })
  orderBookSnapshot: string; // JSON snapshot of order book at execution time

  @Prop({ default: false })
  isSettled: boolean; // Whether trade has been settled on-chain

  @Prop({ default: null })
  settledAt: Date; // When trade was settled on-chain

  @Prop({ default: '' })
  settlementTransactionHash: string; // Settlement transaction hash

  @Prop({ 
    type: {
      marketMaker: { type: Boolean, default: false },
      liquidityProvider: { type: Boolean, default: false },
      arbitrageTrade: { type: Boolean, default: false },
      largeTrade: { type: Boolean, default: false },
      tradeSize: { type: String, enum: ['SMALL', 'MEDIUM', 'LARGE', 'WHALE'], default: 'SMALL' }
    },
    default: {}
  })
  metadata: {
    marketMaker: boolean;
    liquidityProvider: boolean;
    arbitrageTrade: boolean;
    largeTrade: boolean;
    tradeSize: 'SMALL' | 'MEDIUM' | 'LARGE' | 'WHALE';
  };
}

export const TradeExecutionSchema = SchemaFactory.createForClass(TradeExecution);

// Indexes for efficient queries
TradeExecutionSchema.index({ tradeId: 1 });
TradeExecutionSchema.index({ poolId: 1, status: 1 });
TradeExecutionSchema.index({ poolTokenId: 1, status: 1 });
TradeExecutionSchema.index({ buyerAddress: 1 });
TradeExecutionSchema.index({ sellerAddress: 1 });
TradeExecutionSchema.index({ buyOrderId: 1 });
TradeExecutionSchema.index({ sellOrderId: 1 });
TradeExecutionSchema.index({ status: 1, executedAt: 1 });
TradeExecutionSchema.index({ hederaTransactionHash: 1 });
TradeExecutionSchema.index({ paymentToken: 1, executedAt: 1 });
