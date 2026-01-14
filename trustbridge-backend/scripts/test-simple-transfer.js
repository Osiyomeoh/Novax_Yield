/**
 * Test simple NFT transfer instead of allowance
 * Maybe we should use direct transfer instead of allowance
 */

require('dotenv').config();
const {
  Client,
  AccountId,
  PrivateKey,
  TokenId,
  TransferTransaction,
  TransactionId,
  Hbar,
} = require('@hashgraph/sdk');

async function testSimpleTransfer() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║              Testing Simple NFT Transfer                    ║');
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

    // Test: Create simple transfer transaction
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST: Create Simple Transfer Transaction');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const transferTx = new TransferTransaction()
      .addNftTransfer(
        tokenId,
        serialNumber,
        ownerAccountId,
        marketplaceAccountId
      )
      .setMaxTransactionFee(new Hbar(2));

    console.log('✅ Transfer transaction created successfully');

    // Test: Try to freeze
    console.log('\n🔍 Setting transaction ID...');
    transferTx.setTransactionId(TransactionId.generate(ownerAccountId));
    console.log('✅ Transaction ID set');

    console.log('🔍 Freezing transaction...');
    await transferTx.freezeWith(client);
    console.log('✅ Transaction frozen successfully');

    console.log('\n✅ SUCCESS! Simple transfer works!');
    console.log('\n💡 SOLUTION: Use direct transfer instead of allowance!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Error details:', error);
    throw error;
  } finally {
    client.close();
  }
}

// Run the test
testSimpleTransfer()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
