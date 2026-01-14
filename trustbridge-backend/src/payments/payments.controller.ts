import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PaymentsService, PaymentRequest, EscrowRequest } from './payments.service';
import { PaymentMethod, PaymentType } from '../schemas/payment.schema';

export class CreatePaymentDto {
  userId: string;
  assetId?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  type: PaymentType;
  description?: string;
  metadata?: any;
}

export class CreateEscrowDto {
  buyerId: string;
  sellerId: string;
  assetId: string;
  amount: number;
  currency: string;
  deliveryDeadline: Date;
  conditions: string[];
}

export class ReleaseEscrowDto {
  buyerConfirmation: boolean;
}

export class RefundPaymentDto {
  reason: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payment request' })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    const result = await this.paymentsService.createPayment(createPaymentDto);
    
    return {
      success: true,
      data: result,
      message: 'Payment created successfully',
    };
  }

  @Post('escrow')
  @ApiOperation({ summary: 'Create escrow payment' })
  @ApiBody({ type: CreateEscrowDto })
  @ApiResponse({ status: 201, description: 'Escrow created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid escrow request' })
  async createEscrow(@Body() createEscrowDto: CreateEscrowDto) {
    const result = await this.paymentsService.createEscrow(createEscrowDto);
    
    return {
      success: true,
      data: result,
      message: 'Escrow created successfully',
    };
  }

  @Put('escrow/:paymentId/release')
  @ApiOperation({ summary: 'Release or refund escrow' })
  @ApiBody({ type: ReleaseEscrowDto })
  @ApiResponse({ status: 200, description: 'Escrow processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid escrow operation' })
  async releaseEscrow(
    @Param('paymentId') paymentId: string,
    @Body() releaseEscrowDto: ReleaseEscrowDto
  ) {
    await this.paymentsService.releaseEscrow(paymentId, releaseEscrowDto.buyerConfirmation);
    
    return {
      success: true,
      message: 'Escrow processed successfully',
    };
  }

  @Get('status/:paymentId')
  @ApiOperation({ summary: 'Get payment status' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentStatus(@Param('paymentId') paymentId: string) {
    const payment = await this.paymentsService.getPaymentStatus(paymentId);
    
    return {
      success: true,
      data: payment,
      message: 'Payment status retrieved successfully',
    };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user payments' })
  @ApiResponse({ status: 200, description: 'User payments retrieved successfully' })
  async getUserPayments(
    @Param('userId') userId: string,
    @Query('limit') limit?: string
  ) {
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    const payments = await this.paymentsService.getUserPayments(userId, limitNumber);
    
    return {
      success: true,
      data: payments,
      message: 'User payments retrieved successfully',
    };
  }

  @Put('refund/:paymentId')
  @ApiOperation({ summary: 'Refund payment' })
  @ApiBody({ type: RefundPaymentDto })
  @ApiResponse({ status: 200, description: 'Payment refunded successfully' })
  @ApiResponse({ status: 400, description: 'Refund not possible' })
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() refundPaymentDto: RefundPaymentDto
  ) {
    await this.paymentsService.refundPayment(paymentId, refundPaymentDto.reason);
    
    return {
      success: true,
      message: 'Payment refunded successfully',
    };
  }

  @Post('webhook/:provider')
  @ApiOperation({ summary: 'Process payment webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async processWebhook(
    @Param('provider') provider: string,
    @Body() payload: any
  ) {
    await this.paymentsService.processWebhook(provider, payload);
    
    return {
      success: true,
      message: 'Webhook processed successfully',
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiResponse({ status: 200, description: 'Payment statistics retrieved successfully' })
  async getPaymentStats() {
    const stats = await this.paymentsService.getPaymentStats();
    
    return {
      success: true,
      data: stats,
      message: 'Payment statistics retrieved successfully',
    };
  }

  @Get('methods')
  @ApiOperation({ summary: 'Get available payment methods' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved successfully' })
  async getPaymentMethods() {
    const methods = [
      {
        id: 'HBAR',
        name: 'Hedera HBAR',
        description: 'Pay with Hedera HBAR tokens',
        icon: 'hbar',
        supported: true,
        fees: '0.1%',
      },
      {
        id: 'STRIPE',
        name: 'Credit/Debit Card',
        description: 'Pay with Visa, Mastercard, or other cards',
        icon: 'card',
        supported: true,
        fees: '2.9% + $0.30',
      },
      {
        id: 'PAYPAL',
        name: 'PayPal',
        description: 'Pay with PayPal account',
        icon: 'paypal',
        supported: true,
        fees: '2.9% + $0.30',
      },
      {
        id: 'MOBILE_MONEY',
        name: 'Mobile Money',
        description: 'Pay with M-Pesa, Airtel Money, etc.',
        icon: 'mobile',
        supported: true,
        fees: '1.5%',
      },
    ];
    
    return {
      success: true,
      data: methods,
      message: 'Payment methods retrieved successfully',
    };
  }

  @Get('fees')
  @ApiOperation({ summary: 'Get fee structure' })
  @ApiResponse({ status: 200, description: 'Fee structure retrieved successfully' })
  async getFeeStructure() {
    const fees = {
      tokenization: {
        rate: '2%',
        description: 'Fee for tokenizing an asset',
        minimum: '$10',
        maximum: '$10,000',
      },
      verification: {
        rate: '1%',
        description: 'Fee for asset verification',
        minimum: '$5',
        maximum: '$5,000',
      },
      investment: {
        rate: '0.5%',
        description: 'Platform fee for investments',
        minimum: '$1',
        maximum: '$1,000',
      },
      attestor: {
        rate: '1%',
        description: 'Fee paid to attestors for verification',
        minimum: '$5',
        maximum: '$5,000',
      },
    };
    
    return {
      success: true,
      data: fees,
      message: 'Fee structure retrieved successfully',
    };
  }
}
