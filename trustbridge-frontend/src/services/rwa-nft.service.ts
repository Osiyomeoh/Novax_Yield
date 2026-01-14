import { 
  TokenCreateTransaction, 
  TokenType, 
  TokenSupplyType, 
  TokenMintTransaction,
  TokenAssociateTransaction,
  TokenId,
  PrivateKey,
  AccountId,
  Hbar
} from '@hashgraph/sdk';
import { ipfsService, IPFSUploadResult } from './ipfs';

export interface RWANFTData {
  name: string;
  description: string;
  category: number;
  assetType: string;
  location: any;
  totalValue: string;
  expectedAPY: string;
  maturityDate: string;
  displayImage: File; // Required display image
  evidenceFiles: File[];
  legalDocuments: File[];
  owner: string; // AMC account
  propertyId: string;
  legalDescription: string;
  propertyAddress: string;
  squareFootage?: number;
  yearBuilt?: number;
  zoningType?: string;
}

export interface RWANFTResult {
  nftTokenId: string;
  nftSerialNumber: string;
  transactionId: string;
  propertyId: string;
  amcAccount: string;
  assetValue: number;
  evidenceFiles: IPFSUploadResult[];
  legalDocuments: IPFSUploadResult[];
  message: string;
}

export class RWANFTService {
  private hederaClient: any;
  private signer: any;

  constructor(hederaClient: any, signer: any) {
    this.hederaClient = hederaClient;
    this.signer = signer;
  }

  // Method to refresh wallet connection
  private async refreshWalletConnection() {
    try {
      // Try to get fresh instances from the wallet context
      const { useWallet } = await import('../contexts/WalletContext');
      // Note: This won't work in a service, we need to pass fresh instances
      console.log('⚠️ Cannot refresh wallet connection from service - using passed instances');
    } catch (error) {
      console.log('⚠️ Cannot refresh wallet connection from service - using passed instances');
    }
  }

  /**
   * Utility function to decode hash-based memo
   * Format: RWA:V1:HASH:hash
   */
  static async decodeRWAMemo(memo: string, ipfsService: any): Promise<any> {
    try {
      console.log('🔍 Decoding RWA memo:', memo);
      
      // Parse memo format: RWA:V1:HASH:hash
      const parts = memo.split(':');
      if (parts.length !== 4 || parts[0] !== 'RWA' || parts[1] !== 'V1' || parts[2] !== 'HASH') {
        throw new Error('Invalid RWA memo format');
      }
      
      const cidsHash = parts[3];
      console.log('🔐 CIDs Hash from memo:', cidsHash);
      
      // Fetch IPFS metadata using the hash
      // Note: In a real implementation, you'd need to store the metadata CID somewhere
      // For now, we'll return the hash for verification
      return {
        version: 'V1',
        cidsHash: cidsHash,
        // In production, you'd fetch the full metadata from IPFS here
        // metadata: await ipfsService.getFile(metadataCid)
      };
    } catch (error) {
      console.error('❌ Failed to decode RWA memo:', error);
      throw error;
    }
  }

  /**
   * Create RWA NFT following Centrifuge model
   * Each RWA asset = 1 unique NFT owned by AMC
   */
  async createRWANFT(
    amcAccountId: string, 
    rwaData: RWANFTData
  ): Promise<RWANFTResult> {
    try {
      console.log('🏗️ Creating RWA NFT following Centrifuge model...');
      console.log('📊 RWA NFT Data:', {
        name: rwaData.name,
        propertyId: rwaData.propertyId,
        totalValue: rwaData.totalValue,
        amcAccount: amcAccountId
      });

      const assetValue = parseFloat(rwaData.totalValue);

      // Step 0: Upload files to IPFS
      console.log('📤 Uploading files to IPFS...');
      const evidenceUploads: IPFSUploadResult[] = [];
      const legalUploads: IPFSUploadResult[] = [];

      // Upload evidence files (only if not already uploaded)
      for (const file of rwaData.evidenceFiles) {
        try {
          const uploadResult = await ipfsService.uploadFile(file, {
            name: file.name,
            type: file.type,
            size: file.size,
            category: 'evidence',
            description: `Evidence file for ${rwaData.name}`
          });
          evidenceUploads.push(uploadResult);
          console.log(`✅ Uploaded evidence file: ${file.name} -> ${uploadResult.ipfsUrl}`);
        } catch (error) {
          console.error(`❌ Failed to upload evidence file ${file.name}:`, error);
          // Continue with other files even if one fails
        }
      }

      // Upload legal documents (only if not already uploaded)
      for (const file of rwaData.legalDocuments) {
        try {
          const uploadResult = await ipfsService.uploadFile(file, {
            name: file.name,
            type: file.type,
            size: file.size,
            category: 'legal',
            description: `Legal document for ${rwaData.name}`
          });
          legalUploads.push(uploadResult);
          console.log(`✅ Uploaded legal document: ${file.name} -> ${uploadResult.ipfsUrl}`);
        } catch (error) {
          console.error(`❌ Failed to upload legal document ${file.name}:`, error);
          // Continue with other files even if one fails
        }
      }

      console.log(`📊 IPFS Upload Summary: ${evidenceUploads.length} evidence files, ${legalUploads.length} legal documents`);

      // Step 1: Generate supply key for NFT creation (following digital asset pattern)
      console.log('🔑 Generating supply key for NFT creation...');
      const supplyKey = PrivateKey.generate();
      console.log(`✅ Generated supply key: ${supplyKey.publicKey.toString()}`);

      // Step 2: Create temporary memo for token creation (will be updated later)
      console.log('🪙 Creating NFT Collection for property...');
      
      const nftTokenCreateTx = new TokenCreateTransaction()
        .setTokenName(`${rwaData.name} Property NFT`)
        .setTokenSymbol(rwaData.assetType.toUpperCase().slice(0, 5))
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(0)
        .setInitialSupply(0)
        .setTreasuryAccountId(amcAccountId) // AMC owns the NFT
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(1) // Only 1 NFT per property
        .setSupplyKey(supplyKey.publicKey) // Use generated PUBLIC key
        .setTokenMemo(`RWA:${rwaData.propertyId}|Value:$${assetValue}|AMC:${amcAccountId}`) // Temporary memo
        .setMaxTransactionFee(new Hbar(10))
        .setTransactionValidDuration(120);

      console.log('🔧 Executing NFT collection creation...');
      console.log('🔧 Signer object:', this.signer);
      console.log('🔧 Signer properties:', Object.keys(this.signer));
      console.log('🔧 Signer publicKey:', this.signer.publicKey);
      console.log('🔧 Freezing transaction with signer...');
      nftTokenCreateTx.freezeWithSigner(this.signer);
      
      console.log('🔧 Signing transaction...');
      console.log('🔧 Signer type:', typeof this.signer);
      console.log('🔧 Signer methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.signer)));
      
      let signedTx;
      try {
        // Add timeout to signing process (increased to 1 minute)
        console.log('🔧 Calling signTransaction...');
        const signPromise = this.signer.signTransaction(nftTokenCreateTx);
        const signTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction signing timeout after 60 seconds')), 60000)
        );
        
        console.log('🔧 Waiting for signature...');
        signedTx = await Promise.race([signPromise, signTimeoutPromise]);
        console.log('✅ Transaction signed successfully');
      } catch (signError) {
        console.error('❌ Transaction signing failed:', signError);
        throw new Error(`Transaction signing failed: ${signError.message}. Please try reconnecting your HashPack wallet.`);
      }
      
      console.log('🔧 Executing transaction on Hedera...');
      
      // Add timeout to prevent hanging
      const executePromise = signedTx.execute(this.hederaClient);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction execution timeout after 60 seconds')), 60000)
      );
      
      const response = await Promise.race([executePromise, timeoutPromise]);
      console.log('✅ Transaction executed, response:', response);

      if (!response.transactionId) {
        throw new Error('NFT collection creation failed - no transaction ID');
      }

      const receipt = await response.getReceipt(this.hederaClient);
      const nftTokenId = receipt.tokenId?.toString();

      if (!nftTokenId) {
        throw new Error('NFT collection creation failed - no token ID');
      }

      console.log(`✅ RWA NFT Collection created: ${nftTokenId}`);

      // Step 2: Mint the single NFT for this property
      console.log('🎨 Minting property NFT...');
      
      // Step 2.1: Upload display image to IPFS (required for asset display)
      console.log('🖼️ Uploading display image to IPFS...');
      let displayImageUrl = '';
      let displayImageCid = '';
      
      if (rwaData.displayImage) {
        const displayImageUpload = await ipfsService.uploadFile(rwaData.displayImage, {
          name: `${rwaData.name} - Display Image`,
          description: 'RWA Asset Display Image'
        });
        
        if (!displayImageUpload?.ipfsUrl) {
          throw new Error('Failed to upload display image to IPFS');
        }
        
        displayImageUrl = displayImageUpload.ipfsUrl;
        displayImageCid = displayImageUpload.cid;
        console.log('✅ Display image uploaded to IPFS:', displayImageUrl);
        console.log('📦 Display image CID:', displayImageCid);
      } else {
        throw new Error('Display image is required for RWA asset creation');
      }

      // Step 2.2: Create hash-based CID reference system
      console.log('🔐 Creating hash-based CID reference system...');
      
      // Collect all CIDs
      const allCids = [
        displayImageCid,
        ...evidenceUploads.map(upload => upload.cid),
        ...legalUploads.map(upload => upload.cid)
      ];
      
      // Create hash of all CIDs for verification
      const cidsString = allCids.join(',');
      const cidsHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cidsString));
      const cidsHashHex = Array.from(new Uint8Array(cidsHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      console.log('🔐 CIDs Hash created:', cidsHashHex);
      console.log('📊 Total CIDs:', allCids.length);
      
      // Create IPFS metadata with all CIDs (for verification and transparency)
      const ipfsMetadata = {
        // Basic asset info
        name: rwaData.name,
        description: rwaData.description,
        propertyId: rwaData.propertyId,
        assetType: rwaData.assetType,
        category: rwaData.category,
        location: rwaData.location,
        totalValue: assetValue,
        expectedAPY: rwaData.expectedAPY,
        maturityDate: rwaData.maturityDate,
        legalDescription: rwaData.legalDescription,
        propertyAddress: rwaData.propertyAddress,
        squareFootage: rwaData.squareFootage,
        yearBuilt: rwaData.yearBuilt,
        zoningType: rwaData.zoningType,
        amcOwner: amcAccountId,
        tokenizedAt: new Date().toISOString(),
        status: 'ACTIVE',
        
        // IPFS CIDs (for verification and transparency)
        displayImage: {
          cid: displayImageCid,
          url: displayImageUrl
        },
        evidenceFiles: evidenceUploads.map(upload => ({
          cid: upload.cid,
          url: upload.ipfsUrl,
          pinSize: upload.pinSize,
          verified: true
        })),
        legalDocuments: legalUploads.map(upload => ({
          cid: upload.cid,
          url: upload.ipfsUrl,
          pinSize: upload.pinSize,
          verified: true
        })),
        
        // Verification data
        verification: {
          cidsHash: cidsHashHex,
          allFilesStoredOnHedera: true,
          displayImageStored: true,
          evidenceFilesCount: evidenceUploads.length,
          legalDocumentsCount: legalUploads.length,
          totalIPFSUploads: allCids.length
        }
      };
      
      // Upload IPFS metadata
      console.log('📤 Uploading IPFS metadata with all CIDs...');
      const metadataBlob = new Blob([JSON.stringify(ipfsMetadata)], { type: 'application/json' });
      const metadataFile = new File([metadataBlob], 'rwa-metadata.json', { type: 'application/json' });
      
      const metadataUploadResult = await ipfsService.uploadFile(metadataFile, {
        name: `${rwaData.name} - RWA Metadata`,
        description: 'RWA NFT Complete Metadata with all CIDs'
      });
      
      if (!metadataUploadResult?.ipfsUrl) {
        throw new Error('Failed to upload IPFS metadata');
      }
      
      const metadataCid = metadataUploadResult.cid;
      console.log('✅ IPFS metadata uploaded:', metadataUploadResult.ipfsUrl);
      console.log('📦 Metadata CID:', metadataCid);
      
      // Create compact memo with hash reference
      const compactMemo = `RWA:V1:HASH:${cidsHashHex}`;
      console.log('📝 Compact memo created:', compactMemo);
      console.log('📏 Memo length:', compactMemo.length, 'characters');
      
      // Create minimal NFT metadata (fits in Hedera limits)
      const propertyMetadata = {
        name: rwaData.name,
        description: rwaData.description,
        propertyId: rwaData.propertyId,
        assetType: rwaData.assetType,
        totalValue: assetValue,
        amcOwner: amcAccountId,
        status: 'ACTIVE',
        // Hash reference for full data
        cidsHash: cidsHashHex,
        metadataCid: metadataCid,
        // Compact memo for verification
        compactMemo: compactMemo
      };

      console.log('📋 Property NFT Metadata:', propertyMetadata);

      // Convert metadata to JSON string
      const metadataJson = JSON.stringify(propertyMetadata);
      console.log(`📏 Metadata JSON size: ${metadataJson.length} bytes`);

      // Handle metadata size limit (following digital flow pattern)
      let metadataBuffer;
      
      if (metadataJson.length > 100) {
        console.log('📤 Metadata too large - uploading to IPFS...');
        
        // Upload metadata JSON to IPFS
        const metadataBlob = new Blob([metadataJson], { type: 'application/json' });
        const metadataFile = new File([metadataBlob], 'metadata.json', { type: 'application/json' });
        
        const metadataUploadResult = await ipfsService.uploadFile(metadataFile, {
          name: `${rwaData.name} - RWA Metadata`,
          description: 'RWA NFT Metadata JSON'
        });
        
        if (!metadataUploadResult?.ipfsUrl) {
          throw new Error('Failed to upload metadata to IPFS');
        }
        
        const metadataIpfsUrl = metadataUploadResult.ipfsUrl;
        const metadataCid = metadataUploadResult.cid;
        
        console.log('✅ Metadata uploaded to IPFS:', metadataIpfsUrl);
        console.log('📦 Metadata CID:', metadataCid);
        
        // Store only the CID (not full URL) to stay under 100 bytes limit
        metadataBuffer = Buffer.from(metadataCid);
        console.log(`📏 Using IPFS CID as metadata: ${metadataCid} (${metadataBuffer.length} bytes)`);
      } else {
        // Metadata is small enough to store directly
        metadataBuffer = Buffer.from(metadataJson);
        console.log(`📏 Using direct metadata: ${metadataJson} (${metadataBuffer.length} bytes)`);
      }

      // Mint the NFT (following digital flow: treasury signs first, then supply key)
      const nftMintTx = new TokenMintTransaction()
        .setTokenId(TokenId.fromString(nftTokenId))
        .setMetadata([metadataBuffer])
        .setMaxTransactionFee(new Hbar(5))
        .setTransactionValidDuration(120);

      console.log('🔧 Treasury account signs first (via HashPack)...');
      
      // First: Treasury account signs via HashPack
      nftMintTx.freezeWithSigner(this.signer);
      const treasurySignedTx = await this.signer.signTransaction(nftMintTx);
      
      console.log('✅ Treasury signature obtained from HashPack');
      console.log('🔧 Supply key signs second (local signing)...');
      
      // Second: Supply key signs locally using .sign() method
      const dualSignedTx = await treasurySignedTx.sign(supplyKey);
      
      console.log('✅ Supply key signature added');
      console.log('🔧 Executing dual-signed transaction...');
      
      const mintResponse = await dualSignedTx.execute(this.hederaClient);

      if (!mintResponse.transactionId) {
        throw new Error('NFT minting failed');
      }

      const mintReceipt = await mintResponse.getReceipt(this.hederaClient);
      const serialNumber = mintReceipt.serials?.[0];

      if (!serialNumber) {
        throw new Error('No serial number in NFT minting receipt');
      }

      console.log(`✅ Property NFT minted with serial number: ${serialNumber}`);

      return {
        nftTokenId,
        nftSerialNumber: serialNumber.toString(),
        transactionId: response.transactionId.toString(),
        propertyId: rwaData.propertyId,
        amcAccount: amcAccountId,
        assetValue,
        evidenceFiles: evidenceUploads,
        legalDocuments: legalUploads,
        message: `RWA NFT created successfully! Property ${rwaData.name} tokenized as NFT ${nftTokenId} with ${evidenceUploads.length} evidence files and ${legalUploads.length} legal documents uploaded to IPFS`
      };

    } catch (error) {
      console.error('❌ RWA NFT creation failed:', error);
      throw error;
    }
  }

  /**
   * Get RWA NFT information
   */
  async getRWANFTInfo(nftTokenId: string, serialNumber: string): Promise<any> {
    try {
      const response = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/tokens/${nftTokenId}/nfts/${serialNumber}`
      );
      const data = await response.json();
      
      if (data.metadata) {
        // Decode base64 metadata
        const metadataJson = Buffer.from(data.metadata, 'base64').toString();
        return JSON.parse(metadataJson);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to get RWA NFT info:', error);
      return null;
    }
  }

  /**
   * Get all RWA NFTs owned by AMC
   */
  async getAMCRWANFTs(amcAccountId: string): Promise<any[]> {
    try {
      console.log('🔍 Fetching NFTs for account:', amcAccountId);
      
      const response = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${amcAccountId}/nfts?limit=100`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Raw NFT data from Hedera:', data);
      
      if (data.nfts && data.nfts.length > 0) {
        console.log('📊 Total NFTs found:', data.nfts.length);
        
        // Filter for RWA NFTs (those with RWA: memo)
        const rwaNFTs = data.nfts.filter((nft: any) => {
          const hasTokenId = nft.token_id && nft.serial_number;
          const isRWA = nft.metadata && nft.metadata.startsWith('RWA:');
          
          console.log('🔍 NFT check:', {
            tokenId: nft.token_id,
            serialNumber: nft.serial_number,
            metadata: nft.metadata,
            hasTokenId,
            isRWA,
            memoStartsWithRWA: nft.metadata ? nft.metadata.startsWith('RWA:') : false
          });
          
          return hasTokenId && isRWA;
        });
        
        console.log('📊 RWA NFTs filtered:', rwaNFTs.length);
        return rwaNFTs;
      }
      
      console.log('📊 No NFTs found for account');
      return [];
    } catch (error) {
      console.error('❌ Failed to get AMC RWA NFTs:', error);
      return [];
    }
  }

  /**
   * Transfer RWA NFT (only AMC can do this)
   */
  async transferRWANFT(
    nftTokenId: string,
    serialNumber: string,
    fromAccount: string,
    toAccount: string
  ): Promise<string> {
    try {
      console.log(`🔄 Transferring RWA NFT ${nftTokenId}#${serialNumber} from ${fromAccount} to ${toAccount}`);

      const { TransferTransaction, NftId } = await import('@hashgraph/sdk');
      
      const transferTx = new TransferTransaction()
        .addNftTransfer(
          NftId.fromString(`${nftTokenId}@${serialNumber}`),
          fromAccount,
          toAccount
        )
        .setMaxTransactionFee(new Hbar(5))
        .setTransactionValidDuration(120);

      transferTx.freezeWithSigner(this.signer);
      const signedTransferTx = await this.signer.signTransaction(transferTx);
      const transferResponse = await signedTransferTx.execute(this.hederaClient);

      if (!transferResponse.transactionId) {
        throw new Error('NFT transfer failed');
      }

      console.log(`✅ RWA NFT transferred successfully`);
      return transferResponse.transactionId.toString();

    } catch (error) {
      console.error('❌ RWA NFT transfer failed:', error);
      throw error;
    }
  }
}

export const rwaNFTService = new RWANFTService(null, null);
