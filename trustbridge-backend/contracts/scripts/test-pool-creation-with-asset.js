const { ethers } = require('hardhat');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

/**
 * Test pool creation with a specific asset
 * 
 * Usage:
 *   ASSET_ID=0x... npx hardhat run scripts/test-pool-creation-with-asset.js --network mantle_testnet
 */

async function main() {
  console.log('🧪 === TESTING POOL CREATION WITH ASSET ===\n');

  // Get asset ID from environment
  const ASSET_ID = process.env.ASSET_ID || '0xe0e2e348433e5e985ce6edc008dd888063c74c3c40333ecff3402a3ffd9c3a6b';
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('👤 Testing with account:', deployer.address);
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
      PoolManager: process.env.POOL_MANAGER_ADDRESS || '0x56535279704A7936621b84FFD5e9Cc1eD3c4093a',
      CoreAssetFactory: process.env.CORE_ASSET_FACTORY_ADDRESS || '0x3d047913e2D9852D24b9758D0804eF4C081Cdc7a',
    };
  }

  const POOL_MANAGER_ADDRESS = contractAddresses.PoolManager;
  const CORE_ASSET_FACTORY_ADDRESS = contractAddresses.CoreAssetFactory;

  console.log('📋 Contract Addresses:');
  console.log('   PoolManager:', POOL_MANAGER_ADDRESS);
  console.log('   CoreAssetFactory:', CORE_ASSET_FACTORY_ADDRESS);
  console.log('   Asset ID:', ASSET_ID);
  console.log('');

  // Get contract instances
  const PoolManager = await ethers.getContractFactory('PoolManager');
  const poolManager = PoolManager.attach(POOL_MANAGER_ADDRESS);

  const CoreAssetFactory = await ethers.getContractFactory('CoreAssetFactory');
  const coreAssetFactory = CoreAssetFactory.attach(CORE_ASSET_FACTORY_ADDRESS);

  // ========================================
  // STEP 1: Check Asset Status
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: Checking Asset Status');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const asset = await coreAssetFactory.getAsset(ASSET_ID);
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

    console.log('📊 Asset Information:');
    console.log('   Asset ID:', ASSET_ID);
    console.log('   Name:', asset.name);
    console.log('   Status:', statusNum, `(${statusNames[statusNum] || 'UNKNOWN'})`);
    console.log('   Original Owner:', asset.originalOwner);
    console.log('   Current Owner:', asset.currentOwner);
    console.log('   Total Value:', ethers.formatEther(asset.totalValue), 'TRUST');
    console.log('');

    // Check if asset is already in a pool
    const assetToPool = await poolManager.assetToPool(ASSET_ID);
    if (assetToPool !== ethers.ZeroHash) {
      console.log('⚠️  Asset is already in a pool!');
      console.log('   Pool ID:', assetToPool);
      console.log('   Cannot add to another pool.\n');
      return;
    }

    if (statusNum !== 6) {
      console.log('❌ Asset is NOT ready for pooling!');
      console.log(`   Current status: ${statusNum} (${statusNames[statusNum]})`);
      console.log(`   Required status: 6 (ACTIVE_AMC_MANAGED)`);
      console.log('');
      return;
    }

    console.log('✅ Asset is ACTIVE_AMC_MANAGED - Ready for pooling!');
    console.log('✅ Asset is not already in a pool\n');

  } catch (error) {
    console.error('❌ Failed to check asset:', error.message);
    throw error;
  }

  // ========================================
  // STEP 2: Check AMC_ROLE
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: Checking AMC_ROLE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const AMC_ROLE = await poolManager.AMC_ROLE();
  const hasAMCRole = await poolManager.hasRole(AMC_ROLE, deployer.address);
  console.log('   Deployer has AMC_ROLE:', hasAMCRole ? '✅ YES' : '❌ NO');

  if (!hasAMCRole) {
    console.error('\n❌ Deployer does not have AMC_ROLE!');
    console.error('   Cannot create pools without AMC_ROLE.');
    console.error('   Run: npm run grant:amc-role-poolmanager');
    process.exit(1);
  }
  console.log('');

  // ========================================
  // STEP 3: Create Pool with Tranches
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: Creating Pool with Tranches');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const poolName = 'Test Pool ' + Date.now();
  const poolDescription = 'Test pool for asset: ' + ASSET_ID.substring(0, 10) + '...';
  const managementFee = 300; // 3% in basis points
  const performanceFee = 1000; // 10% in basis points
  const seniorPercentage = 7000; // 70% in basis points
  const seniorAPY = 800; // 8% in basis points
  const juniorAPY = 1500; // 15% in basis points
  const seniorSymbol = 'TSEN';
  const juniorSymbol = 'TJUN';

  console.log('📝 Pool Details:');
  console.log('   Name:', poolName);
  console.log('   Description:', poolDescription);
  console.log('   Management Fee:', managementFee, 'basis points (3%)');
  console.log('   Performance Fee:', performanceFee, 'basis points (10%)');
  console.log('   Senior Percentage:', seniorPercentage, 'basis points (70%)');
  console.log('   Senior APY:', seniorAPY, 'basis points (8%)');
  console.log('   Junior APY:', juniorAPY, 'basis points (15%)');
  console.log('');

  let poolId, seniorTrancheId, juniorTrancheId;
  
  try {
    console.log('⏳ Creating pool with tranches...');
    const createTx = await poolManager.createPoolWithTranches(
      poolName,
      poolDescription,
      managementFee,
      performanceFee,
      seniorPercentage,
      seniorAPY,
      juniorAPY,
      seniorSymbol,
      juniorSymbol
    );
    
    const receipt = await createTx.wait();
    console.log('   ✅ Pool creation transaction sent!');
    console.log('   Transaction hash:', receipt.hash);

    // Get pool ID and tranche IDs from events
    const poolCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = poolManager.interface.parseLog(log);
        return parsed && parsed.name === 'PoolCreated';
      } catch {
        return false;
      }
    });

    const trancheCreatedEvents = receipt.logs.filter(log => {
      try {
        const parsed = poolManager.interface.parseLog(log);
        return parsed && parsed.name === 'TrancheCreated';
      } catch {
        return false;
      }
    });

    if (poolCreatedEvent) {
      const parsed = poolManager.interface.parseLog(poolCreatedEvent);
      poolId = parsed.args.poolId;
      console.log('   ✅ Pool created successfully!');
      console.log('   Pool ID:', poolId);
    }

    if (trancheCreatedEvents.length >= 2) {
      const seniorParsed = poolManager.interface.parseLog(trancheCreatedEvents[0]);
      const juniorParsed = poolManager.interface.parseLog(trancheCreatedEvents[1]);
      
      seniorTrancheId = seniorParsed.args.trancheId;
      juniorTrancheId = juniorParsed.args.trancheId;
      
      console.log('   ✅ Tranches created successfully!');
      console.log('   Senior Tranche ID:', seniorTrancheId);
      console.log('   Junior Tranche ID:', juniorTrancheId);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error('   ❌ Failed to create pool:', error.message);
    if (error.message.includes('AccessControl')) {
      console.error('   ⚠️  Access denied - check AMC_ROLE');
    }
    if (error.message.includes('revert')) {
      console.error('   ⚠️  Transaction reverted - check parameters');
      console.error('   Full error:', error);
    }
    throw error;
  }

  if (!poolId) {
    console.error('❌ Pool ID not found in events!');
    return;
  }

  // ========================================
  // STEP 4: Add Asset to Pool
  // ========================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4: Adding Asset to Pool');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    console.log('⏳ Adding asset to pool...');
    console.log('   Pool ID:', poolId);
    console.log('   Asset ID:', ASSET_ID);
    
    // Double-check asset status before adding
    const asset = await coreAssetFactory.getAsset(ASSET_ID);
    console.log('   Asset Status:', Number(asset.status), '(should be 6)');
    console.log('   Asset Owner:', asset.currentOwner);
    console.log('   Pool Creator:', deployer.address);
    
    if (asset.currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log('   ⚠️  Warning: Asset owner does not match pool creator');
    }

    const addAssetTx = await poolManager.addAssetToPool(poolId, ASSET_ID);
    const addReceipt = await addAssetTx.wait();
    
    console.log('   ✅ Asset added to pool successfully!');
    console.log('   Transaction hash:', addReceipt.hash);

    // Verify asset was added
    const poolInfo = await poolManager.getPool(poolId);
    console.log('\n📊 Pool Information After Adding Asset:');
    console.log('   Assets in pool:', poolInfo.assets.length);
    console.log('   Asset IDs:', poolInfo.assets);
    
    if (poolInfo.assets.includes(ASSET_ID)) {
      console.log('   ✅ Asset confirmed in pool!');
    } else {
      console.log('   ⚠️  Asset not found in pool assets array');
    }

    // Verify assetToPool mapping
    const mappedPoolId = await poolManager.assetToPool(ASSET_ID);
    if (mappedPoolId === poolId) {
      console.log('   ✅ Asset-to-pool mapping confirmed!');
    } else {
      console.log('   ⚠️  Asset-to-pool mapping mismatch');
      console.log('   Expected:', poolId);
      console.log('   Got:', mappedPoolId);
    }

  } catch (error) {
    console.error('   ❌ Failed to add asset to pool:', error.message);
    
    // Detailed error analysis
    if (error.message.includes('Pool not found')) {
      console.error('   ⚠️  Pool does not exist');
    } else if (error.message.includes('Not the pool creator')) {
      console.error('   ⚠️  Only the pool creator can add assets');
      console.error('   Pool creator must match the address calling addAssetToPool');
    } else if (error.message.includes('Asset not AMC managed')) {
      console.error('   ⚠️  Asset status must be ACTIVE_AMC_MANAGED (status 6)');
    } else if (error.message.includes('Asset already in pool')) {
      console.error('   ⚠️  Asset is already assigned to another pool');
    } else if (error.message.includes('AccessControl')) {
      console.error('   ⚠️  Access denied - check AMC_ROLE');
    } else if (error.message.includes('revert')) {
      console.error('   ⚠️  Transaction reverted');
      console.error('   Full error:', error);
    }
    
    throw error;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ TEST SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Asset status check: PASSED');
  console.log('✅ AMC_ROLE check: PASSED');
  console.log('✅ Pool creation: PASSED');
  console.log('✅ Asset addition: PASSED');
  console.log('\n🎉 Pool creation with asset completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

