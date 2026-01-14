import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, IsEnum, IsDateString, Min, Max } from 'class-validator';

export enum RWACategory {
  REAL_ESTATE = 'Real Estate',
  FARMLAND = 'Farmland',
  EQUIPMENT = 'Equipment',
  COMMODITIES = 'Commodities',
  VEHICLES = 'Vehicles',
  FARM_PRODUCE = 'Farm Produce'
}

export enum RWAStatus {
  PENDING_AMC_ASSIGNMENT = 'PENDING_AMC_ASSIGNMENT',
  ASSIGNED = 'ASSIGNED',
  INSPECTION_SCHEDULED = 'INSPECTION_SCHEDULED',
  INSPECTION_COMPLETED = 'INSPECTION_COMPLETED',
  LEGAL_TRANSFER_PENDING = 'LEGAL_TRANSFER_PENDING',
  LEGAL_TRANSFER_COMPLETED = 'LEGAL_TRANSFER_COMPLETED',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum LiquidityLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export class LocationDto {
  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  coordinates?: string; // "lat,lng" format
}

export class CreateRWAAssetDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(RWACategory)
  category: RWACategory;

  @IsString()
  assetType: string;

  @IsString()
  location: string; // JSON string of LocationDto

  @IsNumber()
  @Min(0)
  totalValue: number;

  @IsNumber()
  @Min(0)
  tokenSupply: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxInvestablePercentage?: number; // Maximum percentage of asset that can be tokenized (0-100%, default: 100)

  @IsNumber()
  @Min(0)
  @Max(100)
  expectedAPY: number;

  @IsDateString()
  maturityDate: string;

  @IsArray()
  @IsString({ each: true })
  evidenceFiles: string[];

  @IsArray()
  @IsString({ each: true })
  legalDocuments: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inspectionPhotos?: string[];

  @IsOptional()
  @IsString()
  valuationReport?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ownershipDocuments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  insuranceDocuments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  maintenanceRecords?: string[];

  @IsString()
  owner: string;

  @IsEnum(RWAStatus)
  status: RWAStatus;

  @IsBoolean()
  requiresAMC: boolean;
}

export class UpdateRWAAssetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(RWACategory)
  category?: RWACategory;

  @IsOptional()
  @IsString()
  assetType?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tokenSupply?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  expectedAPY?: number;

  @IsOptional()
  @IsDateString()
  maturityDate?: string;

  @IsOptional()
  @IsEnum(RWAStatus)
  status?: RWAStatus;

  @IsOptional()
  @IsString()
  amcId?: string;

  @IsOptional()
  @IsString()
  inspectionReport?: string;

  @IsOptional()
  @IsString()
  legalTransferStatus?: string;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsEnum(LiquidityLevel)
  liquidity?: LiquidityLevel;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalReturn?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  totalReturnPercent?: number;
}

export class RWAAssetQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(RWACategory)
  category?: RWACategory;

  @IsOptional()
  @IsEnum(RWAStatus)
  status?: RWAStatus;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsEnum(LiquidityLevel)
  liquidity?: LiquidityLevel;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAPY?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAPY?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxValue?: number;

  @IsOptional()
  @IsBoolean()
  amcVerified?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

