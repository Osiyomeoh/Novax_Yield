import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { PagaService } from './paga.service';

@Controller('paga')
export class PagaController {
  private readonly logger = new Logger(PagaController.name);

  constructor(private readonly pagaService: PagaService) {}

  @Post('create-payment')
  async createPayment(@Body() body: {
    phoneNumber: string;
    amount: number;
    description: string;
    userId: string;
  }) {
    try {
      const reference = this.pagaService.generatePaymentCode(body.userId, body.amount);
      
      const paymentRequest = await this.pagaService.createAgentPaymentRequest(
        body.phoneNumber,
        body.amount,
        reference,
        body.description
      );

      // Send SMS with instructions
      await this.pagaService.sendPaymentInstructions(
        body.phoneNumber,
        paymentRequest.paymentCode,
        body.amount
      );

      return {
        success: true,
        data: paymentRequest,
      };
    } catch (error) {
      this.logger.error('Error creating Paga payment:', error);
      throw error;
    }
  }

  @Get('verify/:reference')
  async verifyPayment(@Param('reference') reference: string) {
    try {
      const verification = await this.pagaService.verifyPayment(reference);
      return {
        success: true,
        data: verification,
      };
    } catch (error) {
      this.logger.error('Error verifying payment:', error);
      throw error;
    }
  }

  @Get('agents/:lat/:lng')
  async getNearbyAgents(
    @Param('lat') lat: string,
    @Param('lng') lng: string
  ) {
    try {
      const agents = await this.pagaService.getNearbyAgents(
        parseFloat(lat),
        parseFloat(lng)
      );
      return {
        success: true,
        data: agents,
      };
    } catch (error) {
      this.logger.error('Error getting nearby agents:', error);
      throw error;
    }
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    try {
      this.logger.log('Paga webhook received:', body);
      
      // Verify webhook signature (Paga signs webhooks with HMAC)
      // In production, verify: body.signature === HMAC(JSON.stringify(body.data), SECRET_KEY)
      
      // Extract payment details
      const { referenceNumber, amount, status, transactionReference } = body.data || body;
      
      if (!referenceNumber || !status) {
        this.logger.warn('Invalid webhook data:', body);
        return {
          success: false,
          message: 'Invalid webhook data',
        };
      }
      
      // Check payment status
      const isPaid = status === 'SUCCESSFUL' || status === 'COMPLETED';
      
      if (isPaid) {
        this.logger.log(`✅ Payment confirmed: ${referenceNumber}, Amount: ₦${amount}`);
        
        // TODO: Update user session with payment confirmation
        // TODO: Trigger asset creation on Hedera
        // TODO: Send SMS confirmation to user
        
        // For now, just log
        this.logger.log('Payment verified - asset creation should proceed');
      } else {
        this.logger.warn(`❌ Payment failed: ${referenceNumber}, Status: ${status}`);
      }
      
      return {
        success: true,
        message: 'Webhook processed',
        paymentStatus: status,
      };
    } catch (error) {
      this.logger.error('Error handling webhook:', error);
      throw error;
    }
  }
}

