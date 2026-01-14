import { Controller, Get, Post, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AssetsService, CreateDigitalAssetDto, CreateRWAAssetDto } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { Asset } from '../schemas/asset.schema';
import { AssetV2 } from '../schemas/asset-v2.schema';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all assets from database and blockchain' })
  @ApiResponse({ status: 200, description: 'List of assets from Mantle network' })
  async getAssets(@Query('status') status?: string): Promise<{ success: boolean; data: any[] }> {
    const assets = await this.assetsService.getAllAssets(status);
    return {
      success: true,
      data: assets
    };
  }

  @Get('owner/:owner')
  @ApiOperation({ summary: 'Get assets by owner from database' })
  @ApiResponse({ status: 200, description: 'List of assets owned by user with earnings information' })
  async getAssetsByOwner(@Param('owner') owner: string): Promise<{ success: boolean; data: any[] }> {
    if (!owner || owner.trim() === '') {
      throw new BadRequestException('Owner parameter is required');
    }
    
    // Get assets from database with earnings
    const assets = await this.assetsService.getAssetsByOwner(owner);
    return {
      success: true,
      data: assets
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiResponse({ status: 200, description: 'Asset details' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async getAssetById(@Param('id') id: string): Promise<{ success: boolean; data: Asset }> {
    const asset = await this.assetsService.getAssetById(id);
    return {
      success: true,
      data: asset,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new asset' })
  @ApiResponse({ status: 201, description: 'Asset created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createAsset(@Body() createAssetDto: CreateAssetDto): Promise<{ success: boolean; data: Asset }> {
    const asset = await this.assetsService.createAsset(createAssetDto);
    return {
      success: true,
      data: asset,
    };
  }

  @Post('create-with-tokenization')
  @ApiOperation({ summary: 'Create new asset with Hedera tokenization (DEPRECATED)' })
  @ApiResponse({ status: 201, description: 'Asset created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 500, description: 'Creation failed' })
  async createAssetWithTokenization(@Body() createAssetDto: CreateAssetDto): Promise<{ 
    success: boolean; 
    data: Asset; 
    tokenId?: string; 
    transactionId?: string;
    message?: string;
  }> {
    try {
      // Redirect to basic asset creation (legacy method)
      const result = await this.assetsService.createAsset(createAssetDto);
      return {
        success: true,
        data: result,
        tokenId: undefined,
        transactionId: `legacy_${Date.now()}`,
        message: 'Asset created successfully (legacy method - use /digital or /rwa endpoints)'
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.message
      };
    }
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured assets' })
  @ApiResponse({ status: 200, description: 'List of featured assets' })
  async getFeaturedAssets(@Query('limit') limit?: number): Promise<{ success: boolean; data: Asset[] }> {
    const assets = await this.assetsService.getFeaturedAssets(limit || 10);
    return {
      success: true,
      data: assets,
    };
  }

  // ========================================
  // NEW DUAL ASSET SYSTEM ENDPOINTS
  // ========================================

  @Post('digital')
  @ApiOperation({ summary: 'Create digital asset' })
  @ApiResponse({ status: 201, description: 'Digital asset created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createDigitalAsset(@Body() createDigitalAssetDto: CreateDigitalAssetDto): Promise<{ 
    success: boolean; 
    data: AssetV2; 
    assetId: string; 
    transactionId: string;
    message?: string;
  }> {
    try {
      const result = await this.assetsService.createDigitalAsset(createDigitalAssetDto);
      return {
        success: true,
        data: result.asset,
        assetId: result.assetId,
        transactionId: result.transactionId,
        message: 'Digital asset created successfully on blockchain'
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        assetId: '',
        transactionId: '',
        message: error.message
      };
    }
  }

  @Post('rwa')
  @ApiOperation({ summary: 'Create RWA asset' })
  @ApiResponse({ status: 201, description: 'RWA asset created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createRWAAsset(@Body() createRWAAssetDto: CreateRWAAssetDto): Promise<{ 
    success: boolean; 
    data: AssetV2; 
    assetId: string; 
    transactionId: string;
    message?: string;
  }> {
    try {
      const result = await this.assetsService.createRWAAsset(createRWAAssetDto);
      return {
        success: true,
        data: result.asset,
        assetId: result.assetId,
        transactionId: result.transactionId,
        message: 'RWA asset created successfully on blockchain'
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        assetId: '',
        transactionId: '',
        message: error.message
      };
    }
  }

  @Post('verify/:assetId')
  @ApiOperation({ summary: 'Verify asset' })
  @ApiResponse({ status: 200, description: 'Asset verified successfully' })
  @ApiResponse({ status: 400, description: 'Verification failed' })
  async verifyAsset(
    @Param('assetId') assetId: string,
    @Body() body: { verificationLevel: number }
  ): Promise<{ 
    success: boolean; 
    transactionId: string;
    message?: string;
  }> {
    try {
      const result = await this.assetsService.verifyAsset(assetId, body.verificationLevel);
      return {
        success: true,
        transactionId: result.transactionId,
        message: `Asset verified to level ${body.verificationLevel}`
      };
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        message: error.message
      };
    }
  }

  @Get('blockchain-state/:tokenId/:serialNumber')
  @ApiOperation({ summary: 'Get NFT blockchain state (ownership, listing status, seller)' })
  @ApiResponse({ status: 200, description: 'NFT blockchain state retrieved' })
  async getNFTBlockchainState(
    @Param('tokenId') tokenId: string,
    @Param('serialNumber') serialNumber: string
  ): Promise<{ 
    success: boolean; 
    data: {
      owner: string;
      isListed: boolean;
      isInEscrow: boolean;
      marketplaceAccount: string;
      seller?: string;
    };
  }> {
    try {
      const state = await this.assetsService.getNFTBlockchainState(tokenId, serialNumber);
      return {
        success: true,
        data: state
      };
    } catch (error) {
      return {
        success: false,
        data: {
          owner: '',
          isListed: false,
          isInEscrow: false,
          marketplaceAccount: ''
        }
      };
    }
  }
}
