import { Controller, Post, Get, Param, UseGuards, Request, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KycService } from './kyc.service';

@ApiTags('KYC')
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start KYC verification process' })
  @ApiResponse({ status: 200, description: 'KYC process started successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async startKYC(@Request() req: any) {
    const userId = req.user.sub;
    const result = await this.kycService.startKYC(userId);
    
    return {
      success: true,
      data: result,
      message: 'KYC process started successfully',
    };
  }

  @Get('status/:inquiryId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check KYC verification status' })
  @ApiResponse({ status: 200, description: 'KYC status retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkKYCStatus(@Param('inquiryId') inquiryId: string) {
    const result = await this.kycService.checkKYCStatus(inquiryId);
    
    return {
      success: true,
      data: result,
      message: 'KYC status retrieved successfully',
    };
  }

  @Get('inquiry/:inquiryId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get KYC inquiry details' })
  @ApiResponse({ status: 200, description: 'KYC inquiry details retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getKYCInquiry(@Param('inquiryId') inquiryId: string) {
    const result = await this.kycService.getKYCInquiry(inquiryId);
    
    return {
      success: true,
      data: result,
      message: 'KYC inquiry details retrieved successfully',
    };
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Persona webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Request() req: any) {
    const result = await this.kycService.handleWebhook(req.body);
    
    return {
      success: true,
      data: result,
      message: 'Webhook processed successfully',
    };
  }
}
