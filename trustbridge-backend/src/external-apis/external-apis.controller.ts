import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';
import { ExternalApisService } from './external-apis.service';

export class OCRRequestDto {
  @ApiProperty({ example: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' })
  @IsString()
  imageBuffer: string;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  mimeType: string;
}

export class GPSVerificationDto {
  @ApiProperty({ example: 6.5244 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 3.3792 })
  @IsNumber()
  lng: number;

  @ApiProperty({ example: 'Lagos, Nigeria', required: false })
  @IsOptional()
  @IsString()
  expectedLocation?: string;
}

export class DocumentVerificationDto {
  documentBuffer: Buffer;
  documentType: 'land_certificate' | 'business_license' | 'identity_document';
}

@ApiTags('External APIs')
@Controller('external')
export class ExternalApisController {
  constructor(private readonly externalApisService: ExternalApisService) {}

  @Get()
  @ApiOperation({ summary: 'Get external APIs overview' })
  @ApiResponse({ status: 200, description: 'External APIs overview' })
  async getExternalApisOverview() {
    return {
      success: true,
      data: {
        status: 'External APIs service is running',
        availableEndpoints: [
          'GET /api/external/health - Health status',
          'GET /api/external/services - Available services',
          'GET /api/external/weather - Weather data',
          'GET /api/external/market/:symbol - Market data',
          'POST /api/external/ocr/extract - OCR text extraction',
          'POST /api/external/gps/verify - GPS verification',
          'POST /api/external/document/verify - Document verification'
        ]
      },
      message: 'External APIs service is operational'
    };
  }

  @Post('ocr/extract')
  @ApiOperation({ summary: 'Extract text from image using OCR' })
  @ApiBody({ type: OCRRequestDto })
  @ApiResponse({ status: 200, description: 'Text extracted successfully' })
  async extractTextFromImage(@Body() ocrRequestDto: OCRRequestDto) {
    // Convert base64 string to Buffer
    const imageBuffer = Buffer.from(ocrRequestDto.imageBuffer, 'base64');
    const result = await this.externalApisService.extractTextFromImage(
      imageBuffer,
      ocrRequestDto.mimeType
    );
    
    return {
      success: true,
      data: result,
      message: 'Text extracted successfully',
    };
  }

  @Post('gps/verify')
  @ApiOperation({ summary: 'Verify GPS location' })
  @ApiBody({ type: GPSVerificationDto })
  @ApiResponse({ status: 200, description: 'GPS location verified successfully' })
  async verifyGPSLocation(@Body() gpsVerificationDto: GPSVerificationDto) {
    const result = await this.externalApisService.verifyGPSLocation(
      gpsVerificationDto.lat,
      gpsVerificationDto.lng,
      gpsVerificationDto.expectedLocation || ''
    );
    
    return {
      success: true,
      data: result,
      message: 'GPS location verified successfully',
    };
  }

  @Get('weather')
  @ApiOperation({ summary: 'Get weather data for location' })
  @ApiResponse({ status: 200, description: 'Weather data retrieved successfully' })
  async getWeatherData(
    @Query('lat') lat: string,
    @Query('lng') lng: string
  ) {
    const result = await this.externalApisService.getWeatherData(
      parseFloat(lat),
      parseFloat(lng)
    );
    
    return {
      success: true,
      data: result,
      message: 'Weather data retrieved successfully',
    };
  }

  @Get('market/:symbol')
  @ApiOperation({ summary: 'Get market data for symbol' })
  @ApiResponse({ status: 200, description: 'Market data retrieved successfully' })
  async getMarketData(@Param('symbol') symbol: string) {
    const result = await this.externalApisService.getMarketData(symbol);
    
    return {
      success: true,
      data: result,
      message: 'Market data retrieved successfully',
    };
  }

  @Post('document/verify')
  @ApiOperation({ summary: 'Verify document authenticity' })
  @ApiBody({ type: DocumentVerificationDto })
  @ApiResponse({ status: 200, description: 'Document verified successfully' })
  async verifyDocument(@Body() documentVerificationDto: DocumentVerificationDto) {
    const result = await this.externalApisService.verifyDocument(
      documentVerificationDto.documentBuffer,
      documentVerificationDto.documentType
    );
    
    return {
      success: true,
      data: result,
      message: 'Document verified successfully',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get external APIs health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async getHealthStatus() {
    const result = await this.externalApisService.getHealthStatus();
    
    return {
      success: true,
      data: result,
      message: 'Health status retrieved successfully',
    };
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics overview retrieved successfully' })
  async getAnalyticsOverview() {
    return {
      success: true,
      data: {
        totalAssets: 15,
        totalValue: 7500000,
        totalUsers: 25,
        totalAttestors: 15,
        totalPools: 3,
        totalVolume: 2500000,
        activeVerifications: 8,
        completedVerifications: 12,
        averageAssetValue: 500000,
        topCountries: ['Nigeria', 'Kenya', 'Ghana'],
        assetCategories: {
          agricultural: 12,
          realEstate: 2,
          vehicles: 1
        },
        monthlyGrowth: 15.5,
        successRate: 92.3
      },
      message: 'Analytics overview retrieved successfully'
    };
  }

  @Get('analytics/stats')
  @ApiOperation({ summary: 'Get analytics stats' })
  @ApiResponse({ status: 200, description: 'Analytics stats retrieved successfully' })
  async getAnalyticsStats() {
    return {
      success: true,
      data: {
        system: {
          uptime: '99.9%',
          responseTime: '120ms',
          totalRequests: 15420,
          errorRate: '0.1%'
        },
        blockchain: {
          totalTransactions: 1250,
          gasUsed: '2.5M',
          averageBlockTime: '2.1s',
          networkStatus: 'healthy'
        },
        database: {
          totalRecords: 2847,
          storageUsed: '1.2GB',
          queryPerformance: 'excellent',
          connectionPool: 'healthy'
        },
        mobile: {
          activeUsers: 156,
          appVersion: '1.2.0',
          crashRate: '0.05%',
          averageSessionTime: '8.5min'
        }
      },
      message: 'Analytics stats retrieved successfully'
    };
  }

  @Get('services')
  @ApiOperation({ summary: 'Get available external services' })
  @ApiResponse({ status: 200, description: 'Services list retrieved successfully' })
  async getAvailableServices() {
    const services = [
      {
        id: 'google_vision',
        name: 'Google Vision API',
        description: 'OCR and image analysis',
        status: 'available',
        features: ['Text extraction', 'Document analysis', 'Image classification'],
      },
      {
        id: 'google_geocoding',
        name: 'Google Geocoding API',
        description: 'GPS location verification',
        status: 'available',
        features: ['Reverse geocoding', 'Address validation', 'Location details'],
      },
      {
        id: 'openweather',
        name: 'OpenWeather API',
        description: 'Weather data and forecasts',
        status: 'available',
        features: ['Current weather', 'Forecasts', 'Historical data'],
      },
      {
        id: 'alpha_vantage',
        name: 'Alpha Vantage API',
        description: 'Financial market data',
        status: 'available',
        features: ['Stock prices', 'Commodity prices', 'Market indicators'],
      },
      {
        id: 'aws_textract',
        name: 'AWS Textract',
        description: 'Document text extraction',
        status: 'available',
        features: ['PDF processing', 'Form extraction', 'Table extraction'],
      },
    ];
    
    return {
      success: true,
      data: services,
      message: 'Services list retrieved successfully',
    };
  }
}
