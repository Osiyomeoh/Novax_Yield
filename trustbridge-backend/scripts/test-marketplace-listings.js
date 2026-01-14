require('dotenv').config();
const axios = require('axios');

/**
 * Test Marketplace Listings
 * Checks what assets should appear in the marketplace
 */

const BASE_URL = 'http://localhost:4001/api';

async function main() {
  console.log('🧪 Testing Marketplace Listings...\n');

  try {
    // Test if backend is running
    console.log('🔌 Checking backend connection...');
    try {
      const healthCheck = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Backend is running\n');
    } catch (error) {
      console.error('❌ Backend not running! Please start with: npm run dev');
      process.exit(1);
    }

    // Check marketplace contract status
    console.log('📋 Checking marketplace contract...');
    const contractConfig = await axios.get(`${BASE_URL}/hedera/marketplace/config`);
    
    if (contractConfig.data.success) {
      console.log('✅ Marketplace contract configured:');
      console.log('   Contract ID:', contractConfig.data.data.marketplaceContractId);
      console.log('   Platform Fee:', contractConfig.data.data.platformFeeBps / 100, '%');
      console.log('   Treasury:', contractConfig.data.data.platformTreasury);
    }
    console.log('');

    // Test specific assets (you mentioned art123 and art12)
    console.log('🔍 Testing specific assets...\n');
    
    const testAssets = [
      { name: 'art123', tokenId: '0.0.7004839', serialNumber: 1 },
      { name: 'art12', tokenId: '0.0.6996603', serialNumber: 1 },
      { name: 'art45', tokenId: '0.0.7004839', serialNumber: 1 },
    ];

    for (const asset of testAssets) {
      console.log(`Testing: ${asset.name} (${asset.tokenId})`);
      
      try {
        const response = await axios.get(
          `${BASE_URL}/hedera/marketplace/check-listing/${asset.tokenId}/${asset.serialNumber}`
        );
        
        if (response.data.success) {
          const status = response.data.data;
          console.log(`   Is Listed: ${status.isListed}`);
          console.log(`   Listing ID: ${status.listingId}`);
          
          if (status.isListed) {
            console.log('   ✅ This asset SHOULD show in marketplace');
          } else {
            console.log('   ❌ This asset should NOT show in marketplace');
          }
        }
      } catch (error) {
        console.log(`   ⚠️  Could not check status: ${error.message}`);
      }
      
      console.log('');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 MARKETPLACE DIAGNOSIS\n');
    console.log('To see assets in marketplace, they MUST:');
    console.log('1. ✅ Exist in localStorage (assetReferences)');
    console.log('2. ✅ Have isListed: true flag');
    console.log('3. ✅ Be listed on marketplace contract (verified via API)');
    console.log('\nIf no assets show:');
    console.log('- Check localStorage in browser console');
    console.log('- List an asset from Profile page');
    console.log('- Use a non-marketplace account (not 0.0.6916959)');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

main();

