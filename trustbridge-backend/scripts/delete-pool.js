#!/usr/bin/env node

/**
 * Script to delete a pool from MongoDB
 * Usage: node scripts/delete-pool.js <poolId>
 * 
 * Example: node scripts/delete-pool.js 0xa63c5e79bd762535585c72ebb25d8f8ff181087d2706afa847ad34839d8ad280
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const poolId = process.argv[2];

if (!poolId) {
  console.error('❌ Error: Pool ID is required');
  console.log('Usage: node scripts/delete-pool.js <poolId>');
  console.log('Example: node scripts/delete-pool.js 0xa63c5e79bd762535585c72ebb25d8f8ff181087d2706afa847ad34839d8ad280');
  process.exit(1);
}

// Try multiple ways to get MongoDB URI
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

if (!mongoUri) {
  console.error('❌ Error: MONGODB_URI not found in environment variables');
  console.log('Please set MONGODB_URI in your .env file or as an environment variable');
  console.log('Or pass it directly: MONGODB_URI="your-uri" node scripts/delete-pool.js <poolId>');
  process.exit(1);
}

async function deletePool() {
  const client = new MongoClient(mongoUri);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const poolsCollection = db.collection('amcpools');

    // Find the pool first
    console.log(`🔍 Looking for pool: ${poolId}`);
    const pool = await poolsCollection.findOne({ poolId });

    if (!pool) {
      console.log(`⚠️  Pool with ID ${poolId} not found`);
      await client.close();
      process.exit(0);
    }

    console.log('📋 Pool found:');
    console.log(`   Name: ${pool.name}`);
    console.log(`   Status: ${pool.status}`);
    console.log(`   Created by: ${pool.createdBy}`);
    console.log(`   Created at: ${pool.createdAt}`);

    // Delete the pool
    console.log('\n🗑️  Deleting pool...');
    const result = await poolsCollection.deleteOne({ poolId });

    if (result.deletedCount === 1) {
      console.log(`✅ Pool ${poolId} deleted successfully`);
    } else {
      console.log(`⚠️  Pool deletion returned unexpected result: ${result.deletedCount} documents deleted`);
    }

  } catch (error) {
    console.error('❌ Error deleting pool:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

deletePool();

