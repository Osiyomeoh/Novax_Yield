import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InvestmentsService } from './investments.service';

@ApiTags('Investments')
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all investments' })
  @ApiResponse({ status: 200, description: 'List of investments' })
  async getInvestments() {
    try {
      const investments = await this.investmentsService.getAllInvestments();
      return {
        success: true,
        data: investments,
        message: `Found ${investments.length} investments`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get investments'
      };
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create new investment' })
  @ApiResponse({ status: 201, description: 'Investment created successfully' })
  async createInvestment(@Body() createInvestmentDto: any) {
    try {
      const investment = await this.investmentsService.createInvestment(createInvestmentDto);
      return {
        success: true,
        data: investment,
        message: 'Investment created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create investment'
      };
    }
  }
}
