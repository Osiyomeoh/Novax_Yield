const { ethers } = require('hardhat');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

/**
 * Check asset status before adding to pool
 * 
 * Usage:
 *   ASSET_ID=0x0607d6e995b698b538270e6dc1e18cde55130d23d8bafcacf31a6d165c7533bd npx hardhat run scripts/check-asset-before-pool.js --network mantle_testnet
 */

async function main() {
  console.log('🔍 === CHECKING ASSET STATUS BEFORE POOL ADDITION ===\n');

  const assetId = process.env.ASSET_ID || '0x0607d6e995b698b538270e6dc1e18cde55130d23d8bafcacf31a6d165c7533bd';
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('👤 Checking with account:', deployer.address);
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
  console.log('   Asset ID:', assetId);
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
    console.log('');

    // Call getAsset()
    console.log('🔍 Calling getAsset()...');
    const assetResult = await coreAssetFactory.getAsset(assetIdBytes32);
    console.log('✅ getAsset() succeeded\n');

    // Log all possible status locations
    console.log('📊 Status Extraction Analysis:');
    console.log('   assetResult.status (named):', assetResult.status, `(type: ${typeof assetResult.status})`);
    console.log('   assetResult[17]:', assetResult[17], `(type: ${typeof assetResult[17]})`);
    console.log('   assetResult[18]:', assetResult[18], `(type: ${typeof assetResult[18]})`);
    console.log('   assetResult[19]:', assetResult[19], `(type: ${typeof assetResult[19]})`);
    console.log('   assetResult[20]:', assetResult[20], `(type: ${typeof assetResult[20]})`);
    console.log('');

    // Extract status using same logic as backend
    let assetStatus;
    if (typeof assetResult.status === 'number' && !isNaN(assetResult.status)) {
      assetStatus = assetResult.status;
      console.log('✅ Using named property (number):', assetStatus);
    } else if (typeof assetResult.status === 'bigint') {
      assetStatus = Number(assetResult.status);
      console.log('✅ Using named property (bigint):', assetStatus);
    } else if (typeof assetResult.status === 'string') {
      assetStatus = parseInt(assetResult.status, 10);
      console.log('✅ Using named property (string):', assetStatus);
    } else if (assetResult[19] !== undefined) {
      assetStatus = typeof assetResult[19] === 'bigint' ? Number(assetResult[19]) : Number(assetResult[19] || 0);
      console.log('✅ Using index [19]:', assetStatus);
    } else if (assetResult[17] !== undefined) {
      const val17 = typeof assetResult[17] === 'bigint' ? Number(assetResult[17]) : Number(assetResult[17] || 0);
      if (val17 <= 10) {
        assetStatus = val17;
        console.log('⚠️ Using index [17] (might be wrong):', assetStatus);
      } else {
        assetStatus = 0;
        console.log('❌ Index [17] is not a valid status, defaulting to 0');
      }
    } else {
      assetStatus = 0;
      console.log('❌ Could not extract status, defaulting to 0');
    }

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

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESULT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Asset ID: ${assetIdBytes32}`);
    console.log(`Name: ${assetResult.name || assetResult[6] || 'N/A'}`);
    console.log(`Status: ${assetStatus} (${statusNames[assetStatus] || 'UNKNOWN'})`);
    console.log(`Ready for Pool: ${assetStatus === 6 ? '✅ YES' : '❌ NO'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (assetStatus !== 6) {
      console.log('❌ Asset is NOT ready for pooling. Current status:', assetStatus, `(${statusNames[assetStatus]})`);
      console.log('   Required status: 6 (ACTIVE_AMC_MANAGED)');
      process.exit(1);
    } else {
      console.log('✅ Asset is ready for pooling!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

