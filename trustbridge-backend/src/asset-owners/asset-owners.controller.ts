import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AssetOwnersService } from './asset-owners.service';
import { FraudPreventionService } from './fraud-prevention.service';
import { SubmitRevenueReportDto, VerifyRevenueReportDto, DistributeRevenueDto } from './dto/revenue-report.dto';
import { FraudCheckDto } from './dto/fraud-check.dto';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('asset-owners')
export class AssetOwnersController {
  constructor(
    private readonly assetOwnersService: AssetOwnersService,
    private readonly fraudPreventionService: FraudPreventionService,
  ) {}

  /**
   * Get owner's assets and summary
   * GET /asset-owners/:ownerAddress
   */
  @Get(':ownerAddress')
  async getOwnerAssets(@Param('ownerAddress') ownerAddress: string) {
    return await this.assetOwnersService.getOwnerAssets(ownerAddress);
  }

  /**
   * Submit revenue report (AMC or Asset Owner)
   * POST /asset-owners/revenue/submit
   * 
   * AMC handles most revenue reporting for managed assets
   * Owners can still submit reports if needed
   */
  @Post('revenue/submit')
  @UseGuards(JwtAuthGuard)
  async submitRevenueReport(@Request() req: any, @Body() reportDto: SubmitRevenueReportDto) {
    const submitterAddress = req.user.walletAddress || req.user.address;
    if (!submitterAddress) {
      throw new Error('Wallet address not found in user session');
    }
    
    // Check if submitter is AMC admin
    const isAMC = req.user.roles?.includes('AMC_ADMIN') || 
                  req.user.roles?.includes('AMC_ROLE') ||
                  req.user.isAmcAdmin === true;
    
    return await this.assetOwnersService.submitRevenueReport(submitterAddress, reportDto, isAMC);
  }

  /**
   * Get revenue reports for an asset
   * GET /asset-owners/revenue/asset/:assetId
   */
  @Get('revenue/asset/:assetId')
  @UseGuards(JwtAuthGuard)
  async getAssetRevenueReports(
    @Param('assetId') assetId: string,
    @Request() req: any
  ) {
    const ownerAddress = req.user.walletAddress || req.user.address;
    return await this.assetOwnersService.getAssetRevenueReports(assetId, ownerAddress);
  }

  /**
   * Verify revenue report (AMC Admin)
   * PUT /asset-owners/revenue/verify
   */
  @Put('revenue/verify')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async verifyRevenueReport(@Request() req: any, @Body() verifyDto: VerifyRevenueReportDto) {
    const adminAddress = req.user.walletAddress || req.user.address;
    return await this.assetOwnersService.verifyRevenueReport(adminAddress, verifyDto);
  }

  /**
   * Distribute revenue (AMC Admin)
   * POST /asset-owners/revenue/distribute
   */
  @Post('revenue/distribute')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async distributeRevenue(@Request() req: any, @Body() distributeDto: DistributeRevenueDto) {
    const adminAddress = req.user.walletAddress || req.user.address;
    return await this.assetOwnersService.distributeRevenue(adminAddress, distributeDto);
  }

  /**
   * Pre-check revenue report for fraud (before submission)
   * POST /asset-owners/revenue/fraud-check
   */
  @Post('revenue/fraud-check')
  @UseGuards(JwtAuthGuard)
  async fraudCheck(@Request() req: any, @Body() checkDto: FraudCheckDto) {
    const ownerAddress = req.user.walletAddress || req.user.address;
    return await this.fraudPreventionService.validateRevenueReport(
      checkDto.assetId,
      ownerAddress,
      new Date(checkDto.periodStart),
      new Date(checkDto.periodEnd),
      checkDto.grossRevenue,
      checkDto.expenses,
      checkDto.documentHashes || []
    );
  }
}

