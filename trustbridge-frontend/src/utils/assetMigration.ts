// Asset Migration Utility
// Migrates existing localStorage assets to HFS + Mirror Node system

import { FileCreateTransaction } from '@hashgraph/sdk';

export interface LegacyAsset {
  tokenId: string;
  fileId?: string;
  topicId?: string;
  name: string;
  description: string;
  category: number;
  assetType: string;
  location: string;
  totalValue: string;
  imageURI: string;
  documentURI: string;
  owner: string;
  status: string;
  royaltyPercentage: string;
  tags: string[];
  isTradeable: boolean;
  isAuctionable: boolean;
  currency: string;
  priceInHBAR: string;
  collection: {
    name: string;
    description: string;
    image: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetReference {
  tokenId: string;
  fileId: string;
  topicId: string;
  owner: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

class AssetMigrationService {
  /**
   * Check if migration is needed
   */
  static needsMigration(): boolean {
    const legacyAssets = JSON.parse(localStorage.getItem('digitalAssets') || '[]');
    const assetReferences = JSON.parse(localStorage.getItem('assetReferences') || '[]');
    
    return legacyAssets.length > 0 && assetReferences.length === 0;
  }

  /**
   * Get legacy assets that need migration
   */
  static getLegacyAssets(): LegacyAsset[] {
    return JSON.parse(localStorage.getItem('digitalAssets') || '[]');
  }

  /**
   * Migrate a single asset to HFS
   */
  static async migrateAssetToHFS(
    asset: LegacyAsset, 
    signer: any, 
    hederaClient: any
  ): Promise<AssetReference | null> {
    try {
      console.log(`🔄 Migrating asset ${asset.tokenId} to HFS...`);

      // Prepare metadata for HFS
      const assetMetadata = {
        name: asset.name,
        description: asset.description,
        assetType: asset.assetType,
        category: asset.category,
        location: asset.location,
        totalValue: asset.totalValue,
        royaltyPercentage: asset.royaltyPercentage,
        isTradeable: asset.isTradeable,
        isAuctionable: asset.isAuctionable,
        collection: asset.collection,
        files: [
          {
            id: 'legacy-image',
            name: 'asset-image',
            type: 'image/jpeg',
            size: 0,
            ipfsUrl: asset.imageURI,
            cid: asset.imageURI.split('/').pop()
          },
          ...(asset.documentURI ? [{
            id: 'legacy-document',
            name: 'asset-document',
            type: 'application/pdf',
            size: 0,
            ipfsUrl: asset.documentURI,
            cid: asset.documentURI.split('/').pop()
          }] : [])
        ],
        owner: asset.owner,
        currency: asset.currency,
        status: asset.status,
        createdAt: asset.createdAt || new Date().toISOString(),
        updatedAt: asset.updatedAt || new Date().toISOString()
      };

      // Create HFS file
      const fileCreateTx = new FileCreateTransaction()
        .setContents(JSON.stringify(assetMetadata, null, 2))
        .setMaxTransactionFee(1000)
        .setTransactionValidDuration(120);

      // Freeze and sign
      fileCreateTx.freezeWithSigner(signer);
      const signedFileTx = await signer.signTransaction(fileCreateTx);

      // Execute
      const fileResponse = await signedFileTx.execute(hederaClient);
      const fileReceipt = await fileResponse.getReceipt(hederaClient);
      const fileId = fileReceipt.fileId?.toString();

      if (!fileId) {
        throw new Error('File ID not found in HFS transaction receipt');
      }

      // Create asset reference
      const assetReference: AssetReference = {
        tokenId: asset.tokenId,
        fileId: fileId,
        topicId: asset.topicId || 'events-logged-in-backend',
        owner: asset.owner,
        name: asset.name,
        status: asset.status,
        createdAt: asset.createdAt || new Date().toISOString(),
        updatedAt: asset.updatedAt || new Date().toISOString()
      };

      console.log(`✅ Successfully migrated asset ${asset.tokenId} to HFS with File ID: ${fileId}`);
      return assetReference;

    } catch (error) {
      console.error(`❌ Error migrating asset ${asset.tokenId}:`, error);
      return null;
    }
  }

  /**
   * Migrate all legacy assets to HFS
   */
  static async migrateAllAssets(
    signer: any, 
    hederaClient: any,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ success: number; failed: number; references: AssetReference[] }> {
    const legacyAssets = this.getLegacyAssets();
    const references: AssetReference[] = [];
    let success = 0;
    let failed = 0;

    console.log(`🔄 Starting migration of ${legacyAssets.length} assets to HFS...`);

    for (let i = 0; i < legacyAssets.length; i++) {
      const asset = legacyAssets[i];
      
      if (onProgress) {
        onProgress(i + 1, legacyAssets.length);
      }

      const reference = await this.migrateAssetToHFS(asset, signer, hederaClient);
      
      if (reference) {
        references.push(reference);
        success++;
      } else {
        failed++;
      }

      // Add delay between transactions to avoid rate limiting
      if (i < legacyAssets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Store asset references
    if (references.length > 0) {
      const existingReferences = JSON.parse(localStorage.getItem('assetReferences') || '[]');
      const allReferences = [...existingReferences, ...references];
      localStorage.setItem('assetReferences', JSON.stringify(allReferences));
    }

    // Clear legacy assets after successful migration
    if (success > 0) {
      localStorage.removeItem('digitalAssets');
      console.log('✅ Legacy assets cleared from localStorage');
    }

    console.log(`🎉 Migration completed: ${success} successful, ${failed} failed`);
    return { success, failed, references };
  }

  /**
   * Get migration status
   */
  static getMigrationStatus(): {
    needsMigration: boolean;
    legacyCount: number;
    referenceCount: number;
  } {
    const legacyAssets = this.getLegacyAssets();
    const assetReferences = JSON.parse(localStorage.getItem('assetReferences') || '[]');
    
    return {
      needsMigration: this.needsMigration(),
      legacyCount: legacyAssets.length,
      referenceCount: assetReferences.length
    };
  }

  /**
   * Rollback migration (restore from references)
   */
  static rollbackMigration(): boolean {
    try {
      const assetReferences = JSON.parse(localStorage.getItem('assetReferences') || '[]');
      
      if (assetReferences.length === 0) {
        console.log('❌ No asset references found to rollback');
        return false;
      }

      // Convert references back to legacy format
      const legacyAssets: LegacyAsset[] = assetReferences.map((ref: AssetReference) => ({
        tokenId: ref.tokenId,
        fileId: ref.fileId,
        topicId: ref.topicId,
        name: ref.name,
        description: '', // Will be fetched from HFS if needed
        category: 0,
        assetType: 'digital',
        location: '',
        totalValue: '0',
        imageURI: '',
        documentURI: '',
        owner: ref.owner,
        status: ref.status,
        royaltyPercentage: '0',
        tags: [],
        isTradeable: true,
        isAuctionable: false,
        currency: 'HBAR',
        priceInHBAR: '0',
        collection: {
          name: '',
          description: '',
          image: ''
        },
        createdAt: ref.createdAt,
        updatedAt: ref.updatedAt
      }));

      localStorage.setItem('digitalAssets', JSON.stringify(legacyAssets));
      localStorage.removeItem('assetReferences');
      
      console.log('✅ Migration rolled back successfully');
      return true;

    } catch (error) {
      console.error('❌ Error rolling back migration:', error);
      return false;
    }
  }
}

export default AssetMigrationService;
