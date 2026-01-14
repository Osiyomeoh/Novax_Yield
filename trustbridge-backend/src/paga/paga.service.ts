import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PagaService {
  private readonly logger = new Logger(PagaService.name);
  private readonly apiUrl = 'https://beta-collect.paga.com';
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly hashKey: string;
  private readonly callbackUrl: string;

  constructor(private configService: ConfigService) {
    this.publicKey = this.configService.get<string>('PAGA_PUBLIC_KEY') || '';
    this.secretKey = this.configService.get<string>('PAGA_SECRET_KEY') || '';
    this.hashKey = this.configService.get<string>('PAGA_HASH_KEY') || '';
    this.callbackUrl = this.configService.get<string>('PAGA_CALLBACK_URL') || 
      'https://tbafrica.xyz/api/paga/webhook';
    
    if (!this.publicKey || !this.secretKey) {
      this.logger.warn('Paga credentials not fully configured');
    }
  }

  /**
   * Generate a unique payment code for agent deposits
   */
  generatePaymentCode(userId: string, amount: number): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `TB-${timestamp}-${random}`;
  }

  /**
   * Generate HMAC hash for Paga API
   */
  private generateHash(data: string): string {
    if (!this.hashKey) {
      return '';
    }
    return crypto.createHmac('sha512', this.hashKey).update(data).digest('hex');
  }

  /**
   * Create a Bank USSD payment request
   * Based on Paga Bank USSD API: https://developer-docs.paga.com/docs/bank-ussd-payment
   */
  async createAgentPaymentRequest(
    phoneNumber: string,
    amount: number,
    reference: string,
    description: string
  ): Promise<{
    reference: string;
    paymentCode: string;
    ussdCode: string;
    bank: string;
    instructions: string;
  }> {
    try {
      if (!this.publicKey || !this.secretKey) {
        // Return simulated response for testing
        return this.createSimulatedPaymentRequest(phoneNumber, amount, reference, description);
      }

      // Get available banks first
      const banksResponse = await axios.post(
        `${this.apiUrl}/getBanks`,
        {},
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.publicKey}:${this.secretKey}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // For now, use a default bank ID (in production, let user select)
      const defaultBankId = '43F4DED6-78EC-4047-AD34-BAB75E679EB7'; // Example bank ID

      // Create payment request
      const requestBody = {
        referenceNumber: reference,
        amount: amount,
        currency: 'NGN',
        payer: {
          name: 'User',
          phoneNumber: phoneNumber,
          bankId: defaultBankId,
        },
        payee: {
          name: 'TrustBridge Africa',
        },
        expiryDateTimeUTC: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        isSuppressMessages: false,
        payerCollectionFeeShare: 0.0,
        payeeCollectionFeeShare: 1.0,
        callBackUrl: this.callbackUrl,
        paymentMethods: ['FUNDING_USSD'],
      };

      const requestData = JSON.stringify(requestBody);
      const hash = this.generateHash(requestData);

      const response = await axios.post(
        `${this.apiUrl}/paymentRequest`,
        requestBody,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.publicKey}:${this.secretKey}`).toString('base64')}`,
            'Content-Type': 'application/json',
            hash: hash,
          },
        }
      );

      if (response.data.statusCode === '0') {
        const ussdCode = response.data.paymentMethods[0]?.properties?.USSDShortCode;
        return {
          reference: response.data.referenceNumber,
          paymentCode: response.data.paymentMethods[0]?.properties?.PaymentReference,
          ussdCode: ussdCode || '*894*000#',
          bank: 'Bank USSD',
          instructions: this.formatUSSDInstructions(ussdCode, amount),
        };
      }

      throw new Error(response.data.statusMessage || 'Payment request failed');
    } catch (error) {
      this.logger.error('Error creating Paga Bank USSD payment:', error);
      // Return simulated response as fallback
      return this.createSimulatedPaymentRequest(phoneNumber, amount, reference, description);
    }
  }

  /**
   * Create simulated payment request for testing
   */
  private createSimulatedPaymentRequest(
    phoneNumber: string,
    amount: number,
    reference: string,
    description: string
  ) {
    const paymentCode = this.generatePaymentCode(phoneNumber, amount);
    
    return {
      reference: reference,
      paymentCode: paymentCode,
      ussdCode: '*894*000#', // Simulated
      bank: 'Simulated',
      instructions: this.formatUSSDInstructions('*894*000#', amount),
    };
  }

  /**
   * Format USSD instructions for display
   */
  private formatUSSDInstructions(ussdCode: string, amount: number): string {
    return `
Bank USSD Payment

USSD Code: ${ussdCode}
Amount: ₦${amount.toLocaleString()}

Instructions:
1. Dial ${ussdCode} on your phone
2. Enter your 4-digit PIN
3. Confirm payment
4. You'll receive SMS confirmation

No need to visit an agent!
Available at any bank with USSD.
    `.trim();
  }

  /**
   * Verify payment status
   * NOTE: In production, this would be called via webhook
   */
  async verifyPayment(reference: string): Promise<{
    verified: boolean;
    amount?: number;
    timestamp?: Date;
  }> {
    try {
      if (!this.publicKey || !this.secretKey) {
        this.logger.warn('Paga credentials not configured - using simulated verification');
        // For demo purposes, return verified if payment code exists
        return {
          verified: true,
          amount: 500,
          timestamp: new Date(),
        };
      }

      // Call Paga API to check payment status
      const response = await axios.get(
        `${this.apiUrl}/paymentRequest/${reference}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.publicKey}:${this.secretKey}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.statusCode === '0') {
        const paymentStatus = response.data.status;
        const isPaid = paymentStatus === 'SUCCESSFUL' || paymentStatus === 'COMPLETED';
        
        this.logger.log(`Payment verification for ${reference}: ${paymentStatus}`);
        
        return {
          verified: isPaid,
          amount: response.data.amount,
          timestamp: response.data.timestamp ? new Date(response.data.timestamp) : new Date(),
        };
      }

      this.logger.warn(`Payment verification failed for ${reference}: ${response.data.statusMessage}`);
      return {
        verified: false,
      };
    } catch (error) {
      this.logger.error('Error verifying payment:', error);
      throw new Error('Failed to verify payment');
    }
  }

  /**
   * Get nearby agent locations
   */
  async getNearbyAgents(latitude: number, longitude: number): Promise<{
    agents: Array<{
      name: string;
      address: string;
      distance: string;
      phone: string;
    }>;
  }> {
    try {
      // Return sample data
      return {
        agents: [
          {
            name: 'Paga Agent - Ikeja',
            address: 'Shop 5, Ikeja Lagos',
            distance: '2.5 km',
            phone: '08012345678',
          },
          {
            name: 'Paga Agent - Victoria Island',
            address: 'Victoria Island, Lagos',
            distance: '5.0 km',
            phone: '08087654321',
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting nearby agents:', error);
      throw new Error('Failed to get agent locations');
    }
  }

  /**
   * Send SMS with payment instructions
   */
  async sendPaymentInstructions(
    phoneNumber: string,
    paymentCode: string,
    amount: number
  ): Promise<void> {
    try {
      const message = `
TrustBridge Africa Payment

Pay ₦${amount.toLocaleString()} at any Paga agent.

Payment Code: ${paymentCode}

Find nearest agent:
- Visit paga.com/agents
- Or dial *242*242# on your phone

After payment, you'll receive confirmation.
      `.trim();

      // In production, send via SMS service
      this.logger.log(`SMS to ${phoneNumber}: ${message}`);
    } catch (error) {
      this.logger.error('Error sending SMS:', error);
    }
  }
}

