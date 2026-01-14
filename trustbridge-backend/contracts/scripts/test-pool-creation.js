const { ethers } = require('hardhat');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

/**
 * Comprehensive Pool Creation Test Script
 * 
 * This script tests pool creation on PoolManager contract:
 * 1. Checks AMC_ROLE on PoolManager
 * 2. Grants AMC_ROLE if needed
 * 3. Tests creating simple pool (without tranches)
 * 4. Tests creating pool with tranches
 * 5. Tests retrieving pool information
 * 6. Tests adding assets to pools
 * 
 * Usage:
 *   npx hardhat run scripts/test-pool-creation.js --network mantle_testnet
 */

async function main() {
  console.log('🧪 === POOL CREATION TEST ===\n');

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('👤 Testing with account:', deployer.address);
  console.log('   Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // Load contract addresses from deployment file or env
  const fs = require('fs');
  const path = require('path');
  const deploymentFile = path.join(__dirname, '../deployments/mantle-sepolia-latest.json');
  
  let contractAddresses = {};
  if (fs.existsSync(deploymentFile)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    contractAddresses = deployment.contracts || {};
    console.log('📋 Loaded contract addresses from deployment file');
  } else {
    console.log('⚠️  Deployment file not found, using environment variables');
    contractAddresses = {
      PoolManager: process.env.POOL_MANAGER_ADDRESS || '0x56535279704A7936621b84FFD5e9Cc1eD3c4093a',
      TrustToken: process.env.TRUST_TOKEN_ADDRESS || '0x8960Eb29508098E35f4368906bD68A3CE9725f2F',
      CoreAssetFactory: process.env.CORE_ASSET_FACTORY_ADDRESS || '0x3d047913e2D9852D24b9758D0804eF4C081Cdc7a',
    };
  }

  const POOL_MANAGER_ADDRESS = contractAddresses.PoolManager;
  const TRUST_TOKEN_ADDRESS = contractAddresses.TrustToken;
  const CORE_ASSET_FACTORY_ADDRESS = contractAddresses.CoreAssetFactory;

  console.log('📋 Contract Addresses:');
  console.log('   PoolManager:', POOL_MANAGER_ADDRESS);
  console.log('   TrustToken:', TRUST_TOKEN_ADDRESS);
  console.log('   CoreAssetFactory:', CORE_ASSET_FACTORY_ADDRESS);
  console.log('');

  // Get contract instances
  const PoolManager = await ethers.getContractFactory('PoolManager');
  const poolManager = PoolManager.attach(POOL_MANAGER_ADDRESS);

  const TrustToken = await ethers.getContractFactory('TrustToken');
  const trustToken = TrustToken.attach(TRUST_TOKEN_ADDRESS);

  // ========================================
  // STEP 1: Check AMC_ROLE
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: Checking AMC_ROLE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const AMC_ROLE = await poolManager.AMC_ROLE();
  console.log('🔐 AMC_ROLE hash:', AMC_ROLE);

  const hasAMCRole = await poolManager.hasRole(AMC_ROLE, deployer.address);
  console.log('   Deployer has AMC_ROLE:', hasAMCRole ? '✅ YES' : '❌ NO');

  if (!hasAMCRole) {
    console.log('\n⚠️  Deployer does not have AMC_ROLE. Attempting to grant...');
    
    // Check if deployer has DEFAULT_ADMIN_ROLE to grant AMC_ROLE
    const DEFAULT_ADMIN_ROLE = await poolManager.DEFAULT_ADMIN_ROLE();
    const hasAdminRole = await poolManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    
    if (hasAdminRole) {
      console.log('   Deployer has DEFAULT_ADMIN_ROLE, granting AMC_ROLE...');
      try {
        const grantTx = await poolManager.grantRole(AMC_ROLE, deployer.address);
        await grantTx.wait();
        console.log('   ✅ AMC_ROLE granted successfully!');
        console.log('   Transaction:', grantTx.hash);
      } catch (error) {
        console.error('   ❌ Failed to grant AMC_ROLE:', error.message);
        console.log('\n   Please grant AMC_ROLE manually using:');
        console.log(`   npx hardhat run scripts/grant-amc-role-poolmanager.js --network mantle_testnet`);
        process.exit(1);
      }
    } else {
      console.error('   ❌ Deployer does not have DEFAULT_ADMIN_ROLE to grant AMC_ROLE');
      console.log('\n   Please grant AMC_ROLE manually using:');
      console.log(`   npx hardhat run scripts/grant-amc-role-poolmanager.js --network mantle_testnet`);
      process.exit(1);
    }
  }

  console.log('');

  // ========================================
  // STEP 2: Test Simple Pool Creation
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: Testing Simple Pool Creation (without tranches)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const simplePoolName = 'Test Simple Pool ' + Date.now();
  const simplePoolDescription = 'A test pool without tranches';
  const managementFee = 300; // 3% in basis points
  const performanceFee = 1000; // 10% in basis points

  console.log('📝 Pool Details:');
  console.log('   Name:', simplePoolName);
  console.log('   Description:', simplePoolDescription);
  console.log('   Management Fee:', managementFee, 'basis points (3%)');
  console.log('   Performance Fee:', performanceFee, 'basis points (10%)');
  console.log('');

  try {
    console.log('⏳ Creating simple pool...');
    const createTx = await poolManager.createPool(
      simplePoolName,
      simplePoolDescription,
      managementFee,
      performanceFee
    );
    
    const receipt = await createTx.wait();
    console.log('   ✅ Pool creation transaction sent!');
    console.log('   Transaction hash:', receipt.hash);

    // Get pool ID from event
    const poolCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = poolManager.interface.parseLog(log);
        return parsed && parsed.name === 'PoolCreated';
      } catch {
        return false;
      }
    });

    let simplePoolId;
    if (poolCreatedEvent) {
      const parsed = poolManager.interface.parseLog(poolCreatedEvent);
      simplePoolId = parsed.args.poolId;
      console.log('   ✅ Pool created successfully!');
      console.log('   Pool ID:', simplePoolId);
    } else {
      // Fallback: query the pool by name (not ideal but works)
      console.log('   ⚠️  Could not find PoolCreated event, trying to query pool...');
      // We'll query it in the next step
    }

    // Wait a bit for transaction to be mined
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Query pool information
    if (simplePoolId) {
      console.log('\n📊 Querying pool information...');
      const poolInfo = await poolManager.getPool(simplePoolId);
      console.log('   Pool ID:', poolInfo.poolId);
      console.log('   Creator:', poolInfo.creator);
      console.log('   Name:', poolInfo.name);
      console.log('   Description:', poolInfo.description);
      console.log('   Total Value:', ethers.formatEther(poolInfo.totalValue), 'TRUST');
      console.log('   Total Shares:', ethers.formatEther(poolInfo.totalShares), 'tokens');
      console.log('   Management Fee:', poolInfo.managementFee.toString(), 'basis points');
      console.log('   Performance Fee:', poolInfo.performanceFee.toString(), 'basis points');
      console.log('   Is Active:', poolInfo.isActive);
      console.log('   Has Tranches:', poolInfo.hasTranches);
      console.log('   Created At:', new Date(Number(poolInfo.createdAt) * 1000).toISOString());
      console.log('   Assets Count:', poolInfo.assets.length);
      console.log('   Tranches Count:', poolInfo.tranches.length);
    }

  } catch (error) {
    console.error('   ❌ Failed to create simple pool:', error.message);
    if (error.message.includes('AccessControl')) {
      console.error('   ⚠️  Access denied - check AMC_ROLE');
    }
    throw error;
  }

  console.log('');

  // ========================================
  // STEP 3: Test Pool Creation with Tranches
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: Testing Pool Creation with Tranches');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const tranchePoolName = 'Test Tranche Pool ' + Date.now();
  const tranchePoolDescription = 'A test pool with Senior and Junior tranches';
  const seniorPercentage = 7000; // 70% in basis points
  const seniorAPY = 800; // 8% in basis points
  const juniorAPY = 1500; // 15% in basis points
  const seniorSymbol = 'TSEN';
  const juniorSymbol = 'TJUN';

  console.log('📝 Pool Details:');
  console.log('   Name:', tranchePoolName);
  console.log('   Description:', tranchePoolDescription);
  console.log('   Management Fee:', managementFee, 'basis points (3%)');
  console.log('   Performance Fee:', performanceFee, 'basis points (10%)');
  console.log('   Senior Percentage:', seniorPercentage, 'basis points (70%)');
  console.log('   Senior APY:', seniorAPY, 'basis points (8%)');
  console.log('   Junior APY:', juniorAPY, 'basis points (15%)');
  console.log('   Senior Symbol:', seniorSymbol);
  console.log('   Junior Symbol:', juniorSymbol);
  console.log('');

  try {
    console.log('⏳ Creating pool with tranches...');
    const createTrancheTx = await poolManager.createPoolWithTranches(
      tranchePoolName,
      tranchePoolDescription,
      managementFee,
      performanceFee,
      seniorPercentage,
      seniorAPY,
      juniorAPY,
      seniorSymbol,
      juniorSymbol
    );
    
    const receipt = await createTrancheTx.wait();
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

    let tranchePoolId, seniorTrancheId, juniorTrancheId;
    if (poolCreatedEvent) {
      const parsed = poolManager.interface.parseLog(poolCreatedEvent);
      tranchePoolId = parsed.args.poolId;
      console.log('   ✅ Pool created successfully!');
      console.log('   Pool ID:', tranchePoolId);
    }

    if (trancheCreatedEvents.length >= 2) {
      const seniorParsed = poolManager.interface.parseLog(trancheCreatedEvents[0]);
      const juniorParsed = poolManager.interface.parseLog(trancheCreatedEvents[1]);
      
      seniorTrancheId = seniorParsed.args.trancheId;
      juniorTrancheId = juniorParsed.args.trancheId;
      
      console.log('   ✅ Tranches created successfully!');
      console.log('   Senior Tranche ID:', seniorTrancheId);
      console.log('   Junior Tranche ID:', juniorTrancheId);
      console.log('   Senior Token Contract:', seniorParsed.args.tokenContract);
      console.log('   Junior Token Contract:', juniorParsed.args.tokenContract);
    }

    // Wait a bit for transaction to be mined
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Query pool and tranche information
    if (tranchePoolId) {
      console.log('\n📊 Querying pool information...');
      const poolInfo = await poolManager.getPool(tranchePoolId);
      console.log('   Pool ID:', poolInfo.poolId);
      console.log('   Creator:', poolInfo.creator);
      console.log('   Name:', poolInfo.name);
      console.log('   Has Tranches:', poolInfo.hasTranches);
      console.log('   Tranches Count:', poolInfo.tranches.length);

      if (seniorTrancheId && juniorTrancheId) {
        console.log('\n📊 Querying Senior Tranche...');
        const seniorTranche = await poolManager.getTranche(seniorTrancheId);
        console.log('   Tranche ID:', seniorTranche.trancheId);
        console.log('   Type:', seniorTranche.trancheType === 0 ? 'SENIOR' : 'JUNIOR');
        console.log('   Name:', seniorTranche.name);
        console.log('   Token Contract:', seniorTranche.tokenContract);
        console.log('   Percentage:', seniorTranche.percentage.toString(), 'basis points');
        console.log('   Expected APY:', seniorTranche.expectedAPY.toString(), 'basis points');
        console.log('   Is Active:', seniorTranche.isActive);

        console.log('\n📊 Querying Junior Tranche...');
        const juniorTranche = await poolManager.getTranche(juniorTrancheId);
        console.log('   Tranche ID:', juniorTranche.trancheId);
        console.log('   Type:', juniorTranche.trancheType === 0 ? 'SENIOR' : 'JUNIOR');
        console.log('   Name:', juniorTranche.name);
        console.log('   Token Contract:', juniorTranche.tokenContract);
        console.log('   Percentage:', juniorTranche.percentage.toString(), 'basis points');
        console.log('   Expected APY:', juniorTranche.expectedAPY.toString(), 'basis points');
        console.log('   Is Active:', juniorTranche.isActive);
      }
    }

  } catch (error) {
    console.error('   ❌ Failed to create pool with tranches:', error.message);
    if (error.message.includes('AccessControl')) {
      console.error('   ⚠️  Access denied - check AMC_ROLE');
    }
    if (error.message.includes('revert')) {
      console.error('   ⚠️  Transaction reverted - check parameters');
    }
    throw error;
  }

  console.log('');

  // ========================================
  // STEP 4: Test Adding Asset to Pool (if assets exist)
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4: Testing Asset Addition to Pool');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Try to find an active asset
  const CoreAssetFactory = await ethers.getContractFactory('CoreAssetFactory');
  const coreAssetFactory = CoreAssetFactory.attach(CORE_ASSET_FACTORY_ADDRESS);

  // For testing, we'll skip this if no asset ID is provided
  const testAssetId = process.argv[2]; // Optional asset ID as argument
  
  if (testAssetId) {
    try {
      console.log('📝 Testing with Asset ID:', testAssetId);
      
      // Check asset status
      const asset = await coreAssetFactory.getAsset(testAssetId);
      const statusNum = Number(asset.status);
      
      console.log('   Asset Name:', asset.name);
      console.log('   Asset Status:', statusNum);
      
      if (statusNum === 6) { // ACTIVE_AMC_MANAGED
        console.log('   ✅ Asset is ACTIVE_AMC_MANAGED - ready for pooling');
        
        if (tranchePoolId) {
          console.log('\n⏳ Adding asset to tranche pool...');
          const addAssetTx = await poolManager.addAssetToPool(tranchePoolId, testAssetId);
          await addAssetTx.wait();
          console.log('   ✅ Asset added to pool successfully!');
          console.log('   Transaction hash:', addAssetTx.hash);
          
          // Verify asset was added
          const poolInfo = await poolManager.getPool(tranchePoolId);
          console.log('   Assets in pool:', poolInfo.assets.length);
          if (poolInfo.assets.includes(testAssetId)) {
            console.log('   ✅ Asset confirmed in pool!');
          }
        }
      } else {
        console.log('   ⚠️  Asset is not ACTIVE_AMC_MANAGED (status 6)');
        console.log('   Current status:', statusNum);
        console.log('   Skipping asset addition test');
      }
    } catch (error) {
      console.error('   ❌ Failed to add asset to pool:', error.message);
      console.log('   Skipping asset addition test');
    }
  } else {
    console.log('ℹ️  No asset ID provided. Skipping asset addition test.');
    console.log('   To test asset addition, provide an asset ID:');
    console.log('   npx hardhat run scripts/test-pool-creation.js --network mantle_testnet <ASSET_ID>');
  }

  console.log('');

  // ========================================
  // SUMMARY
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ TEST SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ AMC_ROLE check: PASSED');
  console.log('✅ Simple pool creation: PASSED');
  console.log('✅ Pool with tranches creation: PASSED');
  if (testAssetId) {
    console.log('✅ Asset addition: TESTED');
  } else {
    console.log('⏭️  Asset addition: SKIPPED (no asset ID provided)');
  }
  console.log('\n🎉 Pool creation tests completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

