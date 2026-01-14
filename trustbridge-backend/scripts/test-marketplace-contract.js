const {
  Client,
  AccountId,
  PrivateKey,
  ContractCallQuery,
  ContractFunctionParameters
} = require('@hashgraph/sdk');
require('dotenv').config();

/**
 * Test marketplace contract queries
 */
async function testMarketplaceContract() {
  console.log('\n🧪 Testing Marketplace Contract...\n');

  try {
    // Setup client
    const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);
    
    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

    const marketplaceContractId = process.env.MARKETPLACE_CONTRACT_ID || '0.0.7009326';
    
    console.log('📋 Configuration:');
    console.log('   Operator:', operatorId.toString());
    console.log('   Marketplace Contract:', marketplaceContractId);
    console.log('');

    // Test 1: Get marketplace config
    console.log('🔍 Test 1: Getting marketplace config...');
    try {
      const configQuery = new ContractCallQuery()
        .setContractId(marketplaceContractId)
        .setGas(100000)
        .setFunction('getConfig');

      const configResult = await configQuery.execute(client);

      const trustToken = AccountId.fromSolidityAddress(configResult.getAddress(0)).toString();
      const treasury = AccountId.fromSolidityAddress(configResult.getAddress(1)).toString();
      const feeBps = configResult.getUint256(2).toNumber();
      const owner = AccountId.fromSolidityAddress(configResult.getAddress(3)).toString();
      const activeListings = configResult.getUint256(4).toNumber();

      console.log('✅ Marketplace Config:');
      console.log('   TRUST Token:', trustToken);
      console.log('   Treasury:', treasury);
      console.log('   Platform Fee:', feeBps / 100, '%');
      console.log('   Owner:', owner);
      console.log('   Active Listings:', activeListings);
      console.log('');
    } catch (error) {
      console.error('❌ Failed to get config:', error.message);
    }

    // Test 2: Check if a test NFT is listed
    console.log('🔍 Test 2: Checking if test NFT is listed...');
    const testNftId = '0.0.6923316'; // Use an actual NFT from your tests
    const testSerial = 1;
    
    try {
      const nftAddress = AccountId.fromString(testNftId).toSolidityAddress();
      
      const params = new ContractFunctionParameters()
        .addAddress(nftAddress)
        .addUint256(testSerial);

      const listingQuery = new ContractCallQuery()
        .setContractId(marketplaceContractId)
        .setGas(100000)
        .setFunction('isNFTListed', params);

      const listingResult = await listingQuery.execute(client);

      const isListed = listingResult.getBool(0);
      const listingId = listingResult.getUint256(1).toNumber();

      console.log('✅ NFT Listing Status:');
      console.log('   NFT:', testNftId);
      console.log('   Serial:', testSerial);
      console.log('   Is Listed:', isListed);
      console.log('   Listing ID:', listingId);
      console.log('');
    } catch (error) {
      console.error('❌ Failed to check listing:', error.message);
    }

    console.log('✅ Marketplace contract test complete!\n');
    
    client.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testMarketplaceContract();

