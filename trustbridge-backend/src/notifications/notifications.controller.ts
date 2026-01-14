import { Controller, Post, Get, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { NotificationsService, NotificationRequest, NotificationTemplate } from './notifications.service';

export class SendNotificationDto {
  to: string | string[];
  type: 'email' | 'sms' | 'push';
  templateId?: string;
  subject?: string;
  message: string;
  variables?: { [key: string]: any };
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
}

export class CreateTemplateDto {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  subject?: string;
  body: string;
  variables: string[];
}

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send notification' })
  @ApiBody({ type: SendNotificationDto })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid notification request' })
  async sendNotification(@Body() sendNotificationDto: SendNotificationDto) {
    const result = await this.notificationsService.sendNotification(sendNotificationDto);
    
    return {
      success: true,
      data: result,
      message: 'Notification sent successfully',
    };
  }

  @Post('send-asset-submission')
  @ApiOperation({ summary: 'Send asset submission notification' })
  @ApiResponse({ status: 200, description: 'Asset submission notification sent' })
  async sendAssetSubmissionNotification(@Body() body: {
    ownerEmail: string;
    assetData: any;
  }) {
    await this.notificationsService.sendAssetSubmissionNotification(
      body.ownerEmail,
      body.assetData
    );
    
    return {
      success: true,
      message: 'Asset submission notification sent',
    };
  }

  @Post('send-verification-assignment')
  @ApiOperation({ summary: 'Send verification assignment notification' })
  @ApiResponse({ status: 200, description: 'Verification assignment notification sent' })
  async sendVerificationAssignmentNotification(@Body() body: {
    attestorEmail: string;
    verificationData: any;
  }) {
    await this.notificationsService.sendVerificationAssignmentNotification(
      body.attestorEmail,
      body.verificationData
    );
    
    return {
      success: true,
      message: 'Verification assignment notification sent',
    };
  }

  @Post('send-investment-confirmation')
  @ApiOperation({ summary: 'Send investment confirmation notification' })
  @ApiResponse({ status: 200, description: 'Investment confirmation notification sent' })
  async sendInvestmentConfirmationNotification(@Body() body: {
    investorEmail: string;
    investmentData: any;
  }) {
    await this.notificationsService.sendInvestmentConfirmationNotification(
      body.investorEmail,
      body.investmentData
    );
    
    return {
      success: true,
      message: 'Investment confirmation notification sent',
    };
  }

  @Post('send-system-alert')
  @ApiOperation({ summary: 'Send system alert notification' })
  @ApiResponse({ status: 200, description: 'System alert notification sent' })
  async sendSystemAlert(@Body() body: {
    alertType: string;
    message: string;
    recipients: string[];
  }) {
    await this.notificationsService.sendSystemAlert(
      body.alertType,
      body.message,
      body.recipients
    );
    
    return {
      success: true,
      message: 'System alert notification sent',
    };
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all notification templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates() {
    const templates = this.notificationsService.getTemplates();
    
    return {
      success: true,
      data: templates,
      message: 'Templates retrieved successfully',
    };
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get notification template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplate(@Param('templateId') templateId: string) {
    const template = this.notificationsService.getTemplate(templateId);
    
    if (!template) {
      return {
        success: false,
        message: 'Template not found',
      };
    }
    
    return {
      success: true,
      data: template,
      message: 'Template retrieved successfully',
    };
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create notification template' })
  @ApiBody({ type: CreateTemplateDto })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(@Body() createTemplateDto: CreateTemplateDto) {
    this.notificationsService.addTemplate(createTemplateDto);
    
    return {
      success: true,
      message: 'Template created successfully',
    };
  }

  @Post('templates/:templateId')
  @ApiOperation({ summary: 'Update notification template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() updates: Partial<CreateTemplateDto>
  ) {
    this.notificationsService.updateTemplate(templateId, updates);
    
    return {
      success: true,
      message: 'Template updated successfully',
    };
  }

  @Delete('templates/:templateId')
  @ApiOperation({ summary: 'Delete notification template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async deleteTemplate(@Param('templateId') templateId: string) {
    this.notificationsService.deleteTemplate(templateId);
    
    return {
      success: true,
      message: 'Template deleted successfully',
    };
  }

  @Get('test/:type')
  @ApiOperation({ summary: 'Test notification service' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async testNotification(
    @Param('type') type: 'email' | 'sms' | 'push',
    @Query('to') to: string
  ) {
    const testMessage = `Test ${type} notification from TrustBridge - ${new Date().toISOString()}`;
    
    const result = await this.notificationsService.sendNotification({
      to,
      type,
      message: testMessage,
      subject: type === 'email' ? 'Test Email from TrustBridge' : undefined,
    });
    
    return {
      success: true,
      data: result,
      message: `Test ${type} notification sent`,
    };
  }
}
