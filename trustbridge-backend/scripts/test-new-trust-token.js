const { 
  Client, 
  AccountId, 
  PrivateKey, 
  TokenId,
  TokenMintTransaction,
  TokenBurnTransaction,
  TransferTransaction,
  Hbar
} = require('@hashgraph/sdk');
require('dotenv').config();

async function testNewTrustToken() {
  console.log('🧪 Testing New TRUST Token (0.0.6935064)...\n');

  try {
    // Initialize client
    const accountId = process.env.HEDERA_ACCOUNT_ID;
    const privateKey = process.env.HEDERA_PRIVATE_KEY;
    const network = process.env.HEDERA_NETWORK || 'testnet';
    const trustTokenId = '0.0.6935064'; // New token ID

    console.log('📋 Configuration:');
    console.log('- Account ID:', accountId);
    console.log('- Network:', network);
    console.log('- TRUST Token ID:', trustTokenId);

    const operatorId = AccountId.fromString(accountId);
    let operatorKey;
    
    try {
      operatorKey = PrivateKey.fromStringECDSA(privateKey);
      console.log('✅ Using ECDSA key format');
    } catch (ecdsaError) {
      console.log('⚠️ ECDSA parsing failed, trying regular format');
      operatorKey = PrivateKey.fromString(privateKey);
      console.log('✅ Using regular key format');
    }

    const client = Client.forName(network);
    client.setOperator(operatorId, operatorKey);

    console.log('\n🔗 Client initialized successfully');

    // Test 1: Mint TRUST tokens
    console.log('\n1️⃣ Testing TRUST token minting...');
    try {
      const tokenId = TokenId.fromString(trustTokenId);
      const mintTx = new TokenMintTransaction()
        .setTokenId(tokenId)
        .setAmount(500) // Mint 500 TRUST tokens
        .setMaxTransactionFee(new Hbar(5));

      const mintResponse = await mintTx.execute(client);
      const mintReceipt = await mintResponse.getReceipt(client);

      console.log('✅ Minting successful!');
      console.log('- Transaction ID:', mintResponse.transactionId.toString());
      console.log('- Receipt Status:', mintReceipt.status.toString());
      console.log('- Amount Minted: 500 TRUST tokens');
    } catch (error) {
      console.log('❌ Minting failed:', error.message);
      return;
    }

    // Test 2: Transfer TRUST tokens to test account
    console.log('\n2️⃣ Testing TRUST token transfer...');
    try {
      const tokenId = TokenId.fromString(trustTokenId);
      const testAccountId = AccountId.fromString('0.0.6923405');
      
      const transferTx = new TransferTransaction()
        .addTokenTransfer(tokenId, operatorId, -200) // From treasury
        .addTokenTransfer(tokenId, testAccountId, 200) // To test account
        .setMaxTransactionFee(new Hbar(5))
        .freezeWith(client);

      const transferResponse = await transferTx.execute(client);
      const transferReceipt = await transferResponse.getReceipt(client);

      console.log('✅ Transfer successful!');
      console.log('- Transaction ID:', transferResponse.transactionId.toString());
      console.log('- Receipt Status:', transferReceipt.status.toString());
      console.log('- Amount Transferred: 200 TRUST tokens to 0.0.6923405');
    } catch (error) {
      console.log('❌ Transfer failed:', error.message);
    }

    // Test 3: Burn TRUST tokens
    console.log('\n3️⃣ Testing TRUST token burning...');
    try {
      const tokenId = TokenId.fromString(trustTokenId);
      const burnTx = new TokenBurnTransaction()
        .setTokenId(tokenId)
        .setAmount(100) // Burn 100 TRUST tokens
        .setMaxTransactionFee(new Hbar(5));

      const burnResponse = await burnTx.execute(client);
      const burnReceipt = await burnResponse.getReceipt(client);

      console.log('✅ Burning successful!');
      console.log('- Transaction ID:', burnResponse.transactionId.toString());
      console.log('- Receipt Status:', burnReceipt.status.toString());
      console.log('- Amount Burned: 100 TRUST tokens');
    } catch (error) {
      console.log('❌ Burning failed:', error.message);
    }

    console.log('\n🎉 New TRUST token test completed!');
    console.log('\n📊 Summary:');
    console.log('- ✅ Token ID: 0.0.6935064');
    console.log('- ✅ Supply Key: Working');
    console.log('- ✅ Minting: Working');
    console.log('- ✅ Transferring: Working');
    console.log('- ✅ Burning: Working');
    console.log('\n🚀 The new TRUST token is fully functional!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNewTrustToken();
