import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import { GmailService } from '../services/gmail.service';

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  subject?: string;
  body: string;
  variables: string[];
}

export interface NotificationRequest {
  to: string | string[];
  type: 'email' | 'sms' | 'push';
  templateId?: string;
  subject?: string;
  message: string;
  variables?: { [key: string]: any };
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
}

export interface NotificationResult {
  id: string;
  success: boolean;
  recipients: string[];
  status: 'sent' | 'failed' | 'pending' | 'scheduled';
  provider: string;
  timestamp: Date;
  error?: string;
  cost?: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly templates: Map<string, NotificationTemplate> = new Map();
  private readonly notificationQueue: NotificationRequest[] = [];

  // External service configurations
  private readonly smsConfig = {
    provider: this.configService.get<string>('SMS_PROVIDER', 'twilio'),
    twilio: {
      accountSid: this.configService.get<string>('TWILIO_ACCOUNT_SID'),
      authToken: this.configService.get<string>('TWILIO_AUTH_TOKEN'),
      fromNumber: this.configService.get<string>('TWILIO_FROM_NUMBER'),
    },
    africastalking: {
      username: this.configService.get<string>('AT_USERNAME'),
      apiKey: this.configService.get<string>('AT_API_KEY'),
      senderId: this.configService.get<string>('AT_SENDER_ID'),
    },
  };

  private readonly emailConfig = {
    provider: this.configService.get<string>('EMAIL_PROVIDER', 'gmail'),
    sendgrid: {
      apiKey: this.configService.get<string>('SENDGRID_API_KEY'),
      fromEmail: this.configService.get<string>('SENDGRID_FROM_EMAIL', 'noreply@trustbridge.africa'),
    },
    gmail: {
      user: this.configService.get<string>('GMAIL_USER'),
      appPassword: this.configService.get<string>('GMAIL_APP_PASSWORD'),
    },
    ses: {
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
    },
  };

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private gmailService: GmailService,
  ) {
    this.initializeTemplates();
    this.startNotificationProcessor();
  }

  private initializeTemplates(): void {
    // Asset Owner Templates
    this.templates.set('asset_submitted', {
      id: 'asset_submitted',
      name: 'Asset Submission Confirmation',
      type: 'email',
      subject: 'Asset Submitted for Verification - TrustBridge',
      body: 'Dear {{ownerName}},\n\nYour asset "{{assetName}}" has been successfully submitted for verification.\n\nAsset ID: {{assetId}}\nType: {{assetType}}\nValue: ${{assetValue}}\n\nWe will notify you once the verification process is complete.\n\nBest regards,\nTrustBridge Team',
      variables: ['ownerName', 'assetName', 'assetId', 'assetType', 'assetValue'],
    });

    this.templates.set('verification_assigned', {
      id: 'verification_assigned',
      name: 'Verification Assignment',
      type: 'sms',
      body: 'Your asset {{assetName}} has been assigned to {{attestorName}} for verification. Expected completion: {{estimatedDate}}',
      variables: ['assetName', 'attestorName', 'estimatedDate'],
    });

    this.templates.set('verification_completed', {
      id: 'verification_completed',
      name: 'Verification Completed',
      type: 'email',
      subject: 'Asset Verification Complete - {{status}}',
      body: 'Dear {{ownerName}},\n\nYour asset "{{assetName}}" verification has been completed.\n\nStatus: {{status}}\nScore: {{score}}%\n\n{{#if approved}}Your asset is now ready for tokenization!{{else}}Please review the feedback and resubmit.{{/if}}\n\nBest regards,\nTrustBridge Team',
      variables: ['ownerName', 'assetName', 'status', 'score', 'approved'],
    });

    // Attestor Templates
    this.templates.set('attestor_assignment', {
      id: 'attestor_assignment',
      name: 'New Verification Assignment',
      type: 'email',
      subject: 'New Verification Assignment - TrustBridge',
      body: 'Dear {{attestorName}},\n\nYou have been assigned a new verification request.\n\nAsset: {{assetName}}\nOwner: {{ownerName}}\nLocation: {{location}}\nValue: ${{assetValue}}\n\nPlease complete the verification within 48 hours.\n\nBest regards,\nTrustBridge Team',
      variables: ['attestorName', 'assetName', 'ownerName', 'location', 'assetValue'],
    });

    // Investor Templates
    this.templates.set('investment_confirmation', {
      id: 'investment_confirmation',
      name: 'Investment Confirmation',
      type: 'email',
      subject: 'Investment Confirmed - TrustBridge',
      body: 'Dear {{investorName}},\n\nYour investment has been confirmed.\n\nAsset: {{assetName}}\nAmount: ${{investmentAmount}}\nTokens: {{tokenAmount}}\nExpected APY: {{expectedAPY}}%\n\nYou can track your investment in your portfolio.\n\nBest regards,\nTrustBridge Team',
      variables: ['investorName', 'assetName', 'investmentAmount', 'tokenAmount', 'expectedAPY'],
    });

    this.templates.set('maturity_notification', {
      id: 'maturity_notification',
      name: 'Asset Maturity Notification',
      type: 'email',
      subject: 'Asset Matured - Returns Available',
      body: 'Dear {{investorName}},\n\nYour investment in "{{assetName}}" has matured.\n\nOriginal Investment: ${{originalAmount}}\nReturns: ${{returns}}\nTotal: ${{totalAmount}}\n\nReturns have been automatically transferred to your account.\n\nBest regards,\nTrustBridge Team',
      variables: ['investorName', 'assetName', 'originalAmount', 'returns', 'totalAmount'],
    });

    // System Templates
    this.templates.set('system_alert', {
      id: 'system_alert',
      name: 'System Alert',
      type: 'email',
      subject: 'TrustBridge System Alert',
      body: 'System Alert: {{alertType}}\n\nMessage: {{message}}\n\nTime: {{timestamp}}\n\nPlease take appropriate action if required.\n\nTrustBridge System',
      variables: ['alertType', 'message', 'timestamp'],
    });
  }

  async sendNotification(request: NotificationRequest): Promise<NotificationResult> {
    try {
      const notificationId = this.generateNotificationId();
      
      // Process template if provided
      let processedMessage = request.message;
      if (request.templateId) {
        processedMessage = await this.processTemplate(request.templateId, request.variables || {});
      }

      // Schedule notification if scheduledAt is provided
      if (request.scheduledAt && request.scheduledAt > new Date()) {
        this.scheduleNotification(request, notificationId);
        return {
          success: true,
          recipients: Array.isArray(request.to) ? request.to : [request.to],
          id: notificationId,
          status: 'scheduled',
          provider: 'scheduler',
          timestamp: new Date(),
        };
      }

      // Send notification based on type
      let result: NotificationResult;
      switch (request.type) {
        case 'email':
          result = await this.sendEmail(request.to, request.subject || '', processedMessage);
          break;
        case 'sms':
          result = await this.sendSMS(request.to, processedMessage);
          break;
        case 'push':
          result = await this.sendPushNotification(request.to, processedMessage);
          break;
        default:
          throw new Error(`Unsupported notification type: ${request.type}`);
      }

      // Emit notification sent event
      this.eventEmitter.emit('notification.sent', {
        notificationId,
        type: request.type,
        recipients: Array.isArray(request.to) ? request.to : [request.to],
        result,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to send notification:', error);
      return {
        id: this.generateNotificationId(),
        success: false,
        recipients: [],
        status: 'failed',
        provider: 'unknown',
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  private async sendEmail(to: string | string[], subject: string, message: string): Promise<NotificationResult> {
    const recipients = Array.isArray(to) ? to : [to];
    
    try {
      if (this.emailConfig.provider === 'gmail') {
        return await this.sendEmailViaGmail(recipients, subject, message);
      } else if (this.emailConfig.provider === 'sendgrid') {
        return await this.sendEmailViaSendGrid(recipients, subject, message);
      } else if (this.emailConfig.provider === 'ses') {
        return await this.sendEmailViaSES(recipients, subject, message);
      } else {
        // Use console logging as fallback for free beta testing
        return await this.sendEmailConsole(recipients, subject, message);
      }
    } catch (error) {
      this.logger.error('Email sending failed:', error);
      throw error;
    }
  }

  private async sendEmailViaSendGrid(recipients: string[], subject: string, message: string): Promise<NotificationResult> {
    if (!this.emailConfig.sendgrid.apiKey) {
      this.logger.warn('SendGrid API key not configured, using console logging');
      return await this.sendEmailConsole(recipients, subject, message);
    }

    try {
      const response = await axios.post('https://api.sendgrid.com/v3/mail/send', {
        personalizations: recipients.map(email => ({ to: [{ email }] })),
        from: { email: this.emailConfig.sendgrid.fromEmail },
        subject,
        content: [{ type: 'text/plain', value: message }],
      }, {
        headers: {
          'Authorization': `Bearer ${this.emailConfig.sendgrid.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        id: this.generateNotificationId(),
        success: true,
        recipients,
        status: 'sent',
        provider: 'sendgrid',
        timestamp: new Date(),
        cost: recipients.length * 0.0005, // Approximate cost per email
      };
    } catch (error) {
      this.logger.error('SendGrid email failed:', error);
      throw error;
    }
  }

  private async sendEmailViaGmail(recipients: string[], subject: string, message: string): Promise<NotificationResult> {
    if (!this.emailConfig.gmail.user || !this.emailConfig.gmail.appPassword) {
      this.logger.warn('Gmail credentials not configured, using console logging');
      return await this.sendEmailConsole(recipients, subject, message);
    }

    try {
      const success = await this.gmailService.sendEmail(recipients, subject, message);
      
      return {
        id: this.generateNotificationId(),
        success,
        recipients,
        status: success ? 'sent' : 'failed',
        provider: 'gmail',
        timestamp: new Date(),
        cost: 0, // Gmail is free
      };
    } catch (error) {
      this.logger.error('Gmail email failed:', error);
      throw error;
    }
  }

  private async sendEmailViaSES(recipients: string[], subject: string, message: string): Promise<NotificationResult> {
    // TODO: Implement AWS SES integration
    this.logger.log('Using console logging for email notifications');
    return this.sendEmailConsole(recipients, subject, message);
  }

  private async sendEmailConsole(recipients: string[], subject: string, message: string): Promise<NotificationResult> {
    this.logger.log(`📧 EMAIL NOTIFICATION`);
    this.logger.log(`To: ${recipients.join(', ')}`);
    this.logger.log(`Subject: ${subject}`);
    this.logger.log(`Message: ${message}`);
    this.logger.log(`Timestamp: ${new Date().toISOString()}`);
    
    return {
      id: this.generateNotificationId(),
      success: true,
      recipients,
      status: 'sent',
      provider: 'console',
      timestamp: new Date(),
    };
  }

  private async sendSMS(to: string | string[], message: string): Promise<NotificationResult> {
    const recipients = Array.isArray(to) ? to : [to];
    
    try {
      if (this.smsConfig.provider === 'twilio') {
        return await this.sendSMSViaTwilio(recipients, message);
      } else if (this.smsConfig.provider === 'africastalking') {
        return await this.sendSMSViaAfricaTalking(recipients, message);
      } else {
        return await this.sendSMSConsole(recipients, message);
      }
    } catch (error) {
      this.logger.error('SMS sending failed:', error);
      throw error;
    }
  }

  private async sendSMSViaTwilio(recipients: string[], message: string): Promise<NotificationResult> {
    if (!this.smsConfig.twilio.accountSid || !this.smsConfig.twilio.authToken) {
      this.logger.warn('Twilio credentials not configured, using console logging');
      return this.sendSMSConsole(recipients, message);
    }

    try {
      const results = await Promise.all(
        recipients.map(async (phoneNumber) => {
          const response = await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${this.smsConfig.twilio.accountSid}/Messages.json`,
            new URLSearchParams({
              To: phoneNumber,
              From: this.smsConfig.twilio.fromNumber || '+1234567890',
              Body: message,
            }),
            {
              auth: {
                username: this.smsConfig.twilio.accountSid,
                password: this.smsConfig.twilio.authToken,
              },
            }
          );
          return response.data;
        })
      );

      return {
        id: this.generateNotificationId(),
        success: true,
        recipients,
        status: 'sent',
        provider: 'twilio',
        timestamp: new Date(),
        cost: recipients.length * 0.0075, // Approximate cost per SMS
      };
    } catch (error) {
      this.logger.error('Twilio SMS failed:', error);
      throw error;
    }
  }

  private async sendSMSViaAfricaTalking(recipients: string[], message: string): Promise<NotificationResult> {
    if (!this.smsConfig.africastalking.username || !this.smsConfig.africastalking.apiKey) {
      this.logger.warn('Africa\'s Talking credentials not configured, using console logging');
      return await this.sendSMSConsole(recipients, message);
    }

    try {
      const response = await axios.post('https://api.africastalking.com/version1/messaging', {
        username: this.smsConfig.africastalking.username,
        to: recipients.join(','),
        message,
        from: this.smsConfig.africastalking.senderId,
      }, {
        headers: {
          'apiKey': this.smsConfig.africastalking.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return {
        id: this.generateNotificationId(),
        success: true,
        recipients,
        status: 'sent',
        provider: 'africastalking',
        timestamp: new Date(),
        cost: recipients.length * 0.01, // Approximate cost per SMS
      };
    } catch (error) {
      this.logger.error('Africa\'s Talking SMS failed:', error);
      throw error;
    }
  }

  private async sendSMSConsole(recipients: string[], message: string): Promise<NotificationResult> {
    this.logger.log(`📱 SMS NOTIFICATION`);
    this.logger.log(`To: ${recipients.join(', ')}`);
    this.logger.log(`Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    this.logger.log(`Timestamp: ${new Date().toISOString()}`);
    
    return {
      id: this.generateNotificationId(),
      success: true,
      recipients,
      status: 'sent',
      provider: 'console',
      timestamp: new Date(),
    };
  }

  private async sendPushNotification(to: string | string[], message: string): Promise<NotificationResult> {
    // TODO: Implement push notification service (Firebase, OneSignal, etc.)
    const recipients = Array.isArray(to) ? to : [to];
    this.logger.log(`🔔 PUSH NOTIFICATION`);
    this.logger.log(`To: ${recipients.join(', ')}`);
    this.logger.log(`Message: ${message}`);
    this.logger.log(`Timestamp: ${new Date().toISOString()}`);
    
    return {
      id: this.generateNotificationId(),
      success: true,
      recipients,
      status: 'sent',
      provider: 'console',
      timestamp: new Date(),
    };
  }

  private async processTemplate(templateId: string, variables: { [key: string]: any }): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let processedMessage = template.body;
    
    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      processedMessage = processedMessage.replace(placeholder, String(value));
    }

    // Handle conditional blocks (simple implementation)
    processedMessage = processedMessage.replace(/\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, content) => {
      return variables[condition] ? content : '';
    });

    return processedMessage;
  }

  private scheduleNotification(request: NotificationRequest, notificationId: string): void {
    const delay = request.scheduledAt!.getTime() - Date.now();
    
    setTimeout(async () => {
      try {
        await this.sendNotification({ ...request, scheduledAt: undefined });
      } catch (error) {
        this.logger.error('Scheduled notification failed:', error);
      }
    }, delay);
  }

  private startNotificationProcessor(): void {
    // Process queued notifications every 30 seconds
    setInterval(() => {
      this.processNotificationQueue();
    }, 30000);
  }

  private async processNotificationQueue(): Promise<void> {
    if (this.notificationQueue.length === 0) return;

    const batch = this.notificationQueue.splice(0, 10); // Process 10 at a time
    
    for (const notification of batch) {
      try {
        await this.sendNotification(notification);
      } catch (error) {
        this.logger.error('Queued notification failed:', error);
      }
    }
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for external use
  async sendAssetSubmissionNotification(ownerEmail: string, assetData: any): Promise<void> {
    await this.sendNotification({
      to: ownerEmail,
      type: 'email',
      templateId: 'asset_submitted',
      message: 'Your asset has been submitted for verification',
      variables: {
        ownerName: assetData.ownerName,
        assetName: assetData.name,
        assetId: assetData.assetId,
        assetType: assetData.type,
        assetValue: assetData.totalValue,
      },
    });
  }

  async sendVerificationAssignmentNotification(attestorEmail: string, verificationData: any): Promise<void> {
    await this.sendNotification({
      to: attestorEmail,
      type: 'email',
      templateId: 'attestor_assignment',
      message: 'You have been assigned a new verification task',
      variables: {
        attestorName: verificationData.attestorName,
        assetName: verificationData.assetName,
        ownerName: verificationData.ownerName,
        location: verificationData.location,
        assetValue: verificationData.assetValue,
      },
    });
  }

  async sendInvestmentConfirmationNotification(investorEmail: string, investmentData: any): Promise<void> {
    await this.sendNotification({
      to: investorEmail,
      type: 'email',
      templateId: 'investment_confirmation',
      message: 'Your investment has been confirmed',
      variables: {
        investorName: investmentData.investorName,
        assetName: investmentData.assetName,
        investmentAmount: investmentData.amount,
        tokenAmount: investmentData.tokens,
        expectedAPY: investmentData.expectedAPY,
      },
    });
  }

  async sendSystemAlert(alertType: string, message: string, recipients: string[]): Promise<void> {
    await this.sendNotification({
      to: recipients,
      type: 'email',
      templateId: 'system_alert',
      message: message,
      variables: {
        alertType,
        message,
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
    });
  }

  // Template management
  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplate(templateId: string): NotificationTemplate | undefined {
    return this.templates.get(templateId);
  }

  addTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): void {
    const template = this.templates.get(templateId);
    if (template) {
      this.templates.set(templateId, { ...template, ...updates });
    }
  }

  deleteTemplate(templateId: string): void {
    this.templates.delete(templateId);
  }

  // FREE Console logging methods for beta testing
}
