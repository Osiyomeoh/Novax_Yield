import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RevenueReport, RevenueReportStatus } from '../schemas/asset-owner.schema';
import { MantleService } from '../mantle/mantle.service';
import { ethers } from 'ethers';

export interface FraudCheckResult {
  passed: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  warnings: string[];
  errors: string[];
  score: number; // 0-100, higher is better
}

@Injectable()
export class FraudPreventionService {
  private readonly logger = new Logger(FraudPreventionService.name);

  constructor(
    @InjectModel(RevenueReport.name) private revenueReportModel: Model<RevenueReport>,
    private mantleService: MantleService,
  ) {}

  /**
   * Comprehensive fraud check for revenue report
   */
  async validateRevenueReport(
    assetId: string,
    ownerAddress: string,
    periodStart: Date,
    periodEnd: Date,
    grossRevenue: number,
    expenses: number,
    documentHashes: string[]
  ): Promise<FraudCheckResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let riskScore = 100;

    // 1. Check for duplicate reports (same period)
    const duplicateCheck = await this.checkDuplicateReport(assetId, periodStart, periodEnd);
    if (!duplicateCheck.passed) {
      errors.push(duplicateCheck.reason);
      riskScore -= 50;
    }

    // 2. Verify asset ownership
    const ownershipCheck = await this.verifyAssetOwnership(assetId, ownerAddress);
    if (!ownershipCheck.passed) {
      errors.push(ownershipCheck.reason);
      riskScore -= 50;
    }

    // 3. Validate revenue amounts (reasonableness checks)
    const amountCheck = await this.validateRevenueAmounts(assetId, grossRevenue, expenses);
    if (!amountCheck.passed) {
      warnings.push(...amountCheck.warnings);
      errors.push(...amountCheck.errors);
      riskScore -= amountCheck.riskPenalty;
    }

    // 4. Check period validity
    const periodCheck = this.validatePeriod(periodStart, periodEnd);
    if (!periodCheck.passed) {
      errors.push(...periodCheck.errors);
      riskScore -= 20;
    }

    // 5. Verify documents exist and are valid
    const documentCheck = await this.validateDocuments(documentHashes);
    if (!documentCheck.passed) {
      warnings.push(...documentCheck.warnings);
      errors.push(...documentCheck.errors);
      riskScore -= documentCheck.riskPenalty;
    }

    // 6. Cross-reference with historical data
    const historicalCheck = await this.checkHistoricalConsistency(assetId, grossRevenue, periodStart, periodEnd);
    if (!historicalCheck.passed) {
      warnings.push(...historicalCheck.warnings);
      riskScore -= historicalCheck.riskPenalty;
    }

    // 7. Check for suspicious patterns
    const patternCheck = await this.detectSuspiciousPatterns(assetId, ownerAddress, grossRevenue, expenses);
    if (!patternCheck.passed) {
      warnings.push(...patternCheck.warnings);
      riskScore -= patternCheck.riskPenalty;
    }

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    if (riskScore >= 80) riskLevel = 'LOW';
    else if (riskScore >= 50) riskLevel = 'MEDIUM';
    else riskLevel = 'HIGH';

    const passed = errors.length === 0 && riskScore >= 50;

    return {
      passed,
      riskLevel,
      warnings,
      errors,
      score: Math.max(0, riskScore),
    };
  }

  /**
   * Check for duplicate revenue reports in the same period
   */
  private async checkDuplicateReport(
    assetId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ passed: boolean; reason?: string }> {
    const existingReport = await this.revenueReportModel.findOne({
      assetId,
      periodStart: { $lte: periodEnd },
      periodEnd: { $gte: periodStart },
      status: { $in: [RevenueReportStatus.SUBMITTED, RevenueReportStatus.VERIFIED, RevenueReportStatus.DISTRIBUTED] }
    });

    if (existingReport) {
      return {
        passed: false,
        reason: `Duplicate report detected. Report ${existingReport.reportId} already exists for overlapping period (${existingReport.periodStart.toISOString()} to ${existingReport.periodEnd.toISOString()})`
      };
    }

    return { passed: true };
  }

  /**
   * Verify asset ownership on-chain
   */
  private async verifyAssetOwnership(
    assetId: string,
    ownerAddress: string
  ): Promise<{ passed: boolean; reason?: string }> {
    try {
      const asset = await this.mantleService.getAsset(assetId);
      
      if (!asset) {
        return {
          passed: false,
          reason: `Asset ${assetId} not found on blockchain`
        };
      }

      const originalOwner = asset.originalOwner?.toLowerCase();
      const currentOwner = asset.currentOwner?.toLowerCase();
      const claimedOwner = ownerAddress.toLowerCase();

      // Check if owner matches originalOwner or currentOwner
      if (originalOwner !== claimedOwner && currentOwner !== claimedOwner) {
        return {
          passed: false,
          reason: `Ownership mismatch. Asset originalOwner: ${originalOwner}, currentOwner: ${currentOwner}, claimed: ${claimedOwner}`
        };
      }

      return { passed: true };
    } catch (error) {
      this.logger.error(`Failed to verify asset ownership: ${error.message}`);
      return {
        passed: false,
        reason: `Failed to verify ownership on blockchain: ${error.message}`
      };
    }
  }

  /**
   * Validate revenue amounts for reasonableness
   */
  private async validateRevenueAmounts(
    assetId: string,
    grossRevenue: number,
    expenses: number
  ): Promise<{ passed: boolean; warnings: string[]; errors: string[]; riskPenalty: number }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let riskPenalty = 0;

    // Check for negative values
    if (grossRevenue < 0) {
      errors.push('Gross revenue cannot be negative');
      riskPenalty += 30;
    }

    if (expenses < 0) {
      errors.push('Expenses cannot be negative');
      riskPenalty += 30;
    }

    // Check net profit is positive
    const netProfit = grossRevenue - expenses;
    if (netProfit < 0) {
      warnings.push('Net profit is negative. Asset may be operating at a loss.');
      riskPenalty += 10;
    }

    // Check expense ratio (expenses should not exceed revenue significantly)
    if (expenses > grossRevenue * 0.9) {
      warnings.push(`Expense ratio is very high (${((expenses / grossRevenue) * 100).toFixed(1)}%). This may indicate operational issues.`);
      riskPenalty += 15;
    }

    // Check for suspiciously round numbers (may indicate fabricated data)
    if (grossRevenue % 10000 === 0 && grossRevenue > 100000) {
      warnings.push('Gross revenue is a suspiciously round number. Please verify accuracy.');
      riskPenalty += 5;
    }

    if (expenses % 10000 === 0 && expenses > 100000) {
      warnings.push('Expenses are a suspiciously round number. Please verify accuracy.');
      riskPenalty += 5;
    }

    // Check for unreasonably large amounts (potential typo or fraud)
    if (grossRevenue > 100000000) { // 100M TRUST
      warnings.push('Gross revenue is unusually large. Please verify this amount.');
      riskPenalty += 10;
    }

    return {
      passed: errors.length === 0,
      warnings,
      errors,
      riskPenalty
    };
  }

  /**
   * Validate reporting period
   */
  private validatePeriod(
    periodStart: Date,
    periodEnd: Date
  ): { passed: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check period is not in the future
    if (periodEnd > new Date()) {
      errors.push('Period end date cannot be in the future');
    }

    // Check period start is before end
    if (periodStart >= periodEnd) {
      errors.push('Period start date must be before end date');
    }

    // Check period is not too long (max 1 year)
    const daysDiff = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      errors.push('Reporting period cannot exceed 365 days');
    }

    // Check period is not too short (min 1 day)
    if (daysDiff < 1) {
      errors.push('Reporting period must be at least 1 day');
    }

    // Check period is not too old (max 2 years ago)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    if (periodEnd < twoYearsAgo) {
      errors.push('Reporting period cannot be more than 2 years in the past');
    }

    return {
      passed: errors.length === 0,
      errors
    };
  }

  /**
   * Validate documents (IPFS hashes)
   */
  private async validateDocuments(
    documentHashes: string[]
  ): Promise<{ passed: boolean; warnings: string[]; errors: string[]; riskPenalty: number }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let riskPenalty = 0;

    // Check at least one document is provided
    if (documentHashes.length === 0) {
      warnings.push('No supporting documents provided. Revenue reports should include bank statements, invoices, or other proof.');
      riskPenalty += 20;
    }

    // Check document hashes are valid IPFS hashes
    for (const hash of documentHashes) {
      if (!hash.startsWith('Qm') && !hash.startsWith('ipfs://') && !hash.startsWith('0x')) {
        warnings.push(`Document hash ${hash.substring(0, 10)}... may not be a valid IPFS hash`);
        riskPenalty += 5;
      }
    }

    // Check for duplicate hashes
    const uniqueHashes = new Set(documentHashes);
    if (uniqueHashes.size !== documentHashes.length) {
      warnings.push('Duplicate document hashes detected');
      riskPenalty += 10;
    }

    return {
      passed: errors.length === 0,
      warnings,
      errors,
      riskPenalty
    };
  }

  /**
   * Check historical consistency
   */
  private async checkHistoricalConsistency(
    assetId: string,
    grossRevenue: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ passed: boolean; warnings: string[]; riskPenalty: number }> {
    const warnings: string[] = [];
    let riskPenalty = 0;

    // Get previous reports for this asset
    const previousReports = await this.revenueReportModel.find({
      assetId,
      status: RevenueReportStatus.DISTRIBUTED,
      periodEnd: { $lt: periodStart }
    }).sort({ periodEnd: -1 }).limit(3);

    if (previousReports.length > 0) {
      // Calculate average revenue from previous periods
      const avgRevenue = previousReports.reduce((sum, report) => sum + report.grossRevenue, 0) / previousReports.length;
      
      // Check for significant deviations (>50% increase or decrease)
      const deviation = Math.abs(grossRevenue - avgRevenue) / avgRevenue;
      
      if (deviation > 0.5) {
        if (grossRevenue > avgRevenue * 1.5) {
          warnings.push(`Revenue is ${((deviation - 0.5) * 100).toFixed(0)}% higher than historical average. Please verify this increase is legitimate.`);
          riskPenalty += 15;
        } else if (grossRevenue < avgRevenue * 0.5) {
          warnings.push(`Revenue is ${((deviation - 0.5) * 100).toFixed(0)}% lower than historical average. Please verify this decrease is legitimate.`);
          riskPenalty += 10;
        }
      }

      // Check for sudden spikes (potential fraud indicator)
      const lastReport = previousReports[0];
      if (lastReport && grossRevenue > lastReport.grossRevenue * 2) {
        warnings.push(`Revenue has doubled compared to last period. This may require additional verification.`);
        riskPenalty += 10;
      }
    }

    return {
      passed: true, // Warnings don't fail the check
      warnings,
      riskPenalty
    };
  }

  /**
   * Detect suspicious patterns
   */
  private async detectSuspiciousPatterns(
    assetId: string,
    ownerAddress: string,
    grossRevenue: number,
    expenses: number
  ): Promise<{ passed: boolean; warnings: string[]; riskPenalty: number }> {
    const warnings: string[] = [];
    let riskPenalty = 0;

    // Check for multiple reports from same owner in short time
    const recentReports = await this.revenueReportModel.find({
      ownerAddress: ownerAddress.toLowerCase(),
      status: { $in: [RevenueReportStatus.SUBMITTED, RevenueReportStatus.VERIFIED] },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    if (recentReports.length > 3) {
      warnings.push(`Multiple revenue reports submitted in last 24 hours. This may indicate automated or fraudulent activity.`);
      riskPenalty += 20;
    }

    // Check expense ratio consistency
    const expenseRatio = expenses / grossRevenue;
    if (expenseRatio < 0.1 && grossRevenue > 10000) {
      warnings.push(`Expense ratio is unusually low (${(expenseRatio * 100).toFixed(1)}%). Please verify all expenses are included.`);
      riskPenalty += 5;
    }

    return {
      passed: true, // Warnings don't fail the check
      warnings,
      riskPenalty
    };
  }

  /**
   * Verify revenue distribution before executing
   */
  async verifyDistribution(
    reportId: string,
    totalRevenue: number
  ): Promise<{ passed: boolean; errors: string[] }> {
    const errors: string[] = [];

    const report = await this.revenueReportModel.findOne({ reportId });
    if (!report) {
      errors.push(`Revenue report ${reportId} not found`);
      return { passed: false, errors };
    }

    // Verify report is verified
    if (report.status !== RevenueReportStatus.VERIFIED) {
      errors.push(`Report must be VERIFIED before distribution. Current status: ${report.status}`);
    }

    // Verify distribution amount matches report
    if (Math.abs(totalRevenue - report.netProfit) > 0.01) {
      errors.push(`Distribution amount (${totalRevenue}) does not match verified net profit (${report.netProfit})`);
    }

    // Check if already distributed
    if (report.status === RevenueReportStatus.DISTRIBUTED) {
      errors.push(`Report ${reportId} has already been distributed`);
    }

    return {
      passed: errors.length === 0,
      errors
    };
  }

  /**
   * Audit log for fraud detection
   */
  async logFraudAttempt(
    type: string,
    details: any,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  ): Promise<void> {
    this.logger.warn(`🚨 FRAUD ATTEMPT DETECTED: ${type}`, {
      riskLevel,
      details,
      timestamp: new Date().toISOString()
    });

    // In production, this would send alerts to security team
    // For now, we log it
  }
}

