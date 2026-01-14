import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';

@ApiTags('Portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  @ApiOperation({ summary: 'Get user portfolio or portfolio summary' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID for specific portfolio' })
  @ApiResponse({ status: 200, description: 'User portfolio or portfolio summary' })
  async getPortfolio(@Query('userId') userId?: string) {
    try {
      let data;
      if (userId) {
        data = await this.portfolioService.getUserPortfolio(userId);
      } else {
        data = await this.portfolioService.getPortfolioSummary();
      }
      
      return {
        success: true,
        data,
        message: userId ? 'User portfolio retrieved successfully' : 'Portfolio summary retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get portfolio'
      };
    }
  }
}
