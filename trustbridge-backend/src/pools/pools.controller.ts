import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PoolsService } from './pools.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Pools')
@Controller('pools')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PoolsController {
  constructor(private readonly poolsService: PoolsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new investment pool' })
  @ApiResponse({ status: 201, description: 'Pool created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pool data' })
  async createPool(@Body() poolData: {
    name: string;
    description: string;
    managementFee: number;
    performanceFee: number;
  }, @Req() req: any) {
    return this.poolsService.createPool({
      name: poolData.name,
      description: poolData.description,
      managementFee: poolData.managementFee,
      performanceFee: poolData.performanceFee,
      manager: req.user.walletAddress
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all pools with optional filters' })
  @ApiResponse({ status: 200, description: 'Pools retrieved successfully' })
  async getAllPools(@Query() filters: {
    status?: string;
    riskLevel?: string;
    manager?: string;
    minAPY?: number;
    maxAPY?: number;
    limit?: number;
    offset?: number;
  }) {
    return this.poolsService.getAllPools(filters);
  }

  @Get(':poolId')
  @ApiOperation({ summary: 'Get a specific pool by ID' })
  @ApiResponse({ status: 200, description: 'Pool retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Pool not found' })
  async getPool(@Param('poolId') poolId: string) {
    return this.poolsService.getPool(poolId);
  }

  @Post(':poolId/investors')
  @ApiOperation({ summary: 'Add investor to pool' })
  @ApiResponse({ status: 201, description: 'Investor added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid investment data' })
  async addInvestor(
    @Param('poolId') poolId: string,
    @Body() investorData: {
      address: string;
      amount: number;
    }
  ) {
    return this.poolsService.addInvestor(poolId, investorData);
  }

  @Post(':poolId/distribute')
  @ApiOperation({ summary: 'Distribute rewards to pool investors' })
  @ApiResponse({ status: 200, description: 'Rewards distributed successfully' })
  @ApiResponse({ status: 403, description: 'Not pool manager' })
  async distributeRewards(
    @Param('poolId') poolId: string,
    @Body() data: { amount: number },
    @Req() req: any
  ) {
    // Verify user is pool manager
    const pool = await this.poolsService.getPool(poolId);
    if (pool.manager !== req.user.walletAddress) {
      throw new Error('Not pool manager');
    }
    
    return this.poolsService.distributeRewards(poolId, data.amount);
  }

  @Put(':poolId/status')
  @ApiOperation({ summary: 'Update pool status' })
  @ApiResponse({ status: 200, description: 'Pool status updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async updatePoolStatus(
    @Param('poolId') poolId: string,
    @Body() data: { status: string },
    @Req() req: any
  ) {
    // Verify user is pool manager or admin
    const pool = await this.poolsService.getPool(poolId);
    if (pool.manager !== req.user.walletAddress && !req.user.isAdmin) {
      throw new Error('Not authorized');
    }
    
    return this.poolsService.updatePoolStatus(poolId, data.status);
  }

  @Get(':poolId/performance')
  @ApiOperation({ summary: 'Get pool performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPoolPerformance(@Param('poolId') poolId: string) {
    return this.poolsService.getPoolPerformance(poolId);
  }
}
