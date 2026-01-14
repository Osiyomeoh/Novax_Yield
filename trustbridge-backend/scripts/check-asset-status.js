#!/usr/bin/env node

/**
 * Script to check asset status on-chain
 * Usage: node scripts/check-asset-status.js <assetId or assetName>
 * 
 * Example: node scripts/check-asset-status.js dem101
 * Example: node scripts/check-asset-status.js 0xe0e2e348433e5e985ce6edc008dd888063c74c3c40333ecff3402a3ffd9c3a6b
 */

require('dotenv').config();
const { ethers } = require('ethers');

// Asset status enum
const AssetStatus = {
  0: 'PENDING_VERIFICATION',
  1: 'VERIFIED_PENDING_AMC',
  2: 'AMC_INSPECTION_SCHEDULED',
  3: 'AMC_INSPECTION_COMPLETED',
  4: 'LEGAL_TRANSFER_PENDING',
  5: 'LEGAL_TRANSFER_COMPLETED',
  6: 'ACTIVE_AMC_MANAGED',
  7: 'DIGITAL_VERIFIED',
  8: 'DIGITAL_ACTIVE',
  9: 'REJECTED',
  10: 'FLAGGED'
};

const assetIdentifier = process.argv[2];

if (!assetIdentifier) {
  console.error('❌ Error: Asset ID or name is required');
  console.log('Usage: node scripts/check-asset-status.js <assetId or assetName>');
  console.log('Example: node scripts/check-asset-status.js dem101');
  console.log('Example: node scripts/check-asset-status.js 0xe0e2e348433e5e985ce6edc008dd888063c74c3c40333ecff3402a3ffd9c3a6b');
  process.exit(1);
}

// CoreAssetFactory ABI (minimal for getAsset)
const CoreAssetFactoryABI = [
  'function getAsset(bytes32) external view returns (bytes32,address,address,uint8,uint8,string,string,string,uint256,uint256,uint8,string[],string[],string,string,string,address,uint256,uint8,address,uint256,uint256,uint256,uint256,uint256,bool,bool,uint256,uint256,address,uint256)'
];

async function checkAssetStatus() {
  try {
    const rpcUrl = process.env.MANTLE_RPC_URL || 'https://rpc.sepolia.mantle.xyz';
    const coreAssetFactoryAddress = process.env.CORE_ASSET_FACTORY_ADDRESS || '0x3d047913e2D9852D24b9758D0804eF4C081Cdc7a';
    
    console.log('🔌 Connecting to Mantle network...');
    console.log(`   RPC URL: ${rpcUrl}`);
    console.log(`   CoreAssetFactory: ${coreAssetFactoryAddress}`);
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const factory = new ethers.Contract(coreAssetFactoryAddress, CoreAssetFactoryABI, provider);
    
    // Convert asset identifier to bytes32
    let assetIdBytes32;
    if (assetIdentifier.startsWith('0x') && assetIdentifier.length === 66) {
      // Already a bytes32 hash
      assetIdBytes32 = assetIdentifier;
    } else {
      // Assume it's a name/string, hash it
      assetIdBytes32 = ethers.id(assetIdentifier);
    }
    
    console.log(`\n🔍 Checking asset: ${assetIdentifier}`);
    console.log(`   Asset ID (bytes32): ${assetIdBytes32}`);
    
    console.log('\n📡 Fetching asset from blockchain...');
    const assetResult = await factory.getAsset(assetIdBytes32);
    
    // Handle both object and array responses (ethers v6 can return either)
    const asset = {
      id: assetResult.id || assetResult[0],
      originalOwner: assetResult.originalOwner || assetResult[1],
      currentOwner: assetResult.currentOwner || assetResult[2],
      category: typeof assetResult.category === 'bigint' ? Number(assetResult.category) : (assetResult[3] || 0),
      assetType: typeof assetResult.assetType === 'bigint' ? Number(assetResult.assetType) : (assetResult[4] || 0),
      assetTypeString: assetResult.assetTypeString || assetResult[5] || '',
      name: assetResult.name || assetResult[6] || '',
      location: assetResult.location || assetResult[7] || '',
      totalValue: assetResult.totalValue || assetResult[8] || 0n,
      maturityDate: assetResult.maturityDate || assetResult[9] || 0n,
      verificationLevel: typeof assetResult.verificationLevel === 'bigint' ? Number(assetResult.verificationLevel) : (assetResult[10] || 0),
      evidenceHashes: assetResult.evidenceHashes || assetResult[11] || [],
      documentTypes: assetResult.documentTypes || assetResult[12] || [],
      imageURI: assetResult.imageURI || assetResult[13] || '',
      documentURI: assetResult.documentURI || assetResult[14] || '',
      description: assetResult.description || assetResult[15] || '',
      nftContract: assetResult.nftContract || assetResult[16] || '',
      tokenId: assetResult.tokenId || assetResult[17] || 0n,
      status: typeof assetResult.status === 'bigint' ? Number(assetResult.status) : (typeof assetResult.status === 'number' ? assetResult.status : (assetResult[18] || 0)),
      currentAMC: assetResult.currentAMC || assetResult[19] || '',
      createdAt: assetResult.createdAt || assetResult[20] || 0n,
      verifiedAt: assetResult.verifiedAt || assetResult[21] || 0n,
      amcTransferredAt: assetResult.amcTransferredAt || assetResult[22] || 0n,
      tradingVolume: assetResult.tradingVolume || assetResult[23] || 0n,
      lastSalePrice: assetResult.lastSalePrice || assetResult[24] || 0n,
      isTradeable: assetResult.isTradeable !== undefined ? assetResult.isTradeable : (assetResult[25] || false),
      isListed: assetResult.isListed !== undefined ? assetResult.isListed : (assetResult[26] || false),
      listingPrice: assetResult.listingPrice || assetResult[27] || 0n,
      listingExpiry: assetResult.listingExpiry || assetResult[28] || 0n,
      currentBuyer: assetResult.currentBuyer || assetResult[29] || '',
      currentOffer: assetResult.currentOffer || assetResult[30] || 0n,
    };
    
    const statusNum = asset.status;
    const statusName = AssetStatus[statusNum] || `UNKNOWN(${statusNum})`;
    
    console.log('\n✅ Asset found on-chain:');
    console.log(`   Name: ${asset.name}`);
    console.log(`   Asset ID: ${asset.id}`);
    console.log(`   Current Owner: ${asset.currentOwner}`);
    console.log(`   Current AMC: ${asset.currentAMC}`);
    console.log(`   Status: ${statusNum} (${statusName})`);
    console.log(`   Category: ${asset.category}`);
    console.log(`   Type: ${asset.assetTypeString}`);
    console.log(`   Location: ${asset.location}`);
    console.log(`   Value: ${ethers.formatEther(asset.totalValue)} ETH`);
    console.log(`   Created At: ${asset.createdAt > 0 ? new Date(Number(asset.createdAt) * 1000).toISOString() : 'N/A'}`);
    console.log(`   Verified At: ${asset.verifiedAt > 0 ? new Date(Number(asset.verifiedAt) * 1000).toISOString() : 'N/A'}`);
    console.log(`   AMC Transferred At: ${asset.amcTransferredAt > 0 ? new Date(Number(asset.amcTransferredAt) * 1000).toISOString() : 'N/A'}`);
    console.log(`   Is Tradeable: ${asset.isTradeable}`);
    console.log(`   Is Listed: ${asset.isListed}`);
    
    console.log('\n📊 Status Analysis:');
    if (statusNum === 6) {
      console.log('   ✅ Asset is ACTIVE_AMC_MANAGED - Ready for pooling!');
    } else if (statusNum === 5) {
      console.log('   ⚠️  Asset is LEGAL_TRANSFER_COMPLETED - Needs activation');
    } else if (statusNum === 4) {
      console.log('   ⚠️  Asset is LEGAL_TRANSFER_PENDING - Needs completion');
    } else if (statusNum === 3) {
      console.log('   ⚠️  Asset is INSPECTION_COMPLETED - Needs legal transfer');
    } else if (statusNum === 2) {
      console.log('   ⚠️  Asset is INSPECTION_SCHEDULED - Needs completion');
    } else {
      console.log(`   ⚠️  Asset status is ${statusName} - Not ready for pooling (needs status 6)`);
    }
    
  } catch (error) {
    console.error('\n❌ Error checking asset:', error.message);
    if (error.reason) {
      console.error(`   Reason: ${error.reason}`);
    }
    if (error.message.includes('execution reverted')) {
      console.error('   Asset may not exist on-chain, or contract call failed');
    }
    process.exit(1);
  }
}

checkAssetStatus();

