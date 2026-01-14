import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SmartVerificationService } from './smart-verification.service';

export class SmartVerificationRequestDto {
  assetId: string;
  evidence: any;
}

@ApiTags('Smart Verification')
@Controller('verification/smart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SmartVerificationController {
  constructor(private readonly smartVerificationService: SmartVerificationService) {}

  @Post('process')
  @ApiOperation({ summary: 'Process smart verification for an asset' })
  @ApiResponse({ status: 200, description: 'Verification processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async processSmartVerification(@Body() request: SmartVerificationRequestDto) {
    try {
      const result = await this.smartVerificationService.processSmartVerification(
        request.assetId,
        request.evidence
      );

      return {
        success: true,
        data: result,
        message: `Asset assigned to ${result.tier.name} verification tier`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Smart verification failed',
        error: error.message
      };
    }
  }

  @Get('status/:assetId')
  @ApiOperation({ summary: 'Get verification status for an asset' })
  @ApiResponse({ status: 200, description: 'Verification status retrieved successfully' })
  async getVerificationStatus(@Param('assetId') assetId: string) {
    try {
      const status = await this.smartVerificationService.getVerificationStatus(assetId);
      
      if (!status) {
        return {
          success: false,
          message: 'Verification status not found'
        };
      }

      return {
        success: true,
        data: status,
        message: 'Verification status retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get verification status',
        error: error.message
      };
    }
  }

  @Get('tiers')
  @ApiOperation({ summary: 'Get available verification tiers' })
  @ApiResponse({ status: 200, description: 'Verification tiers retrieved successfully' })
  async getVerificationTiers() {
    const tiers = [
      {
        name: 'INSTANT',
        maxAssetValue: 10000,
        maxProcessingTime: 5,
        requiresManualReview: false,
        confidenceThreshold: 0.85,
        description: 'Instant verification for low-value, high-confidence assets',
        benefits: [
          'Approved in under 5 minutes',
          'No manual review required',
          'Immediate tokenization',
          'Available for investment instantly'
        ]
      },
      {
        name: 'FAST',
        maxAssetValue: 100000,
        maxProcessingTime: 30,
        requiresManualReview: false,
        confidenceThreshold: 0.75,
        description: 'Fast verification for medium-value assets with good documentation',
        benefits: [
          'Approved in under 30 minutes',
          'Automated verification',
          'Quick tokenization',
          'Available for investment within hours'
        ]
      },
      {
        name: 'STANDARD',
        maxAssetValue: Infinity,
        maxProcessingTime: 1440,
        requiresManualReview: true,
        confidenceThreshold: 0.6,
        description: 'Standard verification with manual review for high-value or complex assets',
        benefits: [
          'Thorough verification process',
          'Expert manual review',
          'Highest security standards',
          'Suitable for high-value assets'
        ]
      }
    ];

    return {
      success: true,
      data: tiers,
      message: 'Verification tiers retrieved successfully'
    };
  }
}
