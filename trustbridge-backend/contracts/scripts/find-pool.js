const { ethers } = require('hardhat');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

/**
 * Find a pool by name or check all pools
 * 
 * Usage:
 *   POOL_NAME=012 npx hardhat run scripts/find-pool.js --network mantle_testnet
 *   Or without POOL_NAME to list all pools
 */

async function main() {
  console.log('🔍 === FINDING POOL ===\n');

  const POOL_NAME = process.env.POOL_NAME || null;
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer address:', deployer.address);
  console.log('   Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // Load contract addresses
  const fs = require('fs');
  const path = require('path');
  const deploymentFile = path.join(__dirname, '../deployments/mantle-sepolia-latest.json');
  
  let POOL_MANAGER_ADDRESS;
  if (fs.existsSync(deploymentFile)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    POOL_MANAGER_ADDRESS = deployment.contracts.PoolManager;
  } else {
    POOL_MANAGER_ADDRESS = process.env.POOL_MANAGER_ADDRESS || '0x56535279704A7936621b84FFD5e9Cc1eD3c4093a';
  }

  console.log('📋 Configuration:');
  console.log('   PoolManager:', POOL_MANAGER_ADDRESS);
  if (POOL_NAME) {
    console.log('   Searching for pool name:', POOL_NAME);
  } else {
    console.log('   Listing all pools');
  }
  console.log('');

  // Get contract instance
  const PoolManager = await ethers.getContractFactory('PoolManager');
  const poolManager = PoolManager.attach(POOL_MANAGER_ADDRESS);

  try {
    // Get total pools
    const totalPools = Number(await poolManager.totalPools());
    console.log(`📊 Total pools on-chain: ${totalPools}\n`);

    if (totalPools === 0) {
      console.log('ℹ️  No pools found on-chain');
      return;
    }

    // Query PoolCreated events to get all pool IDs
    const currentBlock = await ethers.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 100000);
    
    console.log(`📡 Querying PoolCreated events from block ${fromBlock} to ${currentBlock}...`);
    
    const filter = poolManager.filters.PoolCreated();
    const events = await poolManager.queryFilter(filter, fromBlock, currentBlock);
    
    console.log(`✅ Found ${events.length} PoolCreated events\n`);

    // Get pool details
    const pools = [];
    for (const event of events) {
      try {
        const poolId = event.args.poolId;
        const poolInfo = await poolManager.getPool(poolId);
        
        // Check if this matches the search name
        if (POOL_NAME && poolInfo.name.toLowerCase() !== POOL_NAME.toLowerCase()) {
          continue;
        }

        // Get tranche info if pool has tranches
        let tranches = [];
        if (poolInfo.hasTranches && poolInfo.tranches.length > 0) {
          for (const trancheId of poolInfo.tranches) {
            try {
              const trancheInfo = await poolManager.getTranche(trancheId);
              tranches.push({
                trancheId: trancheId,
                type: trancheInfo.trancheType === 0 ? 'SENIOR' : 'JUNIOR',
                name: trancheInfo.name,
                tokenContract: trancheInfo.tokenContract,
                percentage: Number(trancheInfo.percentage),
                expectedAPY: Number(trancheInfo.expectedAPY),
                totalInvested: ethers.formatEther(trancheInfo.totalInvested),
                totalShares: ethers.formatEther(trancheInfo.totalShares),
                isActive: trancheInfo.isActive,
              });
            } catch (error) {
              console.warn(`  ⚠️  Failed to fetch tranche ${trancheId}:`, error.message);
            }
          }
        }

        // Get asset details
        const assetDetails = [];
        for (const assetId of poolInfo.assets) {
          try {
            // We'd need CoreAssetFactory to get asset details
            // For now, just show the asset ID
            assetDetails.push({
              assetId: assetId,
            });
          } catch (error) {
            // Skip if we can't get asset details
          }
        }

        const poolData = {
          poolId: poolId,
          name: poolInfo.name,
          description: poolInfo.description,
          creator: poolInfo.creator,
          totalValue: ethers.formatEther(poolInfo.totalValue),
          totalShares: ethers.formatEther(poolInfo.totalShares),
          managementFee: Number(poolInfo.managementFee),
          performanceFee: Number(poolInfo.performanceFee),
          isActive: poolInfo.isActive,
          hasTranches: poolInfo.hasTranches,
          createdAt: new Date(Number(poolInfo.createdAt) * 1000).toISOString(),
          assets: poolInfo.assets,
          assetCount: poolInfo.assets.length,
          tranches: tranches,
          trancheCount: tranches.length,
        };

        pools.push(poolData);
      } catch (error) {
        console.error(`  ❌ Error processing pool ${event.args.poolId}:`, error.message);
      }
    }

    if (pools.length === 0) {
      if (POOL_NAME) {
        console.log(`❌ No pool found with name "${POOL_NAME}"`);
      } else {
        console.log('❌ No pools found');
      }
      return;
    }

    // Display results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 FOUND ${pools.length} POOL(S)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    pools.forEach((pool, index) => {
      console.log(`\n${index + 1}. ${pool.name}`);
      console.log('   ──────────────────────────────────────────────────────────────');
      console.log('   Pool ID:', pool.poolId);
      console.log('   Description:', pool.description || 'No description');
      console.log('   Creator:', pool.creator);
      console.log('   Total Value:', pool.totalValue, 'TRUST');
      console.log('   Total Shares:', pool.totalShares, 'tokens');
      console.log('   Management Fee:', pool.managementFee, 'basis points', `(${pool.managementFee / 100}%)`);
      console.log('   Performance Fee:', pool.performanceFee, 'basis points', `(${pool.performanceFee / 100}%)`);
      console.log('   Is Active:', pool.isActive);
      console.log('   Has Tranches:', pool.hasTranches);
      console.log('   Created At:', pool.createdAt);
      console.log('   Assets Count:', pool.assetCount);
      console.log('   Asset IDs:', pool.assets.map((id) => id.substring(0, 10) + '...').join(', '));
      
      if (pool.hasTranches && pool.tranches.length > 0) {
        console.log('\n   Tranches:');
        pool.tranches.forEach((tranche, i) => {
          console.log(`     ${i + 1}. ${tranche.type} Tranche`);
          console.log(`        Name: ${tranche.name}`);
          console.log(`        Percentage: ${tranche.percentage} basis points (${tranche.percentage / 100}%)`);
          console.log(`        Expected APY: ${tranche.expectedAPY} basis points (${tranche.expectedAPY / 100}%)`);
          console.log(`        Token Contract: ${tranche.tokenContract}`);
          console.log(`        Total Invested: ${tranche.totalInvested} TRUST`);
          console.log(`        Total Shares: ${tranche.totalShares} tokens`);
          console.log(`        Is Active: ${tranche.isActive}`);
        });
      }

      // Calculate APY (if pool has tranches, use weighted average)
      if (pool.hasTranches && pool.tranches.length > 0) {
        let totalAPY = 0;
        let totalPercentage = 0;
        pool.tranches.forEach((tranche) => {
          totalAPY += (tranche.expectedAPY * tranche.percentage) / 10000;
          totalPercentage += tranche.percentage;
        });
        const weightedAPY = totalPercentage > 0 ? (totalAPY / totalPercentage) * 100 : 0;
        console.log(`\n   Weighted Average APY: ${weightedAPY.toFixed(2)}%`);
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 LOCATION: BLOCKCHAIN (Mantle Sepolia)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check if pools exist in database (would need backend API)
    console.log('💡 To check database:');
    console.log('   Query MongoDB: db.amcpools.find({ poolId: "<poolId>" })');
    console.log('   Or use backend API: GET /api/amc-pools\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

