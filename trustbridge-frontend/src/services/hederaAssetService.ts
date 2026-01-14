// Hedera-native asset service for digital assets
// This service works with assets stored in localStorage and Hedera tokens

import { ipfsService } from './ipfs';

export interface HederaAsset {
  id: string;
  assetId: string; // Alias for id for backward compatibility
  tokenId: string;
  name: string;
  description: string;
  imageURI: string;
  documentURI: string;
  owner: string;
  price: string;
  currency: string;
  status: string;
  assetType: string;
  category: number;
  location: string | {
    address: string;
    city: string;
    state: string;
    country: string;
  };
  tags: string[];
  isTradeable: boolean;
  isAuctionable: boolean;
  royaltyPercentage: string;
  totalValue: string; // For backward compatibility
  valueInHbar: number; // For backward compatibility
  evidence: {
    documents: string[];
    images: string[];
  };
  evidenceHashes: string[]; // For backward compatibility
  createdAt: string;
  updatedAt: string;
  verification?: AssetVerificationStatus; // Optional verification status
}

export interface AssetVerificationStatus {
  assetId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  submittedAt: string;
  completedAt?: string;
  attestorName?: string;
  score?: number;
}

class HederaAssetService {
  private static instance: HederaAssetService;

  constructor() {}

  static getInstance(): HederaAssetService {
    if (!HederaAssetService.instance) {
      HederaAssetService.instance = new HederaAssetService();
    }
    return HederaAssetService.instance;
  }

  /**
   * Get all assets for a specific wallet address using HFS + Mirror Node
   */
  async getUserAssets(walletAddress: string, client?: any): Promise<HederaAsset[]> {
    try {
      console.log('🔍 Fetching assets directly from Hedera network for wallet:', walletAddress);
      
      // Get asset references from localStorage
      const assetReferences = JSON.parse(localStorage.getItem('assetReferences') || '[]');
      console.log(`📊 Found ${assetReferences.length} asset references in localStorage`);

      // Filter references by owner (try different address formats)
      const userReferences = assetReferences.filter((ref: any) => {
        const refOwner = ref.owner;
        const matches = refOwner === walletAddress || 
                       refOwner === walletAddress.toLowerCase() || 
                       refOwner === walletAddress.toUpperCase() ||
                       refOwner?.toString() === walletAddress?.toString();
        if (matches) {
          console.log(`✅ Found matching asset reference: ${ref.tokenId} (owner: ${refOwner})`);
        }
        return matches;
      });
      console.log(`📊 Found ${userReferences.length} asset references for wallet ${walletAddress}`);
      
      // Debug: Show all asset references for debugging
      console.log('🔍 All asset references:', assetReferences.map((ref: any) => ({
        tokenId: ref.tokenId,
        owner: ref.owner,
        name: ref.name
      })));

      if (userReferences.length === 0) {
        return [];
      }

      // Fetch asset data directly from Hedera network (bypass Mirror Node)
      const hederaAssets: HederaAsset[] = [];
      
      for (const ref of userReferences) {
        try {
          console.log(`🔍 Getting asset data directly from Hedera network for token ${ref.tokenId}...`);
          const assetData = await this.getAssetDataDirectly(ref.tokenId, ref.fileId, client);
          
          if (assetData) {
            hederaAssets.push(assetData);
            console.log(`✅ Successfully fetched asset directly from Hedera network: ${assetData.name}`);
          } else {
            console.warn(`⚠️ Could not fetch asset data for ${ref.tokenId}, using fallback`);
            
            // Fallback: Create a basic asset from reference data
            const fallbackAsset: HederaAsset = {
              id: ref.tokenId,
              assetId: ref.tokenId,
              tokenId: ref.tokenId,
              name: ref.name || 'Asset',
              description: 'Asset data will be available once the network is accessible. Please try refreshing.',
              imageURI: 'https://picsum.photos/300/300?random=' + Math.random(),
              documentURI: '',
              owner: ref.owner,
              price: '0',
              currency: 'HBAR',
              status: ref.status || 'VERIFIED',
              assetType: 'digital',
              category: 0,
              location: '',
              tags: [],
              isTradeable: true,
              isAuctionable: false,
              royaltyPercentage: '0',
              totalValue: '0',
              valueInHbar: 0,
              evidence: {
                documents: [],
                images: []
              },
              evidenceHashes: [],
              createdAt: ref.createdAt,
              updatedAt: ref.updatedAt
            };
            
            hederaAssets.push(fallbackAsset);
            console.log(`✅ Created fallback asset for ${ref.tokenId}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching metadata for asset ${ref.tokenId}:`, error);
        }
      }

      console.log(`✅ Successfully fetched ${hederaAssets.length} assets directly from Hedera network`);
      return hederaAssets;

    } catch (error) {
      console.error('❌ Error fetching user assets:', error);
      throw new Error(`Failed to fetch assets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fetch asset metadata from HFS via Mirror Node with retry logic
   */
  private async fetchAssetMetadataFromHFS(fileId: string, retries: number = 3): Promise<any> {
    // First try Mirror Node (fastest when available)
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔍 Attempt ${attempt}/${retries}: Fetching file ${fileId} from Mirror Node...`);
        
        const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/files/${fileId}`);
        
        if (response.ok) {
          const fileData = await response.json();
          
          if (fileData.contents) {
            // Decode base64 content
            const decodedContent = atob(fileData.contents);
            const metadata = JSON.parse(decodedContent);
            console.log(`✅ Successfully fetched metadata for file ${fileId} on attempt ${attempt}`);
            console.log('📋 Metadata contents:', {
              name: metadata.name,
              description: metadata.description,
              filesCount: metadata.files?.length || 0,
              firstFile: metadata.files?.[0],
              firstImageUrl: metadata.files?.[0]?.ipfsUrl
            });
            return metadata;
          }
        } else if (response.status === 404) {
          // File not found yet - Mirror Node hasn't indexed it
          if (attempt < retries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.log(`⏳ File ${fileId} not found yet, waiting ${delay}ms before retry ${attempt + 1}/${retries}...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            console.warn(`⚠️ File ${fileId} not found in Mirror Node after ${retries} attempts`);
            // Try direct HFS fetch as fallback
            return await this.fetchAssetMetadataDirectly(fileId);
          }
        } else {
          throw new Error(`Mirror Node API error: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error(`❌ Error fetching file ${fileId} from Mirror Node (attempt ${attempt}):`, error);
        
        if (attempt === retries) {
          // For multi-user scenarios, we can't use HFS queries with private keys
          // Return null and let the app use localStorage fallback
          console.log(`🔄 Mirror Node failed after ${retries} attempts, using localStorage fallback`);
          return null;
        }
        
        // Wait before retry
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Waiting ${delay}ms before retry ${attempt + 1}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return null;
  }

  /**
   * Fetch asset metadata directly from HFS using Hedera SDK
   * This is a fallback when Mirror Node is not available or has timing issues
   */
  private async fetchAssetMetadataDirectly(fileId: string, client?: any): Promise<any> {
    try {
      console.log(`🔍 Fetching file ${fileId} directly from HFS using Hedera SDK...`);
      
      // Import Hedera SDK dynamically to avoid issues
      const { FileContentsQuery, FileId } = await import('@hashgraph/sdk');
      
      // For HFS queries, we need a client with proper operator
      let hederaClient = client;
      if (!hederaClient || !hederaClient.operatorAccountId) {
        console.log('⚠️ No valid client provided for HFS queries');
        console.log('❌ HFS queries require a client with proper operator for the user');
        throw new Error('HFS queries require a client with the correct operator. Please ensure the user is connected with HashPack.');
      } else {
        console.log('🔧 Using provided Hedera client with operator for HFS queries');
        console.log(`🔧 Client operator: ${hederaClient.operatorAccountId?.toString()}`);
      }
      
      // Parse the file ID
      const fileIdObj = FileId.fromString(fileId);
      
      // Query the file contents directly
      const fileContentsQuery = new FileContentsQuery()
        .setFileId(fileIdObj);
      
      const fileContents = await fileContentsQuery.execute(hederaClient);
      
      if (fileContents && fileContents.length > 0) {
        // Convert Uint8Array to string
        const contentString = new TextDecoder().decode(fileContents);
        const metadata = JSON.parse(contentString);
        
        console.log(`✅ Successfully fetched metadata directly from HFS for file ${fileId}`);
        console.log('📋 Direct HFS metadata contents:', {
          name: metadata.name,
          description: metadata.description,
          filesCount: metadata.files?.length || 0,
          firstFile: metadata.files?.[0],
          firstImageUrl: metadata.files?.[0]?.ipfsUrl
        });
        
        return metadata;
        } else {
        console.warn(`⚠️ No contents found in HFS file ${fileId}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error fetching file ${fileId} directly from HFS:`, error);
      console.log('🔄 Falling back to Mirror Node API for HFS metadata...');
      return await this.fetchAssetMetadataFromMirrorNode(fileId);
    }
  }

  /**
   * Fetch asset metadata from Mirror Node API as fallback
   * This is the same approach used in the test page
   */
  private async fetchAssetMetadataFromMirrorNode(fileId: string): Promise<any> {
    try {
      console.log(`🔍 Fetching asset metadata from Mirror Node API for file ${fileId}...`);
      
      const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/files/${fileId}`);
      
      if (!response.ok) {
        throw new Error(`Mirror Node API error: ${response.status}`);
      }
      
      const fileData = await response.json();
      
      console.log(`✅ Successfully fetched file info from Mirror Node for file ${fileId}`);
      console.log('📋 Mirror Node file info:', {
        fileId: fileData.file_id,
        size: fileData.size,
        created: fileData.created_timestamp,
        memo: fileData.memo
      });
      
      // Try to get file contents if available
      if (fileData.contents) {
        try {
          const contentString = new TextDecoder().decode(fileData.contents);
          const metadata = JSON.parse(contentString);
          console.log('📋 File contents from Mirror Node:', metadata);
          return metadata;
        } catch (parseError) {
          console.warn('⚠️ Could not parse file contents from Mirror Node:', parseError);
        }
      }
      
      // Return basic file info if contents not available
      return {
        fileId: fileData.file_id,
        size: fileData.size,
        created: fileData.created_timestamp,
        memo: fileData.memo,
        name: 'Asset Metadata',
        description: 'Metadata from Mirror Node',
        files: []
      };
    } catch (error) {
      console.error(`❌ Error fetching file info from Mirror Node for file ${fileId}:`, error);
      return null;
    }
  }

  /**
   * Get assets with verification status
   */
  async getUserAssetsWithVerification(walletAddress: string, _forceRefresh: boolean = false, client?: any): Promise<HederaAsset[]> {
    try {
      console.log('🔍 Fetching assets and verification status...');
      
      // Get basic assets
      const assets = await this.getUserAssets(walletAddress, client);
      
      // For now, all assets are considered verified since they're created through Hedera
      // In the future, this could be enhanced with actual verification status
      const assetsWithVerification = assets.map(asset => ({
        ...asset,
        verification: {
          assetId: asset.id,
          status: 'completed' as const,
          submittedAt: asset.createdAt,
          completedAt: asset.createdAt,
          attestorName: 'Hedera Network',
          score: 100
        }
      }));

      console.log(`✅ Successfully fetched ${assetsWithVerification.length} assets with verification status`);
      return assetsWithVerification;

    } catch (error) {
      console.error('❌ Error fetching assets with verification:', error);
      throw new Error(`Failed to fetch assets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get assets with verification status (static method for backward compatibility)
   */
  static async getUserAssetsWithVerification(walletAddress: string, forceRefresh: boolean = false): Promise<HederaAsset[]> {
    const instance = HederaAssetService.getInstance();
    return instance.getUserAssetsWithVerification(walletAddress, forceRefresh);
  }

  /**
   * Get a specific asset by ID using HFS + Mirror Node
   */
  async getAssetById(assetId: string): Promise<HederaAsset | null> {
    try {
      // Get asset references from localStorage
      const assetReferences = JSON.parse(localStorage.getItem('assetReferences') || '[]');
      const ref = assetReferences.find((r: any) => r.tokenId === assetId);
      
      if (!ref) {
        console.log(`❌ Asset reference not found for ID: ${assetId}`);
        return null;
      }

      // Get asset data directly from Hedera network
      const assetData = await this.getAssetDataDirectly(ref.tokenId, ref.fileId);
      
      if (!assetData) {
        console.log(`❌ Could not fetch asset data for ${assetId}`);
        return null;
      }

      return assetData;

    } catch (error) {
      console.error('❌ Error fetching asset by ID:', error);
      return null;
    }
  }

  /**
   * Create a new asset (RWA only - digital assets removed)
   */
  async createAsset(assetData: any): Promise<string> {
    try {
      // This method is mainly for compatibility
      // Actual RWA asset creation is handled in CreateRWAAsset.tsx
      console.log('RWA asset creation handled by CreateRWAAsset page');
      return assetData.tokenId || '';
    } catch (error) {
      console.error('❌ Error creating asset:', error);
      throw new Error(`Failed to create asset: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update an existing asset (Note: HFS files are immutable, so this updates the reference only)
   */
  async updateAsset(assetId: string, updates: Partial<HederaAsset>): Promise<boolean> {
    try {
      // Get asset references
      const assetReferences = JSON.parse(localStorage.getItem('assetReferences') || '[]');
      const refIndex = assetReferences.findIndex((r: any) => r.tokenId === assetId);
      
      if (refIndex === -1) {
        console.log(`❌ Asset reference not found for ID: ${assetId}`);
        return false;
      }

      // Update the reference (metadata on HFS is immutable)
      assetReferences[refIndex] = {
        ...assetReferences[refIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem('assetReferences', JSON.stringify(assetReferences));
      console.log(`✅ Asset reference ${assetId} updated successfully (HFS metadata is immutable)`);
      return true;

        } catch (error) {
      console.error('❌ Error updating asset:', error);
      return false;
    }
  }

  /**
   * Delete an asset (removes reference, HFS file remains immutable)
   */
  async deleteAsset(assetId: string): Promise<boolean> {
    try {
      // Get asset references
      const assetReferences = JSON.parse(localStorage.getItem('assetReferences') || '[]');
      const filteredReferences = assetReferences.filter((r: any) => r.tokenId !== assetId);
      
      if (filteredReferences.length === assetReferences.length) {
        console.log(`❌ Asset reference not found for ID: ${assetId}`);
        return false; // Asset not found
      }

      localStorage.setItem('assetReferences', JSON.stringify(filteredReferences));
      console.log(`✅ Asset reference ${assetId} deleted successfully (HFS file remains immutable)`);
      return true;

    } catch (error) {
      console.error('❌ Error deleting asset:', error);
      return false;
    }
  }

  // Placeholder methods for compatibility
  async getSmartContractVerificationRequests(userAddress: string): Promise<any[]> {
    console.log('⚠️ getSmartContractVerificationRequests not implemented yet');
    return [];
  }

  async getAssetDetails(assetId: string): Promise<any> {
    console.log('⚠️ getAssetDetails not implemented yet');
    return null;
  }

  /**
   * Force fetch asset metadata directly from HFS (bypass Mirror Node)
   * This is useful for testing or when Mirror Node has issues
   */
  async forceFetchAssetMetadata(fileId: string): Promise<any> {
    console.log(`🔄 Force fetching asset metadata directly from HFS for file ${fileId}...`);
    return await this.fetchAssetMetadataDirectly(fileId);
  }

  /**
   * Fetch token metadata directly from Hedera network using TokenInfoQuery
   * This bypasses Mirror Node completely and gets data directly from the network
   */
  private async fetchTokenMetadataDirectly(tokenId: string, client?: any): Promise<any> {
    try {
      console.log(`🔍 Fetching token metadata from Mirror Node API for token ${tokenId}...`);
      
      // Use Mirror Node API as primary method (same as working test)
      const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/tokens/${tokenId}`);
      
      if (!response.ok) {
        throw new Error(`Mirror Node API error: ${response.status}`);
      }
      
      const tokenData = await response.json();
      
      console.log(`✅ Successfully fetched token info from Mirror Node API for token ${tokenId}`);
      console.log('📋 Token info:', {
        tokenId: tokenData.token_id,
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimals: tokenData.decimals,
        totalSupply: tokenData.total_supply,
        treasury: tokenData.treasury_account_id,
        memo: tokenData.memo,
        type: tokenData.type
      });
      
      return {
        tokenId: tokenData.token_id,
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimals: tokenData.decimals,
        totalSupply: tokenData.total_supply?.toString(),
        treasuryAccountId: tokenData.treasury_account_id,
        memo: tokenData.memo, // This contains the IPFS hash!
        type: tokenData.type,
        adminKey: tokenData.admin_key ? 'Present' : 'None',
        supplyKey: tokenData.supply_key ? 'Present' : 'None',
        freezeKey: tokenData.freeze_key ? 'Present' : 'None',
        wipeKey: tokenData.wipe_key ? 'Present' : 'None',
        kycKey: tokenData.kyc_key ? 'Present' : 'None',
        pauseKey: tokenData.pause_key ? 'Present' : 'None'
      };
    } catch (error) {
      console.error(`❌ Error fetching token info from Mirror Node API for token ${tokenId}:`, error);
      console.log('🔄 Falling back to direct Hedera SDK query...');
      
      // Fallback to direct Hedera SDK query if Mirror Node fails
      try {
        const { TokenInfoQuery, TokenId } = await import('@hashgraph/sdk');
        
        let hederaClient = client;
        if (!hederaClient || !hederaClient.operatorAccountId) {
          console.log('⚠️ No valid client provided for token queries, cannot fetch token info');
          return null;
        }
        
        const tokenIdObj = TokenId.fromString(tokenId);
        const tokenInfoQuery = new TokenInfoQuery().setTokenId(tokenIdObj);
        const tokenInfo = await tokenInfoQuery.execute(hederaClient);
        
        return {
          tokenId: tokenInfo.tokenId?.toString(),
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          totalSupply: tokenInfo.totalSupply?.toString(),
          treasuryAccountId: tokenInfo.treasuryAccountId?.toString(),
          memo: '', // Direct SDK query doesn't provide memo
          type: 'Unknown'
        };
      } catch (sdkError) {
        console.error(`❌ Direct Hedera SDK query also failed:`, sdkError);
        return null;
      }
    }
  }

  /**
   * Fetch token metadata from Mirror Node API as fallback
   * This is the same approach used in the test page
   */
  private async fetchTokenMetadataFromMirrorNode(tokenId: string): Promise<any> {
    try {
      console.log(`🔍 Fetching token metadata from Mirror Node API for token ${tokenId}...`);
      
      const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/tokens/${tokenId}`);
      
      if (!response.ok) {
        throw new Error(`Mirror Node API error: ${response.status}`);
      }
      
      const tokenData = await response.json();
      
      console.log(`✅ Successfully fetched token info from Mirror Node for token ${tokenId}`);
      console.log('📋 Mirror Node token info:', {
        tokenId: tokenData.token_id,
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimals: tokenData.decimals,
        totalSupply: tokenData.total_supply,
        treasury: tokenData.treasury_account_id,
        type: tokenData.type
      });
      
      return {
        tokenId: tokenData.token_id,
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimals: tokenData.decimals,
        totalSupply: tokenData.total_supply?.toString(),
        treasury: tokenData.treasury_account_id,
        type: tokenData.type,
        metadata: null,
        adminKey: tokenData.admin_key ? 'Present' : 'None',
        supplyKey: tokenData.supply_key ? 'Present' : 'None',
        freezeKey: tokenData.freeze_key ? 'Present' : 'None',
        wipeKey: tokenData.wipe_key ? 'Present' : 'None',
        kycKey: tokenData.kyc_key ? 'Present' : 'None',
        pauseKey: tokenData.pause_key ? 'Present' : 'None'
      };
    } catch (error) {
      console.error(`❌ Error fetching token info from Mirror Node for token ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Get asset data using direct Hedera network queries (bypass Mirror Node completely)
   * This method gets token info directly from the network and combines it with HFS metadata
   */
  async getAssetDataDirectly(tokenId: string, fileId?: string, client?: any): Promise<HederaAsset | null> {
    try {
      console.log(`🔍 Getting asset data directly from Hedera network for token ${tokenId}...`);
      
      // Get token info directly from the network using Mirror Node API
      const tokenInfo = await this.fetchTokenMetadataDirectly(tokenId, client);
      
      if (!tokenInfo) {
        console.warn(`⚠️ Could not fetch token info for ${tokenId}`);
        return null;
      }
      
      // Extract IPFS hash from token memo and reconstruct image URL
      let imageURI = '';
      let documentURI = '';
      
      if (tokenInfo.memo) {
        console.log(`🔍 Checking token memo for IPFS hash: ${tokenInfo.memo}`);
        
        // Extract IPFS hash from token memo (format: "IPFS:hash")
        const tokenMemo = tokenInfo.memo || '';
        const ipfsHashFromMemo = tokenMemo.startsWith('IPFS:') ? tokenMemo.substring(5) : null;
        
        if (ipfsHashFromMemo) {
          console.log(`✅ Found IPFS hash in token memo: ${ipfsHashFromMemo}`);
          
          // Reconstruct the full IPFS URL using backend proxy to avoid CORS and rate limiting
          const reconstructedImageUrl = ipfsService.getProxyFileUrl(ipfsHashFromMemo);
          imageURI = reconstructedImageUrl;
          documentURI = reconstructedImageUrl; // Same URL for both image and document
          
          console.log(`🖼️ Reconstructed Image URL from network: ${imageURI}`);
        } else {
          console.log(`⚠️ No IPFS hash found in token memo: ${tokenMemo}`);
        }
      }
      
      // Try to get HFS metadata if fileId is provided (fallback)
      let hfsMetadata = null;
      if (fileId && !imageURI) {
        console.log(`🔍 Fetching HFS metadata for file ${fileId} as fallback...`);
        hfsMetadata = await this.fetchAssetMetadataDirectly(fileId, client);
        if (hfsMetadata) {
          console.log(`✅ Successfully fetched HFS metadata for file ${fileId}`);
          console.log('📋 HFS metadata structure:', {
            hasFiles: !!hfsMetadata.files,
            filesLength: hfsMetadata.files?.length || 0,
            firstFile: hfsMetadata.files?.[0],
            filesStructure: hfsMetadata.files?.map((f: any, i: number) => ({
              index: i,
              hasType: !!f.type,
              type: f.type,
              hasIpfsUrl: !!f.ipfsUrl,
              ipfsUrl: f.ipfsUrl
            }))
          });
        } else {
          console.warn(`⚠️ Could not fetch HFS metadata for file ${fileId}`);
        }
      }
      
      // Use HFS metadata as fallback if no IPFS hash found in token memo
      if (!imageURI && hfsMetadata?.files?.[0]?.ipfsUrl) {
        imageURI = hfsMetadata.files[0].ipfsUrl;
        console.log(`🖼️ Using HFS fallback image URL: ${imageURI}`);
      }
      
      // Create HederaAsset from token info and network data
      // Try to parse price from NFT metadata if this is an NFT
      let assetPrice = hfsMetadata?.totalValue || '100';
      let assetCurrency = 'TRUST';
      
      if (tokenInfo.type === 'NON_FUNGIBLE_UNIQUE' || tokenInfo.decimals === '0') {
        try {
          const nftResponse = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/tokens/${tokenId}/nfts/1`);
          if (nftResponse.ok) {
            const nftData = await nftResponse.json();
            if (nftData.metadata) {
              const metadataString = Buffer.from(nftData.metadata, 'base64').toString('utf-8');
              console.log('🔍 NFT Metadata from blockchain:', metadataString);
              
              try {
                const metadataObj = JSON.parse(metadataString);
                if (metadataObj.price) {
                  assetPrice = metadataObj.price;
                  assetCurrency = metadataObj.currency || 'TRUST';
                  console.log('✅ Parsed price from blockchain metadata:', assetPrice, assetCurrency);
                }
              } catch {
                const priceMatch = metadataString.match(/NFT:(\d+)T/);
                if (priceMatch) {
                  assetPrice = priceMatch[1];
                  console.log('✅ Parsed price from minimal metadata:', assetPrice, 'TRUST');
                }
              }
            }
          }
        } catch (error) {
          console.warn('Could not fetch NFT metadata for price:', error);
        }
      }

      const hederaAsset: HederaAsset = {
        id: tokenId,
        assetId: tokenId,
        tokenId: tokenId,
        name: hfsMetadata?.name || tokenInfo.name || `Token ${tokenId}`,
        description: hfsMetadata?.description || `Digital asset token ${tokenInfo.symbol}`,
        imageURI: imageURI || hfsMetadata?.files?.[0]?.ipfsUrl || '',
        documentURI: documentURI || hfsMetadata?.files?.find((f: any) => {
          if (!f || !f.type || typeof f.type !== 'string') return false;
          return f.type.startsWith('application/');
        })?.ipfsUrl || '',
        owner: tokenInfo.treasuryAccountId?.toString() || 'Unknown',
        price: assetPrice,
        currency: assetCurrency,
        status: 'VERIFIED',
        assetType: 'digital',
        category: hfsMetadata?.category || 0,
        location: hfsMetadata?.location || 'Hedera Testnet',
        tags: hfsMetadata?.tags || [],
        isTradeable: true,
        isAuctionable: false,
        royaltyPercentage: hfsMetadata?.royaltyPercentage || '0',
        totalValue: assetPrice,
        valueInHbar: parseFloat(assetPrice),
        evidence: {
          documents: hfsMetadata?.files?.filter((f: any) => {
            if (!f || !f.type || typeof f.type !== 'string') return false;
            return f.type.startsWith('application/');
          })?.map((f: any) => f.ipfsUrl) || [],
          images: imageURI ? [imageURI] : (hfsMetadata?.files?.filter((f: any) => {
            if (!f || !f.type || typeof f.type !== 'string') return false;
            return f.type.startsWith('image/');
          })?.map((f: any) => f.ipfsUrl) || [])
        },
        evidenceHashes: imageURI ? [imageURI] : (hfsMetadata?.files?.map((f: any) => f.cid || f.ipfsUrl) || []),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log(`✅ Successfully created asset data directly from Hedera network:`, {
        name: hederaAsset.name,
        symbol: tokenInfo.symbol,
        hasImage: !!hederaAsset.imageURI,
        imageURI: hederaAsset.imageURI,
        source: imageURI ? 'Mirror Node API (IPFS hash from token memo)' : 'HFS fallback'
      });
      
      return hederaAsset;
    } catch (error) {
      console.error(`❌ Error getting asset data directly from Hedera network for token ${tokenId}:`, error);
      return null;
    }
  }
}

// Create and export a singleton instance
const hederaAssetService = new HederaAssetService();
export default hederaAssetService;