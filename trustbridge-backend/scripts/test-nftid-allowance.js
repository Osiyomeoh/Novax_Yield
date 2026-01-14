/**
 * Test NFT allowance using NftId approach
 * This might be the correct way to create NFT allowances
 */

require('dotenv').config();
const {
  Client,
  AccountId,
  PrivateKey,
  TokenId,
  NftId,
  AccountAllowanceApproveTransaction,
  TransactionId,
  Hbar,
} = require('@hashgraph/sdk');

async function testNftIdAllowance() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║            Testing NFT Allowance with NftId                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Setup
  const accountId = process.env.HEDERA_ACCOUNT_ID || process.env.MY_ACCOUNT_ID;
  const privateKeyStr = process.env.HEDERA_PRIVATE_KEY || process.env.MY_PRIVATE_KEY;

  if (!accountId || !privateKeyStr) {
    throw new Error('Missing HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY in .env');
  }

  const client = Client.forTestnet();
  const operatorId = AccountId.fromString(accountId);
  
  let operatorKey;
  try {
    operatorKey = PrivateKey.fromStringECDSA(privateKeyStr);
  } catch (e) {
    operatorKey = PrivateKey.fromString(privateKeyStr);
  }
  
  client.setOperator(operatorId, operatorKey);

  console.log('🔧 Operator Account:', accountId);
  console.log('');

  // Test parameters
  const nftTokenId = '0.0.7028555';
  const serialNumber = 1;
  const marketplaceContractId = '0.0.7060267';

  try {
    // Parse IDs
    console.log('🔍 Parsing IDs...');
    const tokenId = TokenId.fromString(nftTokenId);
    const ownerAccountId = AccountId.fromString(accountId);
    const marketplaceAccountId = AccountId.fromString(marketplaceContractId);
    
    console.log('✅ Token ID:', tokenId.toString());
    console.log('✅ Owner Account ID:', ownerAccountId.toString());
    console.log('✅ Marketplace Account ID:', marketplaceAccountId.toString());

    // Test 1: Create NftId
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: Create NftId');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const nftId = new NftId(tokenId, serialNumber);
    console.log('✅ NftId created:', nftId.toString());
    console.log('   NftId object:', nftId);
    console.log('   NftId type:', typeof nftId);
    console.log('   NftId constructor:', nftId.constructor.name);

    // Test 2: Create transaction with NftId
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: Create Transaction with NftId');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const approveTx = new AccountAllowanceApproveTransaction()
      .approveTokenNftAllowance(
        tokenId,
        ownerAccountId,
        marketplaceAccountId,
        [nftId]  // Use NftId instead of serial number
      )
      .setMaxTransactionFee(new Hbar(2));

    console.log('✅ Transaction created with NftId');

    // Test 3: Try to freeze
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 3: Freeze Transaction');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔍 Setting transaction ID...');
    approveTx.setTransactionId(TransactionId.generate(ownerAccountId));
    console.log('✅ Transaction ID set');

    console.log('🔍 Freezing transaction...');
    await approveTx.freezeWith(client);
    console.log('✅ Transaction frozen successfully');

    console.log('\n✅ SUCCESS! NftId approach works!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Error details:', error);
    
    // Try alternative approach
    console.log('\n🔍 Trying alternative approach...');
    
    try {
      console.log('🔍 Testing with serial number array...');
      const tokenId = TokenId.fromString(nftTokenId);
      const ownerAccountId = AccountId.fromString(accountId);
      const marketplaceAccountId = AccountId.fromString(marketplaceContractId);
      
      const approveTx2 = new AccountAllowanceApproveTransaction()
        .approveTokenNftAllowance(
          tokenId,
          ownerAccountId,
          marketplaceAccountId,
          [serialNumber]  // Back to serial number
        )
        .setMaxTransactionFee(new Hbar(2));

      console.log('✅ Alternative transaction created');
      
      // Try different freezing approach
      console.log('🔍 Trying different freezing approach...');
      approveTx2.setTransactionId(TransactionId.generate(ownerAccountId));
      
      // Try using a different client
      const freshClient = Client.forTestnet();
      await approveTx2.freezeWith(freshClient);
      console.log('✅ Alternative approach worked!');
      
    } catch (altError) {
      console.error('❌ Alternative approach also failed:', altError.message);
    }
    
    throw error;
  } finally {
    client.close();
  }
}

// Run the test
testNftIdAllowance()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
