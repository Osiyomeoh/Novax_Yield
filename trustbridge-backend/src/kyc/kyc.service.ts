import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import axios from 'axios';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly diditApiKey = process.env.DIDIT_API_KEY;
  private readonly diditWorkflowId = process.env.DIDIT_WORKFLOW_ID;
  private readonly diditBaseUrl = 'https://verification.didit.me/v2';

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async startKYC(userId: string) {
    try {
      // Get user details
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create DidIt session
      const sessionData = {
        vendor_data: JSON.stringify({ userId, walletAddress: user.walletAddress }),
        workflow_id: this.diditWorkflowId,
        callback: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/kyc-callback`,
      };

      const response = await axios.post(
        `${this.diditBaseUrl}/session/`,
        sessionData,
        {
          headers: {
            'x-api-key': this.diditApiKey,
            'Content-Type': 'application/json',
            'accept': 'application/json',
          },
        }
      );

      const session = response.data;
      
      // Update user with session ID and status
      await this.userModel.findByIdAndUpdate(userId, {
        kycInquiryId: session.session_id,
        kycStatus: 'in_progress',
        kycProvider: 'didit',
      });

      this.logger.log(`KYC started for user ${userId}, session ID: ${session.session_id}`);

      return {
        inquiryId: session.session_id,
        inquiryUrl: session.url,
        status: 'in_progress',
        provider: 'didit',
        sessionToken: session.session_token,
      };
    } catch (error) {
      this.logger.error(`Failed to start KYC for user ${userId}:`, error);
      
      if (error.response?.status === 403) {
        this.logger.error('DidIt API returned 403 - API key lacks session creation permissions');
        throw new Error('KYC service is currently unavailable. Please contact support or try again later.');
      }
      
      if (error.response?.status === 400) {
        this.logger.error('DidIt API returned 400 - Invalid request data');
        throw new Error('Invalid KYC request. Please check your profile information.');
      }
      
      throw new Error(`Failed to start KYC: ${error.message}`);
    }
  }


  async checkKYCStatus(inquiryId: string) {
    try {
      const response = await axios.get(
        `${this.diditBaseUrl}/session/${inquiryId}`,
        {
          headers: {
            'x-api-key': this.diditApiKey,
            'Content-Type': 'application/json',
            'accept': 'application/json',
          },
        }
      );

      const session = response.data;
      const status = session.status || 'unknown';

      // Map DidIt status to our internal status
      let internalStatus: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'not_started';
      switch (status) {
        case 'Not Started':
          internalStatus = 'not_started';
          break;
        case 'In Progress':
        case 'Pending':
          internalStatus = 'in_progress';
          break;
        case 'Completed':
        case 'Approved':
          internalStatus = 'approved';
          break;
        case 'Failed':
        case 'Rejected':
        case 'Declined':
          internalStatus = 'rejected';
          break;
        default:
          internalStatus = 'pending';
      }

      // Update user status if changed
      if (internalStatus === 'approved' || internalStatus === 'rejected') {
        await this.userModel.findOneAndUpdate(
          { kycInquiryId: inquiryId },
          { kycStatus: internalStatus }
        );
      }

      return {
        status: internalStatus,
        diditStatus: status,
        inquiryId: session.session_id,
        completedAt: session.completed_at,
      };
    } catch (error) {
      this.logger.error(`Failed to check KYC status for session ${inquiryId}:`, error);
      throw new Error(`Failed to check KYC status: ${error.message}`);
    }
  }

  async getKYCInquiry(inquiryId: string) {
    try {
      const response = await axios.get(
        `${this.diditBaseUrl}/session/${inquiryId}`,
        {
          headers: {
            'x-api-key': this.diditApiKey,
            'Content-Type': 'application/json',
            'accept': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get KYC session ${inquiryId}:`, error);
      throw new Error(`Failed to get KYC session: ${error.message}`);
    }
  }

  private getCountryCode(country: string): string {
    const countryMap: { [key: string]: string } = {
      'Nigeria': 'NG',
      'Ghana': 'GH',
      'Kenya': 'KE',
      'South Africa': 'ZA',
      'United States': 'US',
      'United Kingdom': 'GB',
      'Canada': 'CA',
      'Australia': 'AU',
    };
    
    return countryMap[country] || 'NG'; // Default to Nigeria
  }

  async handleWebhook(webhookData: any) {
    try {
      this.logger.log('Received DidIt webhook:', webhookData);

      const { session_id, status } = webhookData;
      if (session_id) {
        // Map DidIt status to internal status
        let internalStatus: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'not_started';
        switch (status) {
          case 'Not Started':
            internalStatus = 'not_started';
            break;
          case 'In Progress':
          case 'Pending':
            internalStatus = 'in_progress';
            break;
          case 'Completed':
          case 'Approved':
            internalStatus = 'approved';
            break;
          case 'Failed':
          case 'Rejected':
          case 'Declined':
            internalStatus = 'rejected';
            break;
          default:
            internalStatus = 'pending';
        }

        // Update user status
        await this.userModel.findOneAndUpdate(
          { kycInquiryId: session_id },
          { kycStatus: internalStatus }
        );

        this.logger.log(`Updated KYC status for session ${session_id} to ${internalStatus}`);
      }

      return { processed: true };
    } catch (error) {
      this.logger.error('Failed to process DidIt webhook:', error);
      throw new Error(`Failed to process webhook: ${error.message}`);
    }
  }
}
