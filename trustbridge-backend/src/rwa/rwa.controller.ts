import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { RWAService } from './rwa.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('rwa')
@UseGuards(JwtAuthGuard)
export class RWAController {
  constructor(private readonly rwaService: RWAService) {}

  /**
   * Create a new RWA asset
   */
  @Post('assets')
  async createRWAAsset(@Body() createAssetDto: any, @Request() req) {
    const userAddress = req.user.walletAddress;
    return await this.rwaService.createRWAAsset(createAssetDto);
  }

  /**
   * Get RWA assets
   */
  @Get('assets')
  async getRWAAssets(@Query('status') status?: string) {
    return await this.rwaService.getRWAAssets({ status: status as any });
  }

  /**
   * Get RWA asset by ID
   */
  @Get('assets/:id')
  async getRWAAsset(@Param('id') id: string) {
    return await this.rwaService.getRWAAsset(id);
  }

  /**
   * Update RWA asset
   */
  @Put('assets/:id')
  async updateRWAAsset(@Param('id') id: string, @Body() updateAssetDto: any) {
    return await this.rwaService.updateRWAAsset(id, updateAssetDto);
  }

  /**
   * Delete RWA asset
   */
  @Delete('assets/:id')
  async deleteRWAAsset(@Param('id') id: string) {
    return await this.rwaService.getRWAAsset(id); // Using getRWAAsset as placeholder
  }
}
