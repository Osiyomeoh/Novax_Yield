import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssetOwner, OwnershipRecord, RevenueReport, RevenueReportStatus, AssetOwnerDocument } from '../schemas/asset-owner.schema';
import { SubmitRevenueReportDto, VerifyRevenueReportDto, DistributeRevenueDto } from './dto/revenue-report.dto';
import { MantleService } from '../mantle/mantle.service';
import { AMCPoolsService } from '../amc-pools/amc-pools.service';
import { FraudPreventionService } from './fraud-prevention.service';
import { ethers } from 'ethers';

@Injectable()
export class AssetOwnersService {
  private readonly logger = new Logger(AssetOwnersService.name);

  constructor(
    @InjectModel(AssetOwner.name) private assetOwnerModel: Model<AssetOwnerDocument>,
    @InjectModel(OwnershipRecord.name) private ownershipRecordModel: Model<OwnershipRecord>,
    @InjectModel(RevenueReport.name) private revenueReportModel: Model<RevenueReport>,
    private mantleService: MantleService,
    private amcPoolsService: AMCPoolsService,
    private fraudPreventionService: FraudPreventionService,
  ) {}

  /**
   * Initialize ownership record (called when asset is created)
   */
  async initializeOwnership(assetId: string, ownerAddress: string): Promise<void> {
    try {
      await this.registerAssetOwnership(assetId, ownerAddress, 0);
    } catch (error) {
      this.logger.warn(`Failed to initialize ownership (may already exist): ${error.message}`);
    }
  }

  /**
   * Get or create asset owner record
   */
  async getOrCreateOwner(ownerAddress: string): Promise<AssetOwnerDocument> {
    let owner = await this.assetOwnerModel.findOne({ ownerAddress: ownerAddress.toLowerCase() });
    
    if (!owner) {
      owner = new this.assetOwnerModel({
        ownerAddress: ownerAddress.toLowerCase(),
        assetIds: [],
        ownershipRecords: [],
        totalCapitalReceived: 0,
        totalRevenueReceived: 0,
        revenueReports: [],
      });
      await owner.save();
      this.logger.log(`Created new asset owner record for ${ownerAddress}`);
    }
    
    return owner;
  }

  /**
   * Register asset ownership when asset is created
   */
  async registerAssetOwnership(assetId: string, ownerAddress: string, totalValue: number): Promise<void> {
    try {
      const owner = await this.getOrCreateOwner(ownerAddress);
      
      // Check if asset already registered
      if (owner.assetIds.includes(assetId)) {
        this.logger.warn(`Asset ${assetId} already registered for owner ${ownerAddress}`);
        return;
      }

      // Create ownership record (store as embedded document in owner)
      const ownershipRecord = {
        assetId,
        ownerAddress: ownerAddress.toLowerCase(),
        ownershipPercentage: 100, // Initially 100% owned
        tokenizedPercentage: 0,
        capitalReceived: 0,
        totalRevenueReceived: 0,
        poolIds: [],
        revenueShareHistory: {},
      };

      // Update owner record
      owner.assetIds.push(assetId);
      owner.ownershipRecords.push(ownershipRecord as any);
      await owner.save();

      this.logger.log(`Registered asset ${assetId} for owner ${ownerAddress}`);
    } catch (error) {
      this.logger.error(`Failed to register asset ownership: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update ownership when asset is tokenized
   */
  async updateOwnershipAfterTokenization(
    assetId: string,
    tokenizedPercentage: number,
    capitalRaised: number,
    poolId: string
  ): Promise<void> {
    try {
      // Get asset from blockchain to find owner
      const asset = await this.mantleService.getAsset(assetId);
      const ownerAddress = asset.originalOwner || asset.currentOwner;

      if (!ownerAddress) {
        throw new NotFoundException(`Owner not found for asset ${assetId}`);
      }

      const owner = await this.getOrCreateOwner(ownerAddress);
      const ownershipRecord = owner.ownershipRecords.find(
        (record: any) => record.assetId === assetId
      );

      if (!ownershipRecord) {
        throw new NotFoundException(`Ownership record not found for asset ${assetId}`);
      }

      // Update ownership percentages
      ownershipRecord.tokenizedPercentage = tokenizedPercentage;
      ownershipRecord.ownershipPercentage = 100 - tokenizedPercentage;
      ownershipRecord.capitalReceived += capitalRaised;
      ownershipRecord.poolIds.push(poolId);

      // Update owner totals
      owner.totalCapitalReceived += capitalRaised;

      await owner.save();
      this.logger.log(`Updated ownership for asset ${assetId}: ${ownershipRecord.ownershipPercentage}% owner, ${tokenizedPercentage}% tokenized`);
    } catch (error) {
      this.logger.error(`Failed to update ownership after tokenization: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit revenue report (called by AMC or asset owner)
   * AMC handles most revenue reporting for managed assets
   */
  async submitRevenueReport(submitterAddress: string, reportDto: SubmitRevenueReportDto, isAMC: boolean = false): Promise<RevenueReport> {
    try {
      // Get asset to find owner
      const asset = await this.mantleService.getAsset(reportDto.assetId);
      const ownerAddress = asset.originalOwner || asset.currentOwner;
      
      if (!ownerAddress) {
        throw new BadRequestException(`Asset ${reportDto.assetId} has no owner`);
      }

      // If AMC is submitting, verify AMC manages this asset
      if (isAMC) {
        // Check if asset has currentAMC field
        const managingAMC = asset.currentAMC || '';
        if (managingAMC && managingAMC.toLowerCase() !== submitterAddress.toLowerCase()) {
          throw new BadRequestException(`AMC ${submitterAddress} does not manage asset ${reportDto.assetId}. Managing AMC: ${managingAMC}`);
        }
        // Also verify asset is in ACTIVE_AMC_MANAGED status
        if (asset.status !== 6) { // ACTIVE_AMC_MANAGED
          throw new BadRequestException(`Asset ${reportDto.assetId} is not in ACTIVE_AMC_MANAGED status. Current status: ${asset.status}`);
        }
      } else {
        // If owner is submitting, verify ownership
        if (ownerAddress.toLowerCase() !== submitterAddress.toLowerCase()) {
          throw new BadRequestException(`Asset ${reportDto.assetId} does not belong to owner ${submitterAddress}`);
        }
      }

      const owner = await this.getOrCreateOwner(ownerAddress.toLowerCase());
      
      // Verify asset belongs to owner (for tracking)
      if (!owner.assetIds.includes(reportDto.assetId)) {
        // Add asset if not tracked yet
        owner.assetIds.push(reportDto.assetId);
        await owner.save();
      }

      // 🛡️ FRAUD PREVENTION: Comprehensive validation
      const fraudCheck = await this.fraudPreventionService.validateRevenueReport(
        reportDto.assetId,
        ownerAddress, // Owner address for ownership verification
        new Date(reportDto.periodStart),
        new Date(reportDto.periodEnd),
        reportDto.grossRevenue,
        reportDto.expenses,
        reportDto.documentHashes || []
      );

      // AMC reports have lower risk threshold (score >= 40 vs 50)
      const minScore = isAMC ? 40 : 50;
      
      // Block submission if fraud check fails
      if (!fraudCheck.passed || fraudCheck.score < minScore) {
        await this.fraudPreventionService.logFraudAttempt(
          'REVENUE_REPORT_SUBMISSION',
          {
            assetId: reportDto.assetId,
            ownerAddress,
            submitterAddress,
            submittedBy: isAMC ? 'AMC' : 'OWNER',
            periodStart: reportDto.periodStart,
            periodEnd: reportDto.periodEnd,
            grossRevenue: reportDto.grossRevenue,
            expenses: reportDto.expenses,
            errors: fraudCheck.errors,
            riskLevel: fraudCheck.riskLevel,
            score: fraudCheck.score
          },
          fraudCheck.riskLevel
        );

        throw new BadRequestException(
          `Revenue report validation failed: ${fraudCheck.errors.join('; ')}. ` +
          `Risk Level: ${fraudCheck.riskLevel}, Score: ${fraudCheck.score}/100`
        );
      }

      // Log warnings but allow submission (AMC will review)
      if (fraudCheck.warnings.length > 0) {
        this.logger.warn(`⚠️ Revenue report has warnings: ${fraudCheck.warnings.join('; ')}`);
      }

      // Calculate net profit
      const netProfit = reportDto.grossRevenue - reportDto.expenses;

      if (netProfit < 0) {
        throw new BadRequestException('Net profit cannot be negative');
      }

      // Create revenue report with fraud check metadata
      const reportId = `REV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const revenueReport = new this.revenueReportModel({
        reportId,
        assetId: reportDto.assetId,
        ownerAddress: ownerAddress.toLowerCase(),
        periodStart: new Date(reportDto.periodStart),
        periodEnd: new Date(reportDto.periodEnd),
        grossRevenue: reportDto.grossRevenue,
        expenses: reportDto.expenses,
        netProfit,
        status: RevenueReportStatus.SUBMITTED,
        documentHashes: reportDto.documentHashes || [],
        metadata: {
          ...(reportDto.metadata || {}),
          submittedBy: isAMC ? 'AMC' : 'OWNER',
          amcAddress: isAMC ? submitterAddress.toLowerCase() : undefined,
          fraudCheck: {
            riskLevel: fraudCheck.riskLevel,
            score: fraudCheck.score,
            warnings: fraudCheck.warnings,
            checkedAt: new Date().toISOString()
          }
        },
      });

      await revenueReport.save();

      // Add to owner's reports (store reference)
      owner.revenueReports.push(revenueReport as any);
      await owner.save();

      this.logger.log(`Revenue report submitted: ${reportId} for asset ${reportDto.assetId}`);
      return revenueReport;
    } catch (error) {
      this.logger.error(`Failed to submit revenue report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify revenue report (called by AMC admin)
   */
  async verifyRevenueReport(adminAddress: string, verifyDto: VerifyRevenueReportDto): Promise<RevenueReport> {
    try {
      const report = await this.revenueReportModel.findOne({ reportId: verifyDto.reportId });
      
      if (!report) {
        throw new NotFoundException(`Revenue report ${verifyDto.reportId} not found`);
      }

      if (report.status !== RevenueReportStatus.SUBMITTED) {
        throw new BadRequestException(`Report is not in SUBMITTED status. Current status: ${report.status}`);
      }

      // Update report status
      report.status = verifyDto.status;
      report.verifiedBy = adminAddress.toLowerCase();
      report.verifiedAt = new Date();

      if (verifyDto.status === RevenueReportStatus.REJECTED) {
        report.rejectionReason = verifyDto.rejectionReason || 'Rejected by AMC';
      }

      if (verifyDto.verifiedAmount !== undefined) {
        report.netProfit = verifyDto.verifiedAmount - report.expenses;
      }

      await report.save();
      this.logger.log(`Revenue report ${verifyDto.reportId} verified by ${adminAddress}: ${verifyDto.status}`);
      
      return report;
    } catch (error) {
      this.logger.error(`Failed to verify revenue report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Distribute revenue (called by AMC admin after verification)
   */
  async distributeRevenue(adminAddress: string, distributeDto: DistributeRevenueDto): Promise<any> {
    try {
      const report = await this.revenueReportModel.findOne({ reportId: distributeDto.reportId });
      
      if (!report) {
        throw new NotFoundException(`Revenue report ${distributeDto.reportId} not found`);
      }

      // 🛡️ FRAUD PREVENTION: Verify distribution before executing
      const distributionCheck = await this.fraudPreventionService.verifyDistribution(
        distributeDto.reportId,
        distributeDto.totalRevenue
      );

      if (!distributionCheck.passed) {
        await this.fraudPreventionService.logFraudAttempt(
          'REVENUE_DISTRIBUTION',
          {
            reportId: distributeDto.reportId,
            adminAddress,
            totalRevenue: distributeDto.totalRevenue,
            errors: distributionCheck.errors
          },
          'HIGH'
        );

        throw new BadRequestException(
          `Distribution validation failed: ${distributionCheck.errors.join('; ')}`
        );
      }

      if (report.status !== RevenueReportStatus.VERIFIED) {
        throw new BadRequestException(`Report must be VERIFIED before distribution. Current status: ${report.status}`);
      }

      const owner = await this.getOrCreateOwner(report.ownerAddress);
      const ownershipRecord = owner.ownershipRecords.find(
        (record: any) => record.assetId === report.assetId
      );

      if (!ownershipRecord) {
        throw new NotFoundException(`Ownership record not found for asset ${report.assetId}`);
      }

      // Calculate revenue split
      const ownerPercentage = ownershipRecord.ownershipPercentage;
      const poolPercentage = ownershipRecord.tokenizedPercentage;

      const ownerShare = (distributeDto.totalRevenue * ownerPercentage) / 100;
      const poolShare = (distributeDto.totalRevenue * poolPercentage) / 100;

      this.logger.log(`Distributing revenue for asset ${report.assetId}:`);
      this.logger.log(`  Total Revenue: ${distributeDto.totalRevenue}`);
      this.logger.log(`  Owner Share (${ownerPercentage}%): ${ownerShare}`);
      this.logger.log(`  Pool Share (${poolPercentage}%): ${poolShare}`);

      // Transfer owner's share on-chain
      const ownerShareWei = ethers.parseEther(ownerShare.toString());
      const ownerTransferResult = await this.mantleService.transferTrustTokens(
        adminAddress, // From treasury/admin wallet
        report.ownerAddress,
        ownerShareWei
      );

      // Distribute pool's share via dividend distribution
      if (poolShare > 0 && ownershipRecord.poolIds.length > 0) {
        // Find the pool for this asset
        const poolId = ownershipRecord.poolIds[0]; // Use first pool (can be enhanced to support multiple pools)
        
        await this.amcPoolsService.distributeDividend(
          {
            poolId,
            amount: poolShare,
            description: distributeDto.description || `Revenue distribution for asset ${report.assetId} - Period: ${report.periodStart} to ${report.periodEnd}`,
          },
          adminAddress
        );
      }

      // Update records
      report.status = RevenueReportStatus.DISTRIBUTED;
      report.distributedAt = new Date();
      report.distributionTxHash = ownerTransferResult.txHash;

      ownershipRecord.totalRevenueReceived += ownerShare;
      const monthKey = `${report.periodStart.getFullYear()}-${report.periodStart.getMonth() + 1}`;
      ownershipRecord.revenueShareHistory[monthKey] = (ownershipRecord.revenueShareHistory[monthKey] || 0) + ownerShare;

      owner.totalRevenueReceived += ownerShare;

      await report.save();
      await owner.save();

      this.logger.log(`Revenue distributed successfully. Owner received: ${ownerShare}, Pool share: ${poolShare}`);

      return {
        success: true,
        ownerShare,
        poolShare,
        ownerTransferTxHash: ownerTransferResult.txHash,
        reportId: report.reportId,
      };
    } catch (error) {
      this.logger.error(`Failed to distribute revenue: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get owner's assets and summary
   */
  async getOwnerAssets(ownerAddress: string): Promise<any> {
    try {
      const owner = await this.assetOwnerModel.findOne({ ownerAddress: ownerAddress.toLowerCase() });
      
      if (!owner) {
        return {
          ownerAddress,
          totalAssets: 0,
          totalCapitalReceived: 0,
          totalRevenueReceived: 0,
          assets: [],
        };
      }

      // Fetch detailed asset information
      const assetsDetails = await Promise.all(
        owner.assetIds.map(async (assetId) => {
          try {
            const asset = await this.mantleService.getAsset(assetId);
            const ownershipRecord = owner.ownershipRecords.find(
              (record: any) => record.assetId === assetId
            );

            return {
              assetId,
              name: asset.name,
              totalValue: ethers.formatEther(asset.totalValue || 0n),
              ownershipPercentage: ownershipRecord?.ownershipPercentage || 0,
              tokenizedPercentage: ownershipRecord?.tokenizedPercentage || 0,
              capitalReceived: ownershipRecord?.capitalReceived || 0,
              totalRevenueReceived: ownershipRecord?.totalRevenueReceived || 0,
              poolIds: ownershipRecord?.poolIds || [],
              status: asset.status,
            };
          } catch (error) {
            this.logger.warn(`Failed to fetch asset ${assetId}: ${error.message}`);
            return null;
          }
        })
      );

      return {
        ownerAddress: owner.ownerAddress,
        email: owner.email,
        name: owner.name,
        totalAssets: owner.assetIds.length,
        totalCapitalReceived: owner.totalCapitalReceived,
        totalRevenueReceived: owner.totalRevenueReceived,
        assets: assetsDetails.filter(asset => asset !== null),
        revenueReports: owner.revenueReports.map((report: any) => ({
          reportId: report.reportId,
          assetId: report.assetId,
          periodStart: report.periodStart,
          periodEnd: report.periodEnd,
          netProfit: report.netProfit,
          status: report.status,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get owner assets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get revenue reports for an asset
   */
  async getAssetRevenueReports(assetId: string, ownerAddress?: string): Promise<RevenueReport[]> {
    try {
      const query: any = { assetId };
      if (ownerAddress) {
        query.ownerAddress = ownerAddress.toLowerCase();
      }

      return await this.revenueReportModel.find(query).sort({ periodStart: -1 });
    } catch (error) {
      this.logger.error(`Failed to get revenue reports: ${error.message}`);
      throw error;
    }
  }
}

