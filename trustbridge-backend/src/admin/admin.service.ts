import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetDocument, AssetStatus } from '../schemas/asset.schema';
import { NovaxService } from '../novax/novax.service';
import { ethers } from 'ethers';
import * as path from 'path';
import * as fs from 'fs';

export interface AdminRole {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPlatformAdmin: boolean;
  isAmcAdmin: boolean;
  role: string;
  permissions: string[];
}

export interface AdminAssignment {
  walletAddress: string;
  role: string;
  assignedBy: string;
  assignedAt: Date;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly adminWallets: string[];
  private readonly superAdminWallet: string;
  private readonly platformAdminWallets: string[];
  private readonly amcAdminWallets: string[];

  constructor(
    private configService: ConfigService,
    @InjectModel(Asset.name) private assetModel: Model<AssetDocument>,
    private novaxService: NovaxService,
  ) {
    // Load admin configuration from environment
    this.adminWallets = this.configService
      .get<string>('ADMIN_WALLETS', '')
      .split(',')
      .map(addr => addr.trim().toLowerCase())
      .filter(addr => addr.length > 0);

    this.superAdminWallet = this.configService
      .get<string>('SUPER_ADMIN_WALLET', '')
      .toLowerCase();

    this.platformAdminWallets = this.configService
      .get<string>('PLATFORM_ADMIN_WALLETS', '')
      .split(',')
      .map(addr => addr.trim().toLowerCase())
      .filter(addr => addr.length > 0);

    this.amcAdminWallets = this.configService
      .get<string>('AMC_ADMIN_WALLETS', '')
      .split(',')
      .map(addr => addr.trim().toLowerCase())
      .filter(addr => addr.length > 0);

    this.logger.log(`Admin service initialized with ${this.adminWallets.length} admin wallets`);
  }

  /**
   * Check if a wallet address has admin privileges
   * Checks both environment variables and on-chain smart contract roles
   */
  async checkAdminStatus(walletAddress: string): Promise<AdminRole> {
    if (!walletAddress) {
      return this.getDefaultRole();
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // First, check on-chain smart contract roles (Novax contracts)
    try {
      const onChainRole = await this.checkOnChainAdminRole(normalizedAddress);
      if (onChainRole.isAdmin || onChainRole.isAmcAdmin) {
        this.logger.log(`Admin access granted via on-chain role for ${normalizedAddress}: ${onChainRole.role}`);
        return onChainRole;
      }
    } catch (error) {
      this.logger.warn('Failed to check on-chain admin role:', error);
    }

    // Fallback: Check environment variable admin roles
    try {
      const envAdminRole = await this.checkEnvironmentAdminRole(normalizedAddress);
      if (envAdminRole.isAdmin) {
        this.logger.log(`Admin access granted via environment variable for ${normalizedAddress}: ${envAdminRole.role}`);
        return envAdminRole;
      }
    } catch (error) {
      this.logger.warn('Failed to check environment admin role:', error);
    }

    // No admin privileges found
    this.logger.debug(`No admin privileges found for ${normalizedAddress}`);
    return this.getDefaultRole();
  }

  /**
   * Check on-chain admin roles from Novax smart contracts
   */
  private async checkOnChainAdminRole(normalizedAddress: string): Promise<AdminRole> {
    try {
      // Get contract addresses from config
      const poolManagerAddress = this.configService.get<string>('POOL_MANAGER_ADDRESS') || 
        '0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5';
      const receivableFactoryAddress = this.configService.get<string>('RECEIVABLE_FACTORY_ADDRESS') || 
        '0xEbf84CE8945B7e1BE6dBfB6914320222Cf05467b';
      const rpcUrl = this.configService.get<string>('ARBITRUM_SEPOLIA_RPC_URL') || 
        'https://sepolia-rollup.arbitrum.io/rpc';

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Role hashes (from AccessControl)
      const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const ADMIN_ROLE = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';
      const AMC_ROLE = '0xbdd8a13cde413bbdfec8b00148d478e80611d17275a7bd27c01e16b38c1df692';

      // Load contract ABIs
      const contractsDir = path.join(__dirname, '../../contracts/artifacts/contracts/novax');
      
      // Check PoolManager
      const poolManagerAbiPath = path.join(contractsDir, 'NovaxPoolManager.sol/NovaxPoolManager.json');
      if (fs.existsSync(poolManagerAbiPath)) {
        const poolManagerArtifact = JSON.parse(fs.readFileSync(poolManagerAbiPath, 'utf-8'));
        const poolManager = new ethers.Contract(poolManagerAddress, poolManagerArtifact.abi, provider);
        
        const hasDefaultAdmin = await poolManager.hasRole(DEFAULT_ADMIN_ROLE, normalizedAddress);
        const hasAdminRole = await poolManager.hasRole(ADMIN_ROLE, normalizedAddress);
        const hasAmcRole = await poolManager.hasRole(AMC_ROLE, normalizedAddress);

        if (hasDefaultAdmin || hasAdminRole) {
          return {
            isAdmin: true,
            isSuperAdmin: hasDefaultAdmin, // DEFAULT_ADMIN_ROLE = super admin
            isPlatformAdmin: hasAdminRole || hasDefaultAdmin,
            isAmcAdmin: hasAmcRole || hasDefaultAdmin,
            role: hasDefaultAdmin ? 'SUPER_ADMIN' : 'ADMIN',
            permissions: [
              'manage_users',
              'manage_assets',
              'manage_pools',
              'manage_kyc',
              hasDefaultAdmin ? 'assign_roles' : undefined,
              hasDefaultAdmin ? 'system_settings' : undefined,
              'view_analytics',
              hasDefaultAdmin ? 'manage_contracts' : undefined
            ].filter(p => p !== undefined) as string[]
          };
        }

        if (hasAmcRole) {
          return {
            isAdmin: true,
            isSuperAdmin: false,
            isPlatformAdmin: false,
            isAmcAdmin: true,
            role: 'AMC_ADMIN',
            permissions: [
              'manage_assets',
              'manage_pools',
              'manage_kyc',
              'view_analytics'
            ]
          };
        }
      }
    } catch (error) {
      this.logger.warn('Error checking on-chain admin role:', error);
    }

    return this.getDefaultRole();
  }

  /**
   * Check environment variable admin roles (existing system)
   */
  private async checkEnvironmentAdminRole(normalizedAddress: string): Promise<AdminRole> {
    // Check super admin
    if (normalizedAddress === this.superAdminWallet) {
      return {
        isAdmin: true,
        isSuperAdmin: true,
        isPlatformAdmin: true,
        isAmcAdmin: true,
        role: 'SUPER_ADMIN',
        permissions: [
          'manage_users',
          'manage_assets',
          'manage_pools',
          'manage_kyc',
          'assign_roles',
          'system_settings',
          'view_analytics',
          'manage_contracts'
        ]
      };
    }

    // Check platform admin
    if (this.platformAdminWallets.includes(normalizedAddress)) {
      return {
        isAdmin: true,
        isSuperAdmin: false,
        isPlatformAdmin: true,
        isAmcAdmin: false,
        role: 'PLATFORM_ADMIN',
        permissions: [
          'manage_users',
          'manage_assets',
          'manage_pools',
          'manage_kyc',
          'view_analytics'
        ]
      };
    }

    // Check AMC admin
    if (this.amcAdminWallets.includes(normalizedAddress)) {
      return {
        isAdmin: true,
        isSuperAdmin: false,
        isPlatformAdmin: false,
        isAmcAdmin: true,
        role: 'AMC_ADMIN',
        permissions: [
          'manage_assets',
          'manage_pools',
          'manage_kyc',
          'view_analytics'
        ]
      };
    }

    return this.getDefaultRole();
  }


  /**
   * Assign admin role to a user (only super admin can do this)
   */
  async assignAdminRole(
    assignerWallet: string,
    targetWallet: string,
    role: string
  ): Promise<{ success: boolean; message: string }> {
    // Check if assigner is super admin
    const assignerStatus = await this.checkAdminStatus(assignerWallet);
    if (!assignerStatus.isSuperAdmin) {
      throw new UnauthorizedException('Only super admin can assign roles');
    }

    // Validate role
    if (!this.isAdminRole(role)) {
      throw new BadRequestException('Invalid admin role');
    }

    // Admin roles are managed through environment variables or database
    this.logger.log(`Admin role ${role} assigned to ${targetWallet} by ${assignerWallet}`);

    return {
      success: true,
      message: `Successfully assigned ${role} role to ${targetWallet}`
    };
  }

  /**
   * Remove admin role from a user (only super admin can do this)
   */
  async removeAdminRole(
    assignerWallet: string,
    targetWallet: string
  ): Promise<{ success: boolean; message: string }> {
    // Check if assigner is super admin
    const assignerStatus = await this.checkAdminStatus(assignerWallet);
    if (!assignerStatus.isSuperAdmin) {
      throw new UnauthorizedException('Only super admin can remove roles');
    }

    // Admin roles are managed through environment variables or database
    this.logger.log(`Admin role removed from ${targetWallet} by ${assignerWallet}`);

    return {
      success: true,
      message: `Successfully removed admin role from ${targetWallet}`
    };
  }

  /**
   * Get all admin users (blockchain-native)
   */
  async getAllAdminUsers(): Promise<any[]> {
    // In a fully blockchain-native system, admin users are managed through Hedera
    // This would typically involve querying Hedera account metadata or smart contract state
    return [];
  }

  /**
   * Check if a role is an admin role
   */
  private isAdminRole(role: string): boolean {
    return [
      'ADMIN',
      'SUPER_ADMIN',
      'PLATFORM_ADMIN',
      'AMC_ADMIN'
    ].includes(role);
  }


  /**
   * Get default non-admin role
   */
  private getDefaultRole(): AdminRole {
    return {
      isAdmin: false,
      isSuperAdmin: false,
      isPlatformAdmin: false,
      isAmcAdmin: false,
      role: 'INVESTOR',
      permissions: []
    };
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(walletAddress: string, permission: string): Promise<boolean> {
    const adminStatus = await this.checkAdminStatus(walletAddress);
    return adminStatus.permissions.includes(permission);
  }

  /**
   * Get admin statistics
   */
  async getAdminStats(): Promise<{
    totalAdmins: number;
    superAdmins: number;
    platformAdmins: number;
    amcAdmins: number;
    regularAdmins: number;
  }> {
    return {
      totalAdmins: this.adminWallets.length + this.platformAdminWallets.length + this.amcAdminWallets.length + (this.superAdminWallet ? 1 : 0),
      superAdmins: this.superAdminWallet ? 1 : 0,
      platformAdmins: this.platformAdminWallets.length,
      amcAdmins: this.amcAdminWallets.length,
      regularAdmins: this.adminWallets.length,
    };
  }

  /**
   * Approve or reject an RWA asset
   */
  async approveAsset(
    adminWallet: string,
    assetId: string,
    approved: boolean,
    comments?: string,
    verificationScore?: number
  ): Promise<{ success: boolean; message: string; asset?: any }> {
    try {
      // Check if admin has permission
      const adminStatus = await this.checkAdminStatus(adminWallet);
      if (!adminStatus.isAdmin && !adminStatus.isAmcAdmin && !adminStatus.isSuperAdmin && !adminStatus.isPlatformAdmin) {
        throw new UnauthorizedException('Insufficient permissions to approve assets');
      }

      // Find the asset by tokenContract or assetId
      const asset = await this.assetModel.findOne({ 
        $or: [
          { tokenContract: assetId },
          { assetId: assetId }
        ]
      });
      if (!asset) {
        throw new BadRequestException('Asset not found');
      }

      // Update asset status
      if (approved) {
        asset.status = AssetStatus.ACTIVE;
        asset.verificationScore = verificationScore || 85;
      } else {
        asset.status = AssetStatus.PENDING;
      }

      await asset.save();

      this.logger.log(`Asset ${assetId} ${approved ? 'approved' : 'rejected'} by admin ${adminWallet}`);

      return {
        success: true,
        message: `Asset ${approved ? 'approved' : 'rejected'} successfully`,
        asset: {
          assetId: asset.assetId,
          tokenId: asset.tokenContract,
          status: asset.status,
          verificationScore: asset.verificationScore
        }
      };
    } catch (error) {
      console.error('Error approving asset:', error);
      return {
        success: false,
        message: `Failed to ${approved ? 'approve' : 'reject'} asset: ${error.message}`
      };
    }
  }
}