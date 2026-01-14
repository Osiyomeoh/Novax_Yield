/**
 * Test approveNFT function in isolation
 * This will help us verify if the function works correctly
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

async function testApproveNFT() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║              Testing approveNFT Function                    ║');
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

  // Test parameters (using real values from your error logs)
  const nftTokenId = '0.0.7028555';  // From your error logs
  const serialNumber = 1;
  const marketplaceContractId = '0.0.7060267';  // Our deployed contract

  console.log('📋 Test Parameters:');
  console.log('   NFT Token ID:', nftTokenId);
  console.log('   Serial Number:', serialNumber);
  console.log('   Marketplace Contract:', marketplaceContractId);
  console.log('   Owner Account:', accountId);
  console.log('');

  try {
    // Step 1: Parse all IDs
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: Parse All IDs');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let marketplaceAccountId, tokenId, ownerAccountId;
    
    // Parse marketplace contract ID
    try {
      console.log('🔍 Parsing marketplace contract ID...');
      marketplaceAccountId = AccountId.fromString(marketplaceContractId);
      console.log('✅ Marketplace account ID:', marketplaceAccountId.toString());
    } catch (e) {
      console.error('❌ Failed to parse marketplace contract ID:', e.message);
      throw e;
    }
    
    // Parse NFT token ID
    try {
      console.log('🔍 Parsing NFT token ID...');
      tokenId = TokenId.fromString(nftTokenId);
      console.log('✅ NFT token ID:', tokenId.toString());
    } catch (e) {
      console.error('❌ Failed to parse NFT token ID:', e.message);
      throw e;
    }
    
    // Parse owner account ID
    try {
      console.log('🔍 Parsing owner account ID...');
      ownerAccountId = AccountId.fromString(accountId);
      console.log('✅ Owner account ID:', ownerAccountId.toString());
    } catch (e) {
      console.error('❌ Failed to parse owner account ID:', e.message);
      throw e;
    }

    console.log('\n✅ All IDs parsed successfully!');

    // Step 2: Create the transaction
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Create Transaction');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔍 Creating AccountAllowanceApproveTransaction...');
    console.log('   Token ID:', tokenId.toString());
    console.log('   Owner:', ownerAccountId.toString());
    console.log('   Spender:', marketplaceAccountId.toString());
    console.log('   Serial Numbers:', [serialNumber]);

    const approveTx = new AccountAllowanceApproveTransaction()
      .approveTokenNftAllowance(
        tokenId,
        ownerAccountId,
        marketplaceAccountId,
        [serialNumber]
      )
      .setMaxTransactionFee(new Hbar(2));

    console.log('✅ Transaction created successfully');

    // Step 3: Set transaction ID
    console.log('\n🔍 Setting transaction ID...');
    approveTx.setTransactionId(TransactionId.generate(ownerAccountId));
    console.log('✅ Transaction ID set');

    // Step 4: Freeze the transaction
    console.log('\n🔍 Freezing transaction...');
    await approveTx.freezeWith(client);
    console.log('✅ Transaction frozen successfully');

    // Step 5: Sign the transaction
    console.log('\n🔍 Signing transaction...');
    const signedTx = await operatorKey.signTransaction(approveTx);
    console.log('✅ Transaction signed successfully');

    // Step 6: Execute the transaction
    console.log('\n🔍 Executing transaction...');
    const response = await signedTx.execute(client);
    console.log('✅ Transaction executed successfully');
    console.log('   Transaction ID:', response.transactionId.toString());

    // Step 7: Get receipt
    console.log('\n🔍 Getting receipt...');
    const receipt = await response.getReceipt(client);
    console.log('✅ Receipt received successfully');
    console.log('   Status:', receipt.status.toString());

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SUCCESS! approveNFT function works correctly!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Summary:');
    console.log('   NFT Token ID:', nftTokenId);
    console.log('   Serial Number:', serialNumber);
    console.log('   Marketplace Contract:', marketplaceContractId);
    console.log('   Transaction ID:', response.transactionId.toString());
    console.log('   HashScan:', `https://hashscan.io/testnet/transaction/${response.transactionId.toString()}`);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Error details:', error);
    
    console.log('\n🔍 Debugging Information:');
    console.log('   NFT Token ID:', nftTokenId, '(type:', typeof nftTokenId, ')');
    console.log('   Serial Number:', serialNumber, '(type:', typeof serialNumber, ')');
    console.log('   Marketplace Contract:', marketplaceContractId, '(type:', typeof marketplaceContractId, ')');
    console.log('   Owner Account:', accountId, '(type:', typeof accountId, ')');
    
    throw error;
  } finally {
    client.close();
  }
}

// Run the test
testApproveNFT()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
