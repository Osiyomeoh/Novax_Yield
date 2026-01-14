import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateRWAAssetDto, UpdateRWAAssetDto, RWAAssetQueryDto, RWAStatus, RiskLevel, LiquidityLevel } from './dto/rwa.dto';
import { ChainlinkRWAService } from './chainlink-rwa.service';

export interface RWAAsset {
  id: string;
  name: string;
  description: string;
  category: string;
  assetType: string;
  location: string;
  totalValue: number;
  tokenSupply: number;
  tokenPrice: number;
  availableTokens: number;
  expectedAPY: number;
  maturityDate: string;
  status: RWAStatus;
  owner: string;
  amcId?: string;
  amcName?: string;
  amcRating?: number;
  inspectionReport?: string;
  legalTransferStatus?: string;
  riskLevel: RiskLevel;
  liquidity: LiquidityLevel;
  currentValue?: number;
  totalReturn?: number;
  totalReturnPercent?: number;
  evidenceFiles: string[];
  legalDocuments: string[];
  inspectionPhotos?: string[];
  valuationReport?: string;
  ownershipDocuments?: string[];
  insuranceDocuments?: string[];
  maintenanceRecords?: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class RWAService {
  private readonly logger = new Logger(RWAService.name);
  private rwaAssets: RWAAsset[] = [];

  constructor(
    private readonly chainlinkRWAService: ChainlinkRWAService
  ) {
    // Initialize with mock data as fallback
    this.initializeMockData();
  }

  private initializeMockData() {
    const mockAssets: RWAAsset[] = [
      {
        id: '1',
        name: 'Victoria Island Commercial Complex',
        description: 'Premium commercial complex in the heart of Victoria Island with high rental yields.',
        category: 'Real Estate',
        assetType: 'Commercial Building',
        location: 'Victoria Island, Lagos, Nigeria',
        totalValue: 2500000,
        tokenSupply: 25000,
        tokenPrice: 100,
        availableTokens: 15000,
        expectedAPY: 12.5,
        maturityDate: '2026-12-31',
        status: RWAStatus.ACTIVE,
        owner: '0x1234567890123456789012345678901234567890',
        amcId: 'amc_001',
        amcName: 'Lagos Asset Management Co.',
        amcRating: 4.8,
        inspectionReport: 'ipfs://inspection-report-001',
        legalTransferStatus: 'COMPLETED',
        riskLevel: RiskLevel.LOW,
        liquidity: LiquidityLevel.HIGH,
        currentValue: 2650000,
        totalReturn: 300000,
        totalReturnPercent: 12.0,
        evidenceFiles: ['deed.pdf', 'valuation.pdf'],
        legalDocuments: ['deed.pdf', 'valuation.pdf', 'insurance.pdf'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15')
      },
      {
        id: '2',
        name: 'Lekki Farmland Development',
        description: 'Prime agricultural land suitable for various crops with excellent growth potential.',
        category: 'Farmland',
        assetType: 'Agricultural Land',
        location: 'Lekki, Lagos, Nigeria',
        totalValue: 500000,
        tokenSupply: 20000,
        tokenPrice: 25,
        availableTokens: 8000,
        expectedAPY: 18.0,
        maturityDate: '2025-06-30',
        status: RWAStatus.ACTIVE,
        owner: '0x9876543210987654321098765432109876543210',
        amcId: 'amc_002',
        amcName: 'AgriVest Management',
        amcRating: 4.6,
        inspectionReport: 'ipfs://inspection-report-002',
        legalTransferStatus: 'COMPLETED',
        riskLevel: RiskLevel.MEDIUM,
        liquidity: LiquidityLevel.MEDIUM,
        currentValue: 520000,
        totalReturn: 80000,
        totalReturnPercent: 16.0,
        evidenceFiles: ['land-title.pdf', 'survey.pdf'],
        legalDocuments: ['land-title.pdf', 'survey.pdf'],
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-14')
      },
      {
        id: '3',
        name: 'Port Harcourt Mining Equipment',
        description: 'High-performance mining equipment with proven track record and regular maintenance.',
        category: 'Equipment',
        assetType: 'Mining Equipment',
        location: 'Port Harcourt, Rivers, Nigeria',
        totalValue: 750000,
        tokenSupply: 10000,
        tokenPrice: 75,
        availableTokens: 2500,
        expectedAPY: 15.0,
        maturityDate: '2024-12-31',
        status: RWAStatus.ACTIVE,
        owner: '0x5555555555555555555555555555555555555555',
        amcId: 'amc_003',
        amcName: 'Industrial Asset Partners',
        amcRating: 4.4,
        inspectionReport: 'ipfs://inspection-report-003',
        legalTransferStatus: 'COMPLETED',
        riskLevel: RiskLevel.HIGH,
        liquidity: LiquidityLevel.LOW,
        currentValue: 780000,
        totalReturn: 90000,
        totalReturnPercent: 12.0,
        evidenceFiles: ['equipment-cert.pdf', 'maintenance.pdf'],
        legalDocuments: ['equipment-cert.pdf', 'maintenance.pdf'],
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-13')
      }
    ];

    this.rwaAssets = mockAssets;
  }

  async createRWAAsset(createDto: CreateRWAAssetDto): Promise<RWAAsset> {
    try {
      const rwaAsset: RWAAsset = {
        id: `rwa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: createDto.name,
        description: createDto.description,
        category: createDto.category,
        assetType: createDto.assetType,
        location: createDto.location,
        totalValue: createDto.totalValue,
        tokenSupply: createDto.tokenSupply,
        tokenPrice: createDto.totalValue / createDto.tokenSupply,
        availableTokens: createDto.tokenSupply,
        expectedAPY: createDto.expectedAPY,
        maturityDate: createDto.maturityDate,
        status: createDto.status,
        owner: createDto.owner,
        riskLevel: this.calculateRiskLevel(createDto.expectedAPY, createDto.category),
        liquidity: this.calculateLiquidityLevel(createDto.category),
        evidenceFiles: createDto.evidenceFiles,
        legalDocuments: createDto.legalDocuments,
        inspectionPhotos: createDto.inspectionPhotos || [],
        valuationReport: createDto.valuationReport,
        ownershipDocuments: createDto.ownershipDocuments || [],
        insuranceDocuments: createDto.insuranceDocuments || [],
        maintenanceRecords: createDto.maintenanceRecords || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.rwaAssets.push(rwaAsset);
      
      this.logger.log(`Created RWA asset: ${rwaAsset.name} (${rwaAsset.id})`);
      return rwaAsset;
    } catch (error) {
      this.logger.error(`Failed to create RWA asset: ${error.message}`);
      throw new Error(`RWA asset creation failed: ${error.message}`);
    }
  }

  async getRWAAssets(query: RWAAssetQueryDto): Promise<{ assets: RWAAsset[]; total: number; page: number; limit: number }> {
    try {
      // Use mock data for now (real assets are fetched via Hedera service endpoints)
      let filteredAssets = [...this.rwaAssets];

      // Apply filters
      if (query.search) {
        const searchTerm = query.search.toLowerCase();
        filteredAssets = filteredAssets.filter(asset =>
          asset.name.toLowerCase().includes(searchTerm) ||
          asset.description.toLowerCase().includes(searchTerm) ||
          asset.assetType.toLowerCase().includes(searchTerm) ||
          asset.location.toLowerCase().includes(searchTerm)
        );
      }

      if (query.category) {
        filteredAssets = filteredAssets.filter(asset => asset.category === query.category);
      }

      if (query.status) {
        filteredAssets = filteredAssets.filter(asset => asset.status === query.status);
      }

      if (query.riskLevel) {
        filteredAssets = filteredAssets.filter(asset => asset.riskLevel === query.riskLevel);
      }

      if (query.liquidity) {
        filteredAssets = filteredAssets.filter(asset => asset.liquidity === query.liquidity);
      }

      if (query.minAPY !== undefined) {
        filteredAssets = filteredAssets.filter(asset => asset.expectedAPY >= query.minAPY!);
      }

      if (query.maxAPY !== undefined) {
        filteredAssets = filteredAssets.filter(asset => asset.expectedAPY <= query.maxAPY!);
      }

      if (query.minValue !== undefined) {
        filteredAssets = filteredAssets.filter(asset => asset.totalValue >= query.minValue!);
      }

      if (query.maxValue !== undefined) {
        filteredAssets = filteredAssets.filter(asset => asset.totalValue <= query.maxValue!);
      }

      if (query.amcVerified !== undefined) {
        filteredAssets = filteredAssets.filter(asset => 
          query.amcVerified ? !!asset.amcId : !asset.amcId
        );
      }

      // Apply sorting
      if (query.sortBy) {
        filteredAssets.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (query.sortBy) {
            case 'name':
              aValue = a.name;
              bValue = b.name;
              break;
            case 'price':
              aValue = a.tokenPrice;
              bValue = b.tokenPrice;
              break;
            case 'apy':
              aValue = a.expectedAPY;
              bValue = b.expectedAPY;
              break;
            case 'value':
              aValue = a.totalValue;
              bValue = b.totalValue;
              break;
            case 'performance':
              aValue = a.totalReturnPercent || 0;
              bValue = b.totalReturnPercent || 0;
              break;
            case 'createdAt':
              aValue = a.createdAt;
              bValue = b.createdAt;
              break;
            default:
              aValue = a.name;
              bValue = b.name;
          }

          if (query.sortOrder === 'desc') {
            return aValue > bValue ? -1 : 1;
          } else {
            return aValue < bValue ? -1 : 1;
          }
        });
      }

      // Apply pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedAssets = filteredAssets.slice(startIndex, endIndex);

      return {
        assets: paginatedAssets,
        total: filteredAssets.length,
        page,
        limit
      };
    } catch (error) {
      this.logger.error(`Failed to get RWA assets: ${error.message}`);
      throw new Error(`Failed to get RWA assets: ${error.message}`);
    }
  }

  async getRWAAsset(id: string): Promise<RWAAsset> {
    try {
      const asset = this.rwaAssets.find(a => a.id === id);
      if (!asset) {
        throw new NotFoundException(`RWA asset with ID ${id} not found`);
      }
      return asset;
    } catch (error) {
      this.logger.error(`Failed to get RWA asset ${id}: ${error.message}`);
      throw error;
    }
  }

  async updateRWAAsset(id: string, updateDto: UpdateRWAAssetDto): Promise<RWAAsset> {
    try {
      const assetIndex = this.rwaAssets.findIndex(a => a.id === id);
      if (assetIndex === -1) {
        throw new NotFoundException(`RWA asset with ID ${id} not found`);
      }

      const updatedAsset = {
        ...this.rwaAssets[assetIndex],
        ...updateDto,
        updatedAt: new Date()
      };

      this.rwaAssets[assetIndex] = updatedAsset;
      
      this.logger.log(`Updated RWA asset: ${updatedAsset.name} (${id})`);
      return updatedAsset;
    } catch (error) {
      this.logger.error(`Failed to update RWA asset ${id}: ${error.message}`);
      throw error;
    }
  }

  async getRWAAssetsByCategory(category: string): Promise<RWAAsset[]> {
    try {
      return this.rwaAssets.filter(asset => asset.category === category);
    } catch (error) {
      this.logger.error(`Failed to get RWA assets by category ${category}: ${error.message}`);
      throw new Error(`Failed to get RWA assets by category: ${error.message}`);
    }
  }

  async getRWAAssetsByStatus(status: string): Promise<RWAAsset[]> {
    try {
      return this.rwaAssets.filter(asset => asset.status === status);
    } catch (error) {
      this.logger.error(`Failed to get RWA assets by status ${status}: ${error.message}`);
      throw new Error(`Failed to get RWA assets by status: ${error.message}`);
    }
  }

  // ========================================
  // CHAINLINK INTEGRATION METHODS
  // ========================================

  async getRWAAssetWithChainlinkData(id: string): Promise<RWAAsset & { chainlinkData: any }> {
    try {
      const asset = await this.getRWAAsset(id);
      
      // Get Chainlink price data
      const priceData = await this.chainlinkRWAService.getRWAAssetPrice(
        asset.id,
        asset.assetType,
        asset.category,
        asset.location
      );

      // Get Chainlink risk assessment
      const riskData = await this.chainlinkRWAService.getRWARiskAssessment(
        asset.id,
        asset.category,
        asset.location,
        asset.expectedAPY
      );

      // Get market data
      const marketData = await this.chainlinkRWAService.getRWAMarketData(
        asset.category,
        asset.location.split(',').pop()?.trim() || 'Nigeria'
      );

      return {
        ...asset,
        chainlinkData: {
          priceData,
          riskData,
          marketData,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get Chainlink data for RWA asset ${id}:`, error);
      throw error;
    }
  }

  async updateAssetWithChainlinkData(id: string): Promise<RWAAsset> {
    try {
      const asset = await this.getRWAAsset(id);
      
      // Get fresh Chainlink data
      const priceData = await this.chainlinkRWAService.getRWAAssetPrice(
        asset.id,
        asset.assetType,
        asset.category,
        asset.location
      );

      const riskData = await this.chainlinkRWAService.getRWARiskAssessment(
        asset.id,
        asset.category,
        asset.location,
        asset.expectedAPY
      );

      // Update asset with Chainlink data
      const updatedAsset = {
        ...asset,
        currentValue: priceData?.currentValue || asset.currentValue,
        totalReturn: priceData ? (priceData.currentValue - asset.totalValue) : asset.totalReturn,
        totalReturnPercent: priceData ? ((priceData.currentValue - asset.totalValue) / asset.totalValue) * 100 : asset.totalReturnPercent,
        riskLevel: (riskData?.riskLevel as RiskLevel) || asset.riskLevel,
        updatedAt: new Date()
      };

      // Update in storage
      const assetIndex = this.rwaAssets.findIndex(a => a.id === id);
      if (assetIndex !== -1) {
        this.rwaAssets[assetIndex] = updatedAsset;
      }

      this.logger.log(`Updated RWA asset ${id} with Chainlink data`);
      return updatedAsset;
    } catch (error) {
      this.logger.error(`Failed to update asset with Chainlink data:`, error);
      throw error;
    }
  }

  async assignAMCWithChainlinkVRF(assetId: string): Promise<{ amcId: string; assignmentReason: string; transactionId: string }> {
    try {
      const asset = await this.getRWAAsset(assetId);
      
      // Get available AMCs (mock data - would come from AMC service)
      const availableAMCs = [
        'amc_001_lagos_asset_management',
        'amc_002_agrivest_management',
        'amc_003_industrial_asset_partners',
        'amc_004_global_property_services',
        'amc_005_equipment_specialists'
      ];

      // Use Chainlink VRF to assign AMC
      const assignmentData = await this.chainlinkRWAService.assignAMCWithVRF(assetId, availableAMCs);

      // Update asset with AMC assignment
      const updatedAsset = {
        ...asset,
        amcId: assignmentData.selectedAMC,
        status: RWAStatus.ASSIGNED,
        updatedAt: new Date()
      };

      const assetIndex = this.rwaAssets.findIndex(a => a.id === assetId);
      if (assetIndex !== -1) {
        this.rwaAssets[assetIndex] = updatedAsset;
      }

      this.logger.log(`Assigned AMC ${assignmentData.selectedAMC} to asset ${assetId} using Chainlink VRF`);

      return {
        amcId: assignmentData.selectedAMC,
        assignmentReason: assignmentData.assignmentReason,
        transactionId: `vrf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (error) {
      this.logger.error(`Failed to assign AMC with Chainlink VRF:`, error);
      throw error;
    }
  }

  async getChainlinkMarketData(category?: string, region?: string): Promise<any> {
    try {
      if (category && region) {
        return await this.chainlinkRWAService.getRWAMarketData(category, region);
      }

      // Get market data for all categories
      const categories = ['Real Estate', 'Farmland', 'Equipment', 'Commodities', 'Vehicles', 'Farm Produce'];
      const regions = ['Nigeria', 'USA', 'UK', 'UAE', 'Singapore'];
      
      const marketData = [];
      for (const cat of categories) {
        for (const reg of regions) {
          try {
            const data = await this.chainlinkRWAService.getRWAMarketData(cat, reg);
            marketData.push(data);
          } catch (error) {
            this.logger.warn(`Failed to get market data for ${cat} in ${reg}: ${error.message}`);
          }
        }
      }

      return marketData;
    } catch (error) {
      this.logger.error(`Failed to get Chainlink market data:`, error);
      throw error;
    }
  }

  async refreshAllAssetsWithChainlinkData(): Promise<void> {
    try {
      this.logger.log('Refreshing all RWA assets with Chainlink data...');
      
      const updatePromises = this.rwaAssets.map(asset => 
        this.updateAssetWithChainlinkData(asset.id).catch(error => {
          this.logger.warn(`Failed to update asset ${asset.id}: ${error.message}`);
        })
      );

      await Promise.all(updatePromises);
      this.logger.log('Completed refreshing all assets with Chainlink data');
    } catch (error) {
      this.logger.error(`Failed to refresh assets with Chainlink data:`, error);
      throw error;
    }
  }

  private calculateRiskLevel(apy: number, category: string): RiskLevel {
    if (apy <= 8) return RiskLevel.LOW;
    if (apy <= 15) return RiskLevel.MEDIUM;
    return RiskLevel.HIGH;
  }

  private calculateLiquidityLevel(category: string): LiquidityLevel {
    switch (category) {
      case 'Real Estate':
        return LiquidityLevel.HIGH;
      case 'Farmland':
        return LiquidityLevel.MEDIUM;
      case 'Equipment':
        return LiquidityLevel.LOW;
      case 'Commodities':
        return LiquidityLevel.HIGH;
      case 'Vehicles':
        return LiquidityLevel.MEDIUM;
      case 'Farm Produce':
        return LiquidityLevel.MEDIUM;
      default:
        return LiquidityLevel.MEDIUM;
    }
  }
}
