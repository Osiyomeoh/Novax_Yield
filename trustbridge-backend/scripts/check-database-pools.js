const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

/**
 * Check pools in MongoDB database
 * 
 * Usage:
 *   node scripts/check-database-pools.js
 *   POOL_NAME=012 node scripts/check-database-pools.js
 */

async function main() {
  const POOL_NAME = process.env.POOL_NAME || null;
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const poolsCollection = db.collection('amcpools');

    // Build query
    const query = POOL_NAME ? { name: POOL_NAME } : {};
    
    console.log('📋 Query:', JSON.stringify(query, null, 2));
    console.log('');

    // Find pools
    const pools = await poolsCollection.find(query).toArray();
    
    console.log(`📊 Found ${pools.length} pool(s) in database\n`);

    if (pools.length === 0) {
      console.log('ℹ️  No pools found in database');
      return;
    }

    // Display pool details
    pools.forEach((pool, index) => {
      console.log(`\n${index + 1}. ${pool.name || 'Unnamed Pool'}`);
      console.log('   ──────────────────────────────────────────────────────────────');
      console.log('   Pool ID:', pool.poolId);
      console.log('   Name:', pool.name);
      console.log('   Description:', pool.description || 'No description');
      console.log('   Status:', pool.status);
      console.log('   Created By:', pool.createdBy);
      console.log('   Created At:', pool.createdAt);
      console.log('   Total Value:', pool.totalValue, 'TRUST');
      console.log('   Expected APY:', pool.expectedAPY, '%');
      console.log('   Assets Count:', pool.assets?.length || 0);
      console.log('   Total Invested:', pool.totalInvested || 0, 'TRUST');
      console.log('   Total Investors:', pool.totalInvestors || 0);
      
      // Check if pool is on-chain
      const hasHederaContractId = pool.hederaContractId && pool.hederaContractId !== '';
      const hasHederaTokenId = pool.hederaTokenId && pool.hederaTokenId !== '';
      
      console.log('\n   📍 Location:');
      console.log('      Database: ✅ YES');
      console.log('      Blockchain (hederaContractId):', hasHederaContractId ? '✅ YES' : '❌ NO');
      console.log('      Hedera Token (hederaTokenId):', hasHederaTokenId ? '✅ YES' : '❌ NO');
      
      if (hasHederaContractId) {
        console.log('      Contract ID:', pool.hederaContractId);
      }
      
      if (!hasHederaContractId && !hasHederaTokenId) {
        console.log('\n   ⚠️  WARNING: This pool exists ONLY in the database!');
        console.log('      It has NOT been created on the blockchain.');
        console.log('      To create it on-chain, use the pool creation API endpoint.');
      }

      // Show assets
      if (pool.assets && pool.assets.length > 0) {
        console.log('\n   Assets:');
        pool.assets.forEach((asset, i) => {
          console.log(`     ${i + 1}. ${asset.name || asset.assetId}`);
          console.log(`        Asset ID: ${asset.assetId}`);
          console.log(`        Value: ${asset.value} TRUST`);
          console.log(`        Percentage: ${asset.percentage}%`);
        });
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const onChainPools = pools.filter(p => p.hederaContractId && p.hederaContractId !== '');
    const dbOnlyPools = pools.filter(p => !p.hederaContractId || p.hederaContractId === '');
    
    console.log(`Total pools in database: ${pools.length}`);
    console.log(`On-chain pools: ${onChainPools.length}`);
    console.log(`Database-only pools: ${dbOnlyPools.length}`);
    
    if (dbOnlyPools.length > 0) {
      console.log('\n⚠️  Database-only pools (not on-chain):');
      dbOnlyPools.forEach(p => {
        console.log(`   - ${p.name} (${p.poolId})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

