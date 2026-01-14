const { ethers } = require('hardhat');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

/**
 * Verify asset status for pool creation
 * 
 * Usage:
 *   ASSET_ID=0x0607d6e995b698b538270e6dc1e18cde55130d23d8bafcacf31a6d165c7533bd npx hardhat run scripts/verify-asset-for-pool.js --network mantle_testnet
 */

async function main() {
  console.log('🔍 === VERIFYING ASSET STATUS FOR POOL CREATION ===\n');

  const assetId = process.env.ASSET_ID || '0x0607d6e995b698b538270e6dc1e18cde55130d23d8bafcacf31a6d165c7533bd';
  
  console.log('📋 Asset ID:', assetId);
  console.log('   Length:', assetId.length);
  console.log('   Is bytes32:', assetId.startsWith('0x') && assetId.length === 66);
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer address:', deployer.address);
  console.log('   Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // Load contract addresses
  const fs = require('fs');
  const path = require('path');
  const deploymentFile = path.join(__dirname, '../deployments/mantle-sepolia-latest.json');
  
  let CORE_ASSET_FACTORY_ADDRESS;
  if (fs.existsSync(deploymentFile)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    CORE_ASSET_FACTORY_ADDRESS = deployment.contracts.CoreAssetFactory;
  } else {
    CORE_ASSET_FACTORY_ADDRESS = process.env.CORE_ASSET_FACTORY_ADDRESS || '0x546d33A647Efa9fd363a908741803bF75302e7D0';
  }

  console.log('📋 Configuration:');
  console.log('   CoreAssetFactory:', CORE_ASSET_FACTORY_ADDRESS);
  console.log('');

  // Get contract instance
  const CoreAssetFactory = await ethers.getContractFactory('CoreAssetFactory');
  const coreAssetFactory = CoreAssetFactory.attach(CORE_ASSET_FACTORY_ADDRESS);

  try {
    // Convert assetId to bytes32 format
    let assetIdBytes32;
    if (assetId.startsWith('0x') && assetId.length === 66) {
      assetIdBytes32 = assetId;
    } else if (assetId.startsWith('0x') && assetId.length < 66) {
      assetIdBytes32 = ethers.zeroPadValue(assetId, 32);
    } else {
      assetIdBytes32 = ethers.id(assetId);
    }
    
    console.log('📋 Asset ID Conversion:');
    console.log('   Original:', assetId);
    console.log('   Bytes32:', assetIdBytes32);
    console.log('   Bytes32 Length:', assetIdBytes32.length);
    console.log('');

    // Try getAsset() first
    console.log('🔍 Calling getAsset()...');
    let assetResult;
    try {
      assetResult = await coreAssetFactory.getAsset(assetIdBytes32);
      console.log('✅ getAsset() succeeded');
    } catch (getAssetError) {
      console.error('❌ getAsset() failed:', getAssetError.message);
      // Try assets() mapping as fallback
      try {
        console.log('🔍 Trying assets() mapping...');
        assetResult = await coreAssetFactory.assets(assetIdBytes32);
        console.log('✅ assets() succeeded');
      } catch (assetsError) {
        console.error('❌ assets() also failed:', assetsError.message);
        throw new Error('Both getAsset() and assets() failed');
      }
    }

    // Check if asset exists (if id is zero, asset doesn't exist)
    const assetIdFromResult = assetResult.id || assetResult[0];
    const isZeroId = assetIdFromResult === ethers.ZeroHash || 
                     assetIdFromResult === '0x0000000000000000000000000000000000000000000000000000000000000000' ||
                     !assetIdFromResult;
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ASSET VERIFICATION RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (isZeroId) {
      console.log('❌ ASSET NOT FOUND ON BLOCKCHAIN');
      console.log('   Asset ID from contract is zero/empty');
      console.log('   This means the asset does not exist at this address');
      console.log('\n   Possible causes:');
      console.log('   - Asset ID format mismatch');
      console.log('   - Asset was created on a different contract');
      console.log('   - Asset was never created');
      process.exit(1);
    }
    
    console.log('✅ Asset found on blockchain');
    console.log('   Asset ID from contract:', assetIdFromResult);
    console.log('   Matches input:', assetIdFromResult.toLowerCase() === assetIdBytes32.toLowerCase());
    console.log('');

    // Extract status
    const statusNum = typeof assetResult.status === 'bigint' 
      ? Number(assetResult.status) 
      : (typeof assetResult.status === 'number' 
        ? assetResult.status 
        : (typeof assetResult.status === 'string' 
          ? parseInt(assetResult.status, 10) 
          : Number(assetResult[19] || 0)));
    
    const statusNames = {
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
    
    const statusName = statusNames[statusNum] || `UNKNOWN(${statusNum})`;
    
    console.log('📊 Asset Details:');
    console.log('   Name:', assetResult.name || assetResult[6] || 'N/A');
    console.log('   Location:', assetResult.location || assetResult[7] || 'N/A');
    console.log('   Total Value:', ethers.formatEther(assetResult.totalValue || assetResult[8] || 0n), 'TRUST');
    console.log('   Status:', statusNum, `(${statusName})`);
    console.log('   Original Owner:', assetResult.originalOwner || assetResult[1] || 'N/A');
    console.log('   Current Owner:', assetResult.currentOwner || assetResult[2] || 'N/A');
    console.log('');

    // Check if ready for pooling
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (statusNum === 6) {
      console.log('✅ ASSET IS READY FOR POOLING');
      console.log('   Status: ACTIVE_AMC_MANAGED (6)');
    } else {
      console.log('❌ ASSET IS NOT READY FOR POOLING');
      console.log(`   Current Status: ${statusNum} (${statusName})`);
      console.log('   Required Status: 6 (ACTIVE_AMC_MANAGED)');
      console.log('');
      console.log('📋 Next Steps:');
      if (statusNum === 3) {
        console.log('   1. Complete Legal Transfer (status 3 → 5)');
        console.log('   2. Activate Asset (status 5 → 6)');
      } else if (statusNum === 4) {
        console.log('   1. Complete Legal Transfer (status 4 → 5)');
        console.log('   2. Activate Asset (status 5 → 6)');
      } else if (statusNum === 5) {
        console.log('   1. Activate Asset (status 5 → 6)');
      } else {
        console.log('   1. Complete all previous steps in the AMC workflow');
        console.log('   2. Ensure asset reaches status 6 (ACTIVE_AMC_MANAGED)');
      }
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Log raw result for debugging
    console.log('🔍 Raw Asset Result (for debugging):');
    console.log('   Status (named):', assetResult.status);
    console.log('   Status (index 19):', assetResult[19]);
    console.log('   Status type:', typeof assetResult.status);
    console.log('   Full result keys:', Object.keys(assetResult || {}));
    console.log('   Result as array (first 20 indices):');
    for (let i = 0; i < 20; i++) {
      if (assetResult[i] !== undefined) {
        console.log(`     [${i}]:`, assetResult[i], `(type: ${typeof assetResult[i]})`);
      }
    }

  } catch (error) {
    console.error('\n❌ Error verifying asset:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

