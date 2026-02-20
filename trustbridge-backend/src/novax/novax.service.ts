import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Novax Service for Arbitrum Sepolia
 * Handles all interactions with Novax Yield contracts on Arbitrum Sepolia
 */
@Injectable()
export class NovaxService {
  private readonly logger = new Logger(NovaxService.name);
  private provider: ethers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private poolManager: ethers.Contract | null = null;
  private receivableFactory: ethers.Contract | null = null;
  private rwaFactory: ethers.Contract | null = null;

  // Contract addresses
  private poolManagerAddress: string;
  private receivableFactoryAddress: string;
  private rwaFactoryAddress: string;

  constructor(private configService: ConfigService) {
    // Get contract addresses from config
    this.poolManagerAddress = this.configService.get<string>('POOL_MANAGER_ADDRESS') || 
      '0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5';
    this.receivableFactoryAddress = this.configService.get<string>('RECEIVABLE_FACTORY_ADDRESS') || 
      '0xEbf84CE8945B7e1BE6dBfB6914320222Cf05467b';
    this.rwaFactoryAddress = this.configService.get<string>('RWA_FACTORY_ADDRESS') || 
      '0x83E58aaa63B9437ec39985Eb913CABA27f85A442';

    this.initializeProvider();
  }

  /**
   * Initialize provider and contracts
   */
  private async initializeProvider() {
    try {
      const rpcUrl = this.configService.get<string>('ARBITRUM_SEPOLIA_RPC_URL') || 
        'https://sepolia-rollup.arbitrum.io/rpc';
      
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.logger.log(`✅ Connected to Arbitrum Sepolia RPC: ${rpcUrl}`);

      // Load contract ABIs
      const contractsDir = path.join(__dirname, '../../contracts/artifacts/contracts/novax');
      
      // Load PoolManager ABI
      const poolManagerAbiPath = path.join(contractsDir, 'NovaxPoolManager.sol/NovaxPoolManager.json');
      if (fs.existsSync(poolManagerAbiPath)) {
        const poolManagerArtifact = JSON.parse(fs.readFileSync(poolManagerAbiPath, 'utf-8'));
        const poolManagerAbi = poolManagerArtifact.abi;
        this.poolManager = new ethers.Contract(this.poolManagerAddress, poolManagerAbi, this.provider);
        this.logger.log(`✅ PoolManager contract initialized: ${this.poolManagerAddress}`);
      } else {
        this.logger.warn(`⚠️ PoolManager ABI not found at ${poolManagerAbiPath}`);
      }

      // Load ReceivableFactory ABI
      const receivableFactoryAbiPath = path.join(contractsDir, 'NovaxReceivableFactory.sol/NovaxReceivableFactory.json');
      if (fs.existsSync(receivableFactoryAbiPath)) {
        const receivableFactoryArtifact = JSON.parse(fs.readFileSync(receivableFactoryAbiPath, 'utf-8'));
        const receivableFactoryAbi = receivableFactoryArtifact.abi;
        this.receivableFactory = new ethers.Contract(this.receivableFactoryAddress, receivableFactoryAbi, this.provider);
        this.logger.log(`✅ ReceivableFactory contract initialized: ${this.receivableFactoryAddress}`);
      }

      // Load RwaFactory ABI
      const rwaFactoryAbiPath = path.join(contractsDir, 'NovaxRwaFactory.sol/NovaxRwaFactory.json');
      if (fs.existsSync(rwaFactoryAbiPath)) {
        const rwaFactoryArtifact = JSON.parse(fs.readFileSync(rwaFactoryAbiPath, 'utf-8'));
        const rwaFactoryAbi = rwaFactoryArtifact.abi;
        this.rwaFactory = new ethers.Contract(this.rwaFactoryAddress, rwaFactoryAbi, this.provider);
        this.logger.log(`✅ RwaFactory contract initialized: ${this.rwaFactoryAddress}`);
      }

      // Initialize signer if private key is available
      const privateKey = this.configService.get<string>('ARBITRUM_PRIVATE_KEY') || 
        this.configService.get<string>('PRIVATE_KEY');
      if (privateKey && this.provider) {
        this.signer = new ethers.Wallet(privateKey, this.provider);
        const signerAddress = await this.signer.getAddress();
        this.logger.log(`✅ Signer initialized: ${signerAddress}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize Novax service:', error);
      throw error;
    }
  }

  /**
   * Get pool by ID from Arbitrum Sepolia
   */
  async getPool(poolId: string): Promise<any> {
    if (!this.poolManager) {
      throw new Error('PoolManager contract not initialized');
    }

    try {
      const poolIdBytes32 = poolId.startsWith('0x') && poolId.length === 66
        ? poolId
        : ethers.id(poolId);

      this.logger.log(`🔍 Fetching pool ${poolIdBytes32} from Arbitrum Sepolia...`);
      
      const pool = await this.poolManager.getPool(poolIdBytes32);
      
      // Check if pool exists (id should not be zero hash)
      if (!pool || !pool.id || pool.id === ethers.ZeroHash) {
        throw new Error('Pool not found on-chain');
      }

      this.logger.log(`✅ Pool found on-chain: ${poolIdBytes32}`);
      return pool;
    } catch (error: any) {
      this.logger.error(`Failed to get pool ${poolId}:`, error.message);
      if (error.message?.includes('Pool not found') || 
          error.message?.includes('zero hash') ||
          error.reason?.includes('Pool not found')) {
        throw new Error('Pool not found on-chain');
      }
      throw error;
    }
  }

  /**
   * Get all pools from Arbitrum Sepolia
   */
  async getAllPools(): Promise<string[]> {
    if (!this.poolManager) {
      throw new Error('PoolManager contract not initialized');
    }

    try {
      this.logger.log('🔍 Fetching all pools from Arbitrum Sepolia...');
      
      // Try getPoolsPaginated first
      try {
        const [pools, total] = await this.poolManager.getPoolsPaginated(0, 1000);
        const totalCount = Number(total);
        this.logger.log(`📊 Found ${totalCount} total pools, fetched ${pools.length}`);
        
        if (pools.length === 0) {
          return [];
        }

        const poolIds = pools.map((pool: any) => {
          const id = pool.id || pool[0];
          return typeof id === 'string' ? id : ethers.hexlify(id);
        }).filter((id: string) => id && id !== ethers.ZeroHash);

        return poolIds;
      } catch (error) {
        this.logger.warn('getPoolsPaginated failed, trying direct getters...', error);
        
        // Fallback to direct getters
        const totalPools = await this.poolManager.totalPools();
        const total = Number(totalPools);
        
        if (total === 0) {
          return [];
        }

        const poolIds: string[] = [];
        for (let i = 0; i < Math.min(total, 100); i++) {
          try {
            const poolId = await this.poolManager.allPools(i);
            const poolIdString = ethers.hexlify(poolId);
            if (poolIdString !== ethers.ZeroHash) {
              poolIds.push(poolIdString);
            }
          } catch (error) {
            this.logger.warn(`Failed to fetch pool at index ${i}:`, error);
          }
        }

        return poolIds;
      }
    } catch (error: any) {
      this.logger.error('Failed to get all pools:', error);
      throw error;
    }
  }

  /**
   * Get receivable by ID
   */
  async getReceivable(receivableId: string): Promise<any> {
    if (!this.receivableFactory) {
      throw new Error('ReceivableFactory contract not initialized');
    }

    try {
      const receivableIdBytes32 = receivableId.startsWith('0x') && receivableId.length === 66
        ? receivableId
        : ethers.id(receivableId);

      const receivable = await this.receivableFactory.receivables(receivableIdBytes32);
      
      if (!receivable || !receivable.id || receivable.id === ethers.ZeroHash) {
        throw new Error('Receivable not found on-chain');
      }

      return receivable;
    } catch (error: any) {
      this.logger.error(`Failed to get receivable ${receivableId}:`, error);
      throw error;
    }
  }

  /**
   * Get RWA asset by ID
   */
  async getAsset(assetId: string): Promise<any> {
    if (!this.rwaFactory) {
      throw new Error('RwaFactory contract not initialized');
    }

    try {
      const assetIdBytes32 = assetId.startsWith('0x') && assetId.length === 66
        ? assetId
        : ethers.id(assetId);

      const asset = await this.rwaFactory.getAsset(assetIdBytes32);
      
      if (!asset || !asset.id || asset.id === ethers.ZeroHash) {
        throw new Error('Asset not found on-chain');
      }

      return asset;
    } catch (error: any) {
      this.logger.error(`Failed to get asset ${assetId}:`, error);
      throw error;
    }
  }
}

