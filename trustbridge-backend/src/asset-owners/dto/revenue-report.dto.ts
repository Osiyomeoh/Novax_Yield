import { IsString, IsNumber, IsDateString, IsOptional, IsArray, IsEnum, Min } from 'class-validator';
import { RevenueReportStatus } from '../../schemas/asset-owner.schema';

export class SubmitRevenueReportDto {
  @IsString()
  assetId: string;

  @IsDateString()
  periodStart: string; // ISO date string

  @IsDateString()
  periodEnd: string; // ISO date string

  @IsNumber()
  @Min(0)
  grossRevenue: number;

  @IsNumber()
  @Min(0)
  expenses: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documentHashes?: string[]; // IPFS hashes for supporting documents

  @IsOptional()
  metadata?: Record<string, any>;
}

export class VerifyRevenueReportDto {
  @IsString()
  reportId: string;

  @IsEnum(RevenueReportStatus)
  status: RevenueReportStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @IsOptional()
  verifiedAmount?: number; // AMC may adjust the amount
}

export class DistributeRevenueDto {
  @IsString()
  assetId: string;

  @IsString()
  reportId: string;

  @IsNumber()
  @Min(0)
  totalRevenue: number; // Total revenue to distribute

  @IsString()
  @IsOptional()
  description?: string;
}

