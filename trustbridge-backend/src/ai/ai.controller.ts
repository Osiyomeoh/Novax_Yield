import { Controller, Post, Get, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AIService, AIQueryRequest, AIQueryResponse } from './ai.service';

export class AIQueryDto {
  @IsString()
  query: string;
  
  @IsOptional()
  @IsObject()
  context?: {
    userProfile?: any;
    currentAsset?: any;
    portfolio?: any;
    marketData?: any;
  };
}

export class AssetAnalysisDto {
  assetData: any;
}

export class PortfolioOptimizationDto {
  portfolioData: any;
}

export class MarketInsightsDto {
  marketType: string;
}

@ApiTags('AI')
@Controller('ai')
// @UseGuards(JwtAuthGuard) // Temporarily disabled for testing
// @ApiBearerAuth()
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('query')
  @ApiOperation({ summary: 'Process user investment query with AI' })
  @ApiResponse({ status: 200, description: 'AI response generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: AIQueryDto })
  async processQuery(@Body() queryDto: AIQueryDto, @Request() req: any): Promise<AIQueryResponse> {
    try {
      const request: AIQueryRequest = {
        query: queryDto.query,
        userId: 'test-user', // Fixed user for testing
        context: {
          ...queryDto.context,
          userProfile: { id: 'test-user', email: 'test@example.com' }
        }
      };

      return await this.aiService.processInvestmentQuery(request);
    } catch (error) {
      throw new HttpException(
        'Failed to process AI query',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analyze-asset')
  @ApiOperation({ summary: 'Analyze asset data with AI' })
  @ApiResponse({ status: 200, description: 'Asset analysis completed' })
  @ApiBody({ type: AssetAnalysisDto })
  async analyzeAsset(@Body() analysisDto: AssetAnalysisDto): Promise<AIQueryResponse> {
    try {
      return await this.aiService.analyzeAsset(analysisDto.assetData);
    } catch (error) {
      throw new HttpException(
        'Failed to analyze asset',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('optimize-portfolio')
  @ApiOperation({ summary: 'Get AI-powered portfolio optimization suggestions' })
  @ApiResponse({ status: 200, description: 'Portfolio optimization completed' })
  @ApiBody({ type: PortfolioOptimizationDto })
  async optimizePortfolio(@Body() portfolioDto: PortfolioOptimizationDto): Promise<AIQueryResponse> {
    try {
      return await this.aiService.optimizePortfolio(portfolioDto.portfolioData);
    } catch (error) {
      throw new HttpException(
        'Failed to optimize portfolio',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('market-insights')
  @ApiOperation({ summary: 'Generate AI-powered market insights' })
  @ApiResponse({ status: 200, description: 'Market insights generated' })
  @ApiBody({ type: MarketInsightsDto })
  async generateMarketInsights(@Body() insightsDto: MarketInsightsDto): Promise<AIQueryResponse> {
    try {
      return await this.aiService.generateMarketInsights(insightsDto.marketType);
    } catch (error) {
      throw new HttpException(
        'Failed to generate market insights',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Check AI service health' })
  @ApiResponse({ status: 200, description: 'AI service health status' })
  async healthCheck() {
    return await this.aiService.healthCheck();
  }

  @Post('test-training')
  @ApiOperation({ summary: 'Test AI with TrustBridge training context' })
  @ApiResponse({ status: 200, description: 'AI response with TrustBridge context' })
  @ApiBody({ type: AIQueryDto })
  async testTraining(@Body() queryDto: AIQueryDto): Promise<AIQueryResponse> {
    try {
      const request: AIQueryRequest = {
        query: queryDto.query,
        userId: 'test-user', // Fixed user for testing
        context: {
          ...queryDto.context,
          userProfile: { id: 'test-user', email: 'test@example.com' }
        }
      };

      return await this.aiService.processInvestmentQuery(request);
    } catch (error) {
      throw new HttpException(
        'Failed to test AI training',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('quick-advice')
  @ApiOperation({ summary: 'Get quick investment advice' })
  @ApiResponse({ status: 200, description: 'Quick advice generated' })
  async getQuickAdvice(@Body() body: { question: string }, @Request() req: any): Promise<AIQueryResponse> {
    try {
      const request: AIQueryRequest = {
        query: body.question,
        userId: req.user?.id,
        context: {
          userProfile: req.user
        }
      };

      return await this.aiService.processInvestmentQuery(request);
    } catch (error) {
      throw new HttpException(
        'Failed to get quick advice',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get user AI usage statistics' })
  @ApiResponse({ status: 200, description: 'AI usage statistics retrieved' })
  async getUserAIUsage(@Request() req: any) {
    try {
      return await this.aiService.getUserAIUsage(req.user?.id || 'test-user');
    } catch (error) {
      throw new HttpException(
        'Failed to get AI usage statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('pricing')
  @ApiOperation({ summary: 'Get AI service limits information' })
  @ApiResponse({ status: 200, description: 'AI limits information retrieved' })
  async getAILimits() {
    try {
      return {
        dailyLimit: 50,
        monthlyLimit: 1000,
        message: 'AI usage limits (free within limits)'
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get AI limits information',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('generate-image')
  @ApiOperation({ summary: 'Generate image with text prompt using Google AI Studio' })
  @ApiResponse({ status: 200, description: 'Image generated successfully' })
  @ApiBody({ schema: { properties: { prompt: { type: 'string' } } } })
  async generateImage(@Body() body: { prompt: string }, @Request() req: any) {
    try {
      return await this.aiService.generateImage(body.prompt, req.user?.id);
    } catch (error) {
      throw new HttpException(
        'Failed to generate image',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analyze-image')
  @ApiOperation({ summary: 'Analyze and extract data from images' })
  @ApiResponse({ status: 200, description: 'Image analyzed successfully' })
  @ApiBody({ schema: { properties: { imageBase64: { type: 'string' }, prompt: { type: 'string' } } } })
  async analyzeImage(@Body() body: { imageBase64: string; prompt: string }, @Request() req: any) {
    try {
      const result = await this.aiService.analyzeImage(body.imageBase64, body.prompt, req.user?.id);
      return { analysis: result };
    } catch (error) {
      throw new HttpException(
        'Failed to analyze image',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('transcribe-audio')
  @ApiOperation({ summary: 'Transcribe audio to text' })
  @ApiResponse({ status: 200, description: 'Audio transcribed successfully' })
  @ApiBody({ schema: { properties: { audioBase64: { type: 'string' }, mimeType: { type: 'string' } } } })
  async transcribeAudio(@Body() body: { audioBase64: string; mimeType: string }, @Request() req: any) {
    try {
      const result = await this.aiService.transcribeAudio(body.audioBase64, body.mimeType, req.user?.id);
      return { transcription: result };
    } catch (error) {
      throw new HttpException(
        'Failed to transcribe audio',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('generate-video')
  @ApiOperation({ summary: 'Generate video from text prompt' })
  @ApiResponse({ status: 200, description: 'Video generated successfully' })
  @ApiBody({ schema: { properties: { prompt: { type: 'string' } } } })
  async generateVideo(@Body() body: { prompt: string }, @Request() req: any) {
    try {
      return await this.aiService.generateVideo(body.prompt, req.user?.id);
    } catch (error) {
      throw new HttpException(
        'Failed to generate video',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('search')
  @ApiOperation({ summary: 'Get real-time Google Search results' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  @ApiBody({ schema: { properties: { query: { type: 'string' } } } })
  async getSearchResults(@Body() body: { query: string }, @Request() req: any) {
    try {
      const results = await this.aiService.getSearchResults(body.query, req.user?.id);
      return { searchResults: results };
    } catch (error) {
      throw new HttpException(
        'Failed to get search results',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('maps')
  @ApiOperation({ summary: 'Get Google Maps data' })
  @ApiResponse({ status: 200, description: 'Maps data retrieved successfully' })
  @ApiBody({ schema: { properties: { query: { type: 'string' } } } })
  async getMapsData(@Body() body: { query: string }, @Request() req: any) {
    try {
      const results = await this.aiService.getMapsData(body.query, req.user?.id);
      return { mapsData: results };
    } catch (error) {
      throw new HttpException(
        'Failed to get maps data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analyze-rwa-asset')
  @ApiOperation({ summary: 'Analyze RWA asset with AI validation, pricing, and risk assessment' })
  @ApiResponse({ status: 200, description: 'RWA asset analysis completed successfully' })
  @ApiBody({ schema: { 
    properties: { 
      assetData: { type: 'object' },
      documents: { type: 'array' }
    } 
  } })
  async analyzeRWAAsset(@Body() body: { assetData: any; documents: any[] }, @Request() req: any) {
    try {
      const analysis = await this.aiService.analyzeAsset(
        body.assetData
      );
      return { analysis };
    } catch (error) {
      throw new HttpException(
        'Failed to analyze RWA asset',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analyze-digital-asset')
  @ApiOperation({ summary: 'Analyze digital asset with AI content validation and pricing' })
  @ApiResponse({ status: 200, description: 'Digital asset analysis completed successfully' })
  @ApiBody({ schema: { 
    properties: { 
      assetData: { type: 'object' },
      contentFiles: { type: 'array' }
    } 
  } })
  async analyzeDigitalAsset(@Body() body: { assetData: any; contentFiles: any[] }, @Request() req: any) {
    try {
      const analysis = await this.aiService.analyzeAsset(
        body.assetData
      );
      return { analysis };
    } catch (error) {
      throw new HttpException(
        'Failed to analyze digital asset',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
