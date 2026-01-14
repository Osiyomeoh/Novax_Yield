const { ethers } = require('hardhat');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

/**
 * Create Pool Directly on Blockchain
 * 
 * This script creates pools directly on the blockchain without using the backend API.
 * 
 * Usage:
 *   # Create pool with tranches (recommended)
 *   npx hardhat run scripts/create-pool-direct.js --network mantle_testnet
 * 
 *   # With custom parameters via environment variables:
 *   POOL_NAME="My Pool" \
 *   POOL_DESCRIPTION="Pool description" \
 *   SENIOR_PERCENTAGE=7000 \
 *   SENIOR_APY=800 \
 *   JUNIOR_APY=1500 \
 *   ASSET_IDS="0x... 0x..." \
 *   npx hardhat run scripts/create-pool-direct.js --network mantle_testnet
 * 
 * Environment Variables:
 *   POOL_NAME - Pool name (default: "Pool <timestamp>")
 *   POOL_DESCRIPTION - Pool description (default: "Created via direct contract call")
 *   MANAGEMENT_FEE - Management fee in basis points (default: 300 = 3%)
 *   PERFORMANCE_FEE - Performance fee in basis points (default: 1000 = 10%)
 *   SENIOR_PERCENTAGE - Senior tranche percentage in basis points (default: 7000 = 70%)
 *   SENIOR_APY - Senior tranche APY in basis points (default: 800 = 8%)
 *   JUNIOR_APY - Junior tranche APY in basis points (default: 1500 = 15%)
 *   SENIOR_SYMBOL - Senior tranche token symbol (default: auto-generated from pool name)
 *   JUNIOR_SYMBOL - Junior tranche token symbol (default: auto-generated from pool name)
 *   ASSET_IDS - Space-separated list of asset IDs to add (optional)
 *   CREATE_SIMPLE_POOL - Set to "true" to create simple pool without tranches (default: false)
 */

async function main() {
  console.log('🚀 === CREATE POOL DIRECTLY ON BLOCKCHAIN ===\n');

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('👤 Creating pool with account:', deployer.address);
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
  console.log('');

  // Get contract instances
  const PoolManager = await ethers.getContractFactory('PoolManager');
  const poolManager = PoolManager.attach(POOL_MANAGER_ADDRESS);

  const CoreAssetFactory = await ethers.getContractFactory('CoreAssetFactory');
  const coreAssetFactory = CoreAssetFactory.attach(CORE_ASSET_FACTORY_ADDRESS);

  // ========================================
  // STEP 1: Check AMC_ROLE
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: Checking AMC_ROLE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const AMC_ROLE = await poolManager.AMC_ROLE();
  const hasAMCRole = await poolManager.hasRole(AMC_ROLE, deployer.address);
  
  console.log('   AMC_ROLE hash:', AMC_ROLE);
  console.log('   Account has AMC_ROLE:', hasAMCRole ? '✅ YES' : '❌ NO');

  if (!hasAMCRole) {
    console.error('\n❌ Account does not have AMC_ROLE!');
    console.error('   Cannot create pools without AMC_ROLE.');
    console.error('\n   To grant AMC_ROLE, run:');
    console.error('   npm run grant:amc-role-poolmanager');
    console.error('   Or use a different account that has AMC_ROLE.');
    process.exit(1);
  }
  console.log('');

  // ========================================
  // STEP 2: Get Pool Parameters
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: Pool Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const createSimplePool = process.env.CREATE_SIMPLE_POOL === 'true';
  const poolName = process.env.POOL_NAME || `Pool ${Date.now()}`;
  const poolDescription = process.env.POOL_DESCRIPTION || 'Created via direct contract call';
  const managementFee = parseInt(process.env.MANAGEMENT_FEE || '300'); // 3% default
  const performanceFee = parseInt(process.env.PERFORMANCE_FEE || '1000'); // 10% default

  // Generate symbols from pool name if not provided
  const generateSymbol = (name, suffix) => {
    const symbol = name
      .split(' ')
      .map(word => word.substring(0, 1).toUpperCase())
      .join('')
      .substring(0, 5) + suffix;
    return symbol.length > 8 ? symbol.substring(0, 8) : symbol;
  };

  const seniorPercentage = parseInt(process.env.SENIOR_PERCENTAGE || '7000'); // 70% default
  const seniorAPY = parseInt(process.env.SENIOR_APY || '800'); // 8% default
  const juniorAPY = parseInt(process.env.JUNIOR_APY || '1500'); // 15% default
  const seniorSymbol = process.env.SENIOR_SYMBOL || generateSymbol(poolName, 'S');
  const juniorSymbol = process.env.JUNIOR_SYMBOL || generateSymbol(poolName, 'J');

  // Parse asset IDs from environment variable (space-separated)
  const assetIdsString = process.env.ASSET_IDS || '';
  const assetIds = assetIdsString.trim() 
    ? assetIdsString.trim().split(/\s+/).filter(id => id.length > 0)
    : [];

  console.log('📝 Pool Configuration:');
  console.log('   Name:', poolName);
  console.log('   Description:', poolDescription);
  console.log('   Management Fee:', managementFee, 'basis points', `(${managementFee / 100}%)`);
  console.log('   Performance Fee:', performanceFee, 'basis points', `(${performanceFee / 100}%)`);
  
  if (!createSimplePool) {
    console.log('   Type: Pool with Tranches');
    console.log('   Senior Percentage:', seniorPercentage, 'basis points', `(${seniorPercentage / 100}%)`);
    console.log('   Senior APY:', seniorAPY, 'basis points', `(${seniorAPY / 100}%)`);
    console.log('   Junior APY:', juniorAPY, 'basis points', `(${juniorAPY / 100}%)`);
    console.log('   Senior Symbol:', seniorSymbol);
    console.log('   Junior Symbol:', juniorSymbol);
  } else {
    console.log('   Type: Simple Pool (no tranches)');
  }
  
  console.log('   Assets to add:', assetIds.length > 0 ? assetIds.join(', ') : 'None');
  console.log('');

  // ========================================
  // STEP 3: Validate Assets (if provided)
  // ========================================
  if (assetIds.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: Validating Assets');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const validAssets = [];
    const invalidAssets = [];

    for (const assetId of assetIds) {
      try {
        // Convert to bytes32 if needed
        const assetIdBytes32 = assetId.startsWith('0x') && assetId.length === 66
          ? assetId
          : ethers.id(assetId);

        console.log(`   Checking asset: ${assetIdBytes32.substring(0, 10)}...`);
        
        const asset = await coreAssetFactory.getAsset(assetIdBytes32);
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

        console.log(`      Name: ${asset.name}`);
        console.log(`      Status: ${statusNum} (${statusNames[statusNum] || 'UNKNOWN'})`);
        console.log(`      Value: ${ethers.formatEther(asset.totalValue)} TRUST`);

        // Check if asset is already in a pool
        const assetToPool = await poolManager.assetToPool(assetIdBytes32);
        if (assetToPool !== ethers.ZeroHash) {
          console.log(`      ❌ Asset is already in pool: ${assetToPool}`);
          invalidAssets.push({ assetId: assetIdBytes32, reason: 'Already in pool' });
          continue;
        }

        if (statusNum !== 6) {
          console.log(`      ❌ Asset is not ACTIVE_AMC_MANAGED (status 6)`);
          invalidAssets.push({ assetId: assetIdBytes32, reason: `Status ${statusNum}, not 6` });
          continue;
        }

        console.log(`      ✅ Asset is valid and ready for pooling`);
        validAssets.push(assetIdBytes32);
      } catch (error) {
        console.error(`      ❌ Error checking asset: ${error.message}`);
        invalidAssets.push({ assetId, reason: error.message });
      }
      console.log('');
    }

    if (invalidAssets.length > 0) {
      console.log('⚠️  Invalid Assets:');
      invalidAssets.forEach(({ assetId, reason }) => {
        console.log(`   - ${assetId.substring(0, 10)}...: ${reason}`);
      });
      console.log('');
    }

    if (validAssets.length === 0 && assetIds.length > 0) {
      console.error('❌ No valid assets found! Cannot create pool without valid assets.');
      console.error('   Please ensure assets are in ACTIVE_AMC_MANAGED status (status 6).');
      process.exit(1);
    }

    // Update assetIds to only include valid ones
    assetIds.length = 0;
    assetIds.push(...validAssets);
    console.log(`✅ Validated ${validAssets.length} asset(s) ready for pooling\n`);
  }

  // ========================================
  // STEP 4: Create Pool
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(createSimplePool ? 'STEP 4: Creating Simple Pool' : 'STEP 4: Creating Pool with Tranches');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let poolId, seniorTrancheId, juniorTrancheId;

  try {
    if (createSimplePool) {
      console.log('⏳ Creating simple pool...');
      const createTx = await poolManager.createPool(
        poolName,
        poolDescription,
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

      if (poolCreatedEvent) {
        const parsed = poolManager.interface.parseLog(poolCreatedEvent);
        poolId = parsed.args.poolId;
        console.log('   ✅ Pool created successfully!');
        console.log('   Pool ID:', poolId);
      }
    } else {
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
        console.log('   Senior Token Contract:', seniorParsed.args.tokenContract);
        console.log('   Junior Token Contract:', juniorParsed.args.tokenContract);
      }
    }

    if (!poolId) {
      console.error('❌ Pool ID not found in events!');
      process.exit(1);
    }

    // Wait for transaction to be mined
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

  // ========================================
  // STEP 5: Add Assets to Pool (if provided)
  // ========================================
  if (assetIds.length > 0) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5: Adding Assets to Pool');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const addedAssets = [];
    const failedAssets = [];

    for (const assetId of assetIds) {
      try {
        console.log(`⏳ Adding asset ${assetId.substring(0, 10)}... to pool...`);
        
        const addAssetTx = await poolManager.addAssetToPool(poolId, assetId);
        const addReceipt = await addAssetTx.wait();
        
        console.log(`   ✅ Asset added successfully!`);
        console.log(`   Transaction hash: ${addReceipt.hash}`);
        addedAssets.push(assetId);
      } catch (error) {
        console.error(`   ❌ Failed to add asset: ${error.message}`);
        failedAssets.push({ assetId, error: error.message });
      }
      console.log('');
    }

    if (failedAssets.length > 0) {
      console.log('⚠️  Failed to add some assets:');
      failedAssets.forEach(({ assetId, error }) => {
        console.log(`   - ${assetId.substring(0, 10)}...: ${error}`);
      });
      console.log('');
    }

    console.log(`✅ Successfully added ${addedAssets.length}/${assetIds.length} asset(s) to pool`);
  }

  // ========================================
  // STEP 6: Verify Pool
  // ========================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 6: Pool Verification');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const poolInfo = await poolManager.getPool(poolId);
    console.log('📊 Pool Information:');
    console.log('   Pool ID:', poolInfo.poolId);
    console.log('   Name:', poolInfo.name);
    console.log('   Description:', poolInfo.description);
    console.log('   Creator:', poolInfo.creator);
    console.log('   Total Value:', ethers.formatEther(poolInfo.totalValue), 'TRUST');
    console.log('   Total Shares:', ethers.formatEther(poolInfo.totalShares), 'tokens');
    console.log('   Management Fee:', poolInfo.managementFee.toString(), 'basis points');
    console.log('   Performance Fee:', poolInfo.performanceFee.toString(), 'basis points');
    console.log('   Is Active:', poolInfo.isActive);
    console.log('   Has Tranches:', poolInfo.hasTranches);
    console.log('   Created At:', new Date(Number(poolInfo.createdAt) * 1000).toISOString());
    console.log('   Assets Count:', poolInfo.assets.length);
    console.log('   Tranches Count:', poolInfo.tranches.length);

    if (poolInfo.hasTranches && seniorTrancheId && juniorTrancheId) {
      console.log('\n📊 Tranche Information:');
      
      const seniorTranche = await poolManager.getTranche(seniorTrancheId);
      console.log('   Senior Tranche:');
      console.log('      ID:', seniorTranche.trancheId);
      console.log('      Name:', seniorTranche.name);
      console.log('      Token Contract:', seniorTranche.tokenContract);
      console.log('      Percentage:', seniorTranche.percentage.toString(), 'basis points');
      console.log('      Expected APY:', seniorTranche.expectedAPY.toString(), 'basis points');
      console.log('      Total Invested:', ethers.formatEther(seniorTranche.totalInvested), 'TRUST');
      console.log('      Total Shares:', ethers.formatEther(seniorTranche.totalShares), 'tokens');
      console.log('      Is Active:', seniorTranche.isActive);

      const juniorTranche = await poolManager.getTranche(juniorTrancheId);
      console.log('   Junior Tranche:');
      console.log('      ID:', juniorTranche.trancheId);
      console.log('      Name:', juniorTranche.name);
      console.log('      Token Contract:', juniorTranche.tokenContract);
      console.log('      Percentage:', juniorTranche.percentage.toString(), 'basis points');
      console.log('      Expected APY:', juniorTranche.expectedAPY.toString(), 'basis points');
      console.log('      Total Invested:', ethers.formatEther(juniorTranche.totalInvested), 'TRUST');
      console.log('      Total Shares:', ethers.formatEther(juniorTranche.totalShares), 'tokens');
      console.log('      Is Active:', juniorTranche.isActive);
    }

    if (poolInfo.assets.length > 0) {
      console.log('\n📊 Assets in Pool:');
      poolInfo.assets.forEach((assetId, index) => {
        console.log(`   ${index + 1}. ${assetId}`);
      });
    }
  } catch (error) {
    console.error('   ⚠️  Failed to verify pool:', error.message);
  }

  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ POOL CREATION COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Pool ID:', poolId);
  console.log('   Pool Name:', poolName);
  if (seniorTrancheId) {
    console.log('   Senior Tranche ID:', seniorTrancheId);
    console.log('   Junior Tranche ID:', juniorTrancheId);
  }
  console.log('   Assets Added:', assetIds.length);
  console.log('\n🎉 Pool created successfully on blockchain!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Pool creation failed:', error);
    process.exit(1);
  });

