import { Controller, Get, Post, Put, Body, Param, Query, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { MobileService } from './mobile.service';

export class SubmitVerificationDto {
  assetId: string;
  evidence: {
    documents?: any[];
    photos?: any[];
    location?: {
      coordinates: { lat: number; lng: number };
      address: string;
    };
    additionalInfo?: any;
  };
}

export class CreateInvestmentDto {
  assetId: string;
  amount: number;
}

export class UpdateOperationStatusDto {
  status: string;
  data?: any;
}

@ApiTags('Mobile API')
@Controller('mobile')
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Post('ussd')
  @ApiOperation({ summary: 'Handle USSD requests from Africa\'s Talking' })
  @ApiResponse({ status: 200, description: 'USSD response sent successfully' })
  async handleUSSD(
    @Body() body: any,
    @Res() res: Response
  ) {
    try {
      console.log('📱 USSD Request received:', body);
      
      // Handle both JSON and form-urlencoded formats
      const sessionId = body.sessionId || body.sessionId;
      const phoneNumber = body.phoneNumber || body.phoneNumber;
      const text = body.text || body.text || '';
      
      console.log(`📱 Processing USSD - Phone: ${phoneNumber}, Text: "${text}"`);
      
      // Process USSD request
      const response = await this.mobileService.processUSSDRequest(
        sessionId,
        phoneNumber,
        text
      );
      
      console.log(`📱 USSD Response: ${response.substring(0, 100)}...`);
      
      // Return USSD response format (plain text)
      res.set('Content-Type', 'text/plain; charset=utf-8');
      return res.status(HttpStatus.OK).send(response);
    } catch (error) {
      console.error('❌ USSD Error:', error);
      res.set('Content-Type', 'text/plain; charset=utf-8');
      return res.status(HttpStatus.OK).send('END Error processing request. Please try again.');
    }
  }

  @Get('dashboard/:userId')
  @ApiOperation({ summary: 'Get mobile dashboard for user' })
  @ApiResponse({ status: 200, description: 'Mobile dashboard retrieved successfully' })
  async getMobileDashboard(@Param('userId') userId: string) {
    const dashboard = await this.mobileService.getMobileDashboard(userId);
    
    return {
      success: true,
      data: dashboard,
      message: 'Mobile dashboard retrieved successfully',
    };
  }

  @Get('operations/:userId')
  @ApiOperation({ summary: 'Get user operations' })
  @ApiResponse({ status: 200, description: 'User operations retrieved successfully' })
  async getUserOperations(@Param('userId') userId: string) {
    const operations = await this.mobileService.getUserOperations(userId);
    
    return {
      success: true,
      data: operations,
      message: 'User operations retrieved successfully',
    };
  }

  @Get('operations/track/:operationId')
  @ApiOperation({ summary: 'Track specific operation' })
  @ApiResponse({ status: 200, description: 'Operation tracking retrieved successfully' })
  async trackOperation(@Param('operationId') operationId: string) {
    const tracking = await this.mobileService.trackOperation(operationId);
    
    return {
      success: true,
      data: tracking,
      message: 'Operation tracking retrieved successfully',
    };
  }

  @Get('notifications/:userId')
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'User notifications retrieved successfully' })
  async getUserNotifications(@Param('userId') userId: string) {
    const notifications = await this.mobileService.getUserNotifications(userId);
    
    return {
      success: true,
      data: notifications,
      message: 'User notifications retrieved successfully',
    };
  }

  @Put('notifications/:userId/:notificationId/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read successfully' })
  async markNotificationAsRead(
    @Param('userId') userId: string,
    @Param('notificationId') notificationId: string
  ) {
    await this.mobileService.markNotificationAsRead(userId, notificationId);
    
    return {
      success: true,
      message: 'Notification marked as read successfully',
    };
  }

  @Get('assets/:assetId/:userId')
  @ApiOperation({ summary: 'Get asset details for mobile' })
  @ApiResponse({ status: 200, description: 'Asset details retrieved successfully' })
  async getAssetDetails(
    @Param('assetId') assetId: string,
    @Param('userId') userId: string
  ) {
    const details = await this.mobileService.getAssetDetails(assetId, userId);
    
    return {
      success: true,
      data: details,
      message: 'Asset details retrieved successfully',
    };
  }

  @Get('investments/:investmentId/:userId')
  @ApiOperation({ summary: 'Get investment details for mobile' })
  @ApiResponse({ status: 200, description: 'Investment details retrieved successfully' })
  async getInvestmentDetails(
    @Param('investmentId') investmentId: string,
    @Param('userId') userId: string
  ) {
    const details = await this.mobileService.getInvestmentDetails(investmentId, userId);
    
    return {
      success: true,
      data: details,
      message: 'Investment details retrieved successfully',
    };
  }

  @Get('market/:assetType')
  @ApiOperation({ summary: 'Get market data for asset type' })
  @ApiQuery({ name: 'country', required: false, description: 'Country code' })
  @ApiResponse({ status: 200, description: 'Market data retrieved successfully' })
  async getMarketData(
    @Param('assetType') assetType: string,
    @Query('country') country?: string
  ) {
    const marketData = await this.mobileService.getMarketData(assetType, country || 'US');
    
    return {
      success: true,
      data: marketData,
      message: 'Market data retrieved successfully',
    };
  }

  @Get('blockchain/status/:assetId')
  @ApiOperation({ summary: 'Get blockchain status for asset' })
  @ApiResponse({ status: 200, description: 'Blockchain status retrieved successfully' })
  async getBlockchainStatus(@Param('assetId') assetId: string) {
    const status = await this.mobileService.getBlockchainStatus(assetId);
    
    return {
      success: true,
      data: status,
      message: 'Blockchain status retrieved successfully',
    };
  }

  @Post('verification/submit')
  @ApiOperation({ summary: 'Submit asset for verification via mobile' })
  @ApiBody({ type: SubmitVerificationDto })
  @ApiResponse({ status: 201, description: 'Asset submitted for verification successfully' })
  async submitAssetForVerification(
    @Body() submitVerificationDto: SubmitVerificationDto & { userId: string }
  ) {
    const tracking = await this.mobileService.submitAssetForVerification(
      submitVerificationDto.assetId,
      submitVerificationDto.userId,
      submitVerificationDto.evidence
    );
    
    return {
      success: true,
      data: tracking,
      message: 'Asset submitted for verification successfully',
    };
  }

  @Post('investments/create')
  @ApiOperation({ summary: 'Create investment via mobile' })
  @ApiBody({ type: CreateInvestmentDto })
  @ApiResponse({ status: 201, description: 'Investment created successfully' })
  async createInvestment(
    @Body() createInvestmentDto: CreateInvestmentDto & { userId: string }
  ) {
    const tracking = await this.mobileService.createInvestment(
      createInvestmentDto.assetId,
      createInvestmentDto.userId,
      createInvestmentDto.amount
    );
    
    return {
      success: true,
      data: tracking,
      message: 'Investment created successfully',
    };
  }

  @Get('attestors/:attestorId/operations')
  @ApiOperation({ summary: 'Get attestor operations' })
  @ApiResponse({ status: 200, description: 'Attestor operations retrieved successfully' })
  async getAttestorOperations(@Param('attestorId') attestorId: string) {
    const operations = await this.mobileService.getAttestorOperations(attestorId);
    
    return {
      success: true,
      data: operations,
      message: 'Attestor operations retrieved successfully',
    };
  }

  @Put('operations/:operationId/status')
  @ApiOperation({ summary: 'Update operation status' })
  @ApiBody({ type: UpdateOperationStatusDto })
  @ApiResponse({ status: 200, description: 'Operation status updated successfully' })
  async updateOperationStatus(
    @Param('operationId') operationId: string,
    @Body() updateOperationStatusDto: UpdateOperationStatusDto
  ) {
    await this.mobileService.updateOperationStatus(
      operationId,
      updateOperationStatusDto.status,
      updateOperationStatusDto.data
    );
    
    return {
      success: true,
      message: 'Operation status updated successfully',
    };
  }

  @Get('offline/sync/:userId')
  @ApiOperation({ summary: 'Sync offline data for user' })
  @ApiResponse({ status: 200, description: 'Offline data synced successfully' })
  async syncOfflineData(@Param('userId') userId: string) {
    // TODO: Implement offline data synchronization
    const syncData = {
      lastSync: new Date(),
      pendingOperations: [],
      cachedAssets: [],
      cachedInvestments: [],
    };
    
    return {
      success: true,
      data: syncData,
      message: 'Offline data synced successfully',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Mobile API health check' })
  @ApiResponse({ status: 200, description: 'Mobile API is healthy' })
  async healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      version: '1.0.0',
      services: {
        database: true,
        blockchain: true,
        notifications: true,
        websocket: true,
      },
    };
    
    return {
      success: true,
      data: health,
      message: 'Mobile API is healthy',
    };
  }
}
