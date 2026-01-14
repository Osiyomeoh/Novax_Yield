const { ethers } = require('hardhat');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

/**
 * Check asset status on-chain
 * 
 * Usage:
 *   ASSET_ID=0xe0e2e348433e5e985ce6edc008dd888063c74c3c40333ecff3402a3ffd9c3a6b npx hardhat run scripts/check-asset-status.js --network mantle_testnet
 */

async function main() {
  console.log('🔍 === CHECKING ASSET STATUS ON-CHAIN ===\n');

  const ASSET_ID = process.env.ASSET_ID || '0xe0e2e348433e5e985ce6edc008dd888063c74c3c40333ecff3402a3ffd9c3a6b';
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('👤 Checking with account:', deployer.address);
  console.log('   Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // Load contract addresses
  const fs = require('fs');
  const path = require('path');
  const deploymentFile = path.join(__dirname, '../deployments/mantle-sepolia-latest.json');
  
  let contractAddresses = {};
  if (fs.existsSync(deploymentFile)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    contractAddresses = deployment.contracts || {};
  } else {
    contractAddresses = {
      CoreAssetFactory: process.env.CORE_ASSET_FACTORY_ADDRESS || '0x3d047913e2D9852D24b9758D0804eF4C081Cdc7a',
      PoolManager: process.env.POOL_MANAGER_ADDRESS || '0x56535279704A7936621b84FFD5e9Cc1eD3c4093a',
    };
  }

  const CORE_ASSET_FACTORY_ADDRESS = contractAddresses.CoreAssetFactory;
  const POOL_MANAGER_ADDRESS = contractAddresses.PoolManager;

  console.log('📋 Contract Addresses:');
  console.log('   CoreAssetFactory:', CORE_ASSET_FACTORY_ADDRESS);
  console.log('   PoolManager:', POOL_MANAGER_ADDRESS);
  console.log('   Asset ID:', ASSET_ID);
  console.log('');

  // Get contract instances
  const CoreAssetFactory = await ethers.getContractFactory('CoreAssetFactory');
  const coreAssetFactory = CoreAssetFactory.attach(CORE_ASSET_FACTORY_ADDRESS);

  const PoolManager = await ethers.getContractFactory('PoolManager');
  const poolManager = PoolManager.attach(POOL_MANAGER_ADDRESS);

  // Convert assetId to bytes32 if needed
  const assetIdBytes32 = ASSET_ID.startsWith('0x') && ASSET_ID.length === 66
    ? ASSET_ID
    : ethers.id(ASSET_ID);

  console.log('📝 Asset ID Formats:');
  console.log('   Original:', ASSET_ID);
  console.log('   Bytes32:', assetIdBytes32);
  console.log('   Match:', ASSET_ID.toLowerCase() === assetIdBytes32.toLowerCase() ? '✅ YES' : '❌ NO');
  console.log('');

  try {
    // Check asset using CoreAssetFactory.getAsset() - same as contract does
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: Checking Asset via CoreAssetFactory.getAsset()');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let asset;
    try {
      asset = await coreAssetFactory.getAsset(assetIdBytes32);
      console.log('✅ Asset found via getAsset()');
    } catch (error) {
      console.error('❌ Failed to get asset via getAsset():', error.message);
      console.log('   Trying with original asset ID...');
      try {
        asset = await coreAssetFactory.getAsset(ASSET_ID);
        console.log('✅ Asset found via getAsset() with original ID');
      } catch (error2) {
        console.error('❌ Failed with original ID too:', error2.message);
        throw error2;
      }
    }

    // Extract status
    const statusNum = Number(asset.status);
    
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

    console.log('\n📊 Asset Information:');
    console.log('   Asset ID:', assetIdBytes32);
    console.log('   Name:', asset.name);
    console.log('   Status:', statusNum, `(${statusNames[statusNum] || 'UNKNOWN'})`);
    console.log('   Original Owner:', asset.originalOwner);
    console.log('   Current Owner:', asset.currentOwner);
    console.log('   Total Value:', ethers.formatEther(asset.totalValue), 'TRUST');
    console.log('   Current AMC:', asset.currentAMC);
    console.log('');

    // Check if asset is ready for pooling
    if (statusNum === 6) {
      console.log('✅ Asset is ACTIVE_AMC_MANAGED (status 6) - Ready for pooling!');
    } else {
      console.log('❌ Asset is NOT ACTIVE_AMC_MANAGED (status 6)');
      console.log(`   Current status: ${statusNum} (${statusNames[statusNum]})`);
      console.log(`   Required status: 6 (ACTIVE_AMC_MANAGED)`);
    }

    // Check if asset is already in a pool
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Checking if Asset is Already in a Pool');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const assetToPool = await poolManager.assetToPool(assetIdBytes32);
    if (assetToPool !== ethers.ZeroHash) {
      console.log('⚠️  Asset is already in a pool!');
      console.log('   Pool ID:', assetToPool);
    } else {
      console.log('✅ Asset is not in any pool');
    }

    // Check what PoolManager contract would see
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: Simulating PoolManager.addAssetToPool() Check');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('The PoolManager contract checks:');
    console.log('   1. assetFactory.getAsset(_assetId)');
    console.log('   2. asset.status == CoreAssetFactory.AssetStatus.ACTIVE_AMC_MANAGED');
    console.log('');

    // Check enum value
    const ACTIVE_AMC_MANAGED_ENUM = 6; // This should match the enum value
    console.log(`   Asset status from contract: ${statusNum}`);
    console.log(`   ACTIVE_AMC_MANAGED enum value: ${ACTIVE_AMC_MANAGED_ENUM}`);
    console.log(`   Match: ${statusNum === ACTIVE_AMC_MANAGED_ENUM ? '✅ YES' : '❌ NO'}`);

    if (statusNum !== ACTIVE_AMC_MANAGED_ENUM) {
      console.log('\n❌ This is why PoolManager.addAssetToPool() would fail!');
      console.log(`   The contract sees status ${statusNum}, but requires ${ACTIVE_AMC_MANAGED_ENUM}`);
    } else {
      console.log('\n✅ Asset status matches - PoolManager.addAssetToPool() should succeed');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('revert')) {
      console.error('   Transaction would revert - asset might not exist or have wrong format');
    }
    throw error;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ CHECK COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });
