/**
 * Test simple NFT allowance creation
 * Let's debug the approveTokenNftAllowance call step by step
 */

require('dotenv').config();
const {
  Client,
  AccountId,
  PrivateKey,
  TokenId,
  AccountAllowanceApproveTransaction,
  TransactionId,
  Hbar,
} = require('@hashgraph/sdk');

async function testSimpleAllowance() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║            Testing Simple NFT Allowance Creation            ║');
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
    // Parse IDs with detailed logging
    console.log('🔍 Parsing Token ID...');
    const tokenId = TokenId.fromString(nftTokenId);
    console.log('✅ Token ID:', tokenId.toString());
    console.log('   Token ID object:', tokenId);
    console.log('   Token ID type:', typeof tokenId);
    console.log('   Token ID constructor:', tokenId.constructor.name);

    console.log('\n🔍 Parsing Owner Account ID...');
    const ownerAccountId = AccountId.fromString(accountId);
    console.log('✅ Owner Account ID:', ownerAccountId.toString());
    console.log('   Owner Account object:', ownerAccountId);
    console.log('   Owner Account type:', typeof ownerAccountId);
    console.log('   Owner Account constructor:', ownerAccountId.constructor.name);

    console.log('\n🔍 Parsing Marketplace Account ID...');
    const marketplaceAccountId = AccountId.fromString(marketplaceContractId);
    console.log('✅ Marketplace Account ID:', marketplaceAccountId.toString());
    console.log('   Marketplace Account object:', marketplaceAccountId);
    console.log('   Marketplace Account type:', typeof marketplaceAccountId);
    console.log('   Marketplace Account constructor:', marketplaceAccountId.constructor.name);

    console.log('\n🔍 Serial Number...');
    console.log('✅ Serial Number:', serialNumber);
    console.log('   Serial Number type:', typeof serialNumber);

    // Test 1: Create transaction without calling approveTokenNftAllowance
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: Create Empty Transaction');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const emptyTx = new AccountAllowanceApproveTransaction()
      .setMaxTransactionFee(new Hbar(2));

    console.log('✅ Empty transaction created successfully');

    // Test 2: Try to add the NFT allowance
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: Add NFT Allowance');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔍 Calling approveTokenNftAllowance with:');
    console.log('   tokenId:', tokenId);
    console.log('   ownerAccountId:', ownerAccountId);
    console.log('   marketplaceAccountId:', marketplaceAccountId);
    console.log('   serialNumbers:', [serialNumber]);

    try {
      emptyTx.approveTokenNftAllowance(
        tokenId,
        ownerAccountId,
        marketplaceAccountId,
        [serialNumber]
      );
      console.log('✅ approveTokenNftAllowance call succeeded');
    } catch (error) {
      console.error('❌ approveTokenNftAllowance call failed:', error.message);
      throw error;
    }

    // Test 3: Try to freeze
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 3: Freeze Transaction');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔍 Setting transaction ID...');
    emptyTx.setTransactionId(TransactionId.generate(ownerAccountId));
    console.log('✅ Transaction ID set');

    console.log('🔍 Freezing transaction...');
    await emptyTx.freezeWith(client);
    console.log('✅ Transaction frozen successfully');

    console.log('\n✅ ALL TESTS PASSED! The issue is not with the basic allowance creation.');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Error details:', error);
    
    // Additional debugging
    console.log('\n🔍 Additional Debug Info:');
    console.log('   Error name:', error.name);
    console.log('   Error stack:', error.stack);
    
    throw error;
  } finally {
    client.close();
  }
}

// Run the test
testSimpleAllowance()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
