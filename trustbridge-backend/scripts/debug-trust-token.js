const { 
  Client, 
  AccountId, 
  PrivateKey, 
  TokenId,
  TokenMintTransaction,
  Hbar
} = require('@hashgraph/sdk');
require('dotenv').config();

async function debugTrustToken() {
  console.log('🔍 Debugging TRUST Token...\n');

  try {
    // Initialize client
    const accountId = process.env.HEDERA_ACCOUNT_ID;
    const privateKey = process.env.HEDERA_PRIVATE_KEY;
    const network = process.env.HEDERA_NETWORK || 'testnet';
    const trustTokenId = process.env.TRUST_TOKEN_ID;

    console.log('📋 Configuration:');
    console.log('- Account ID:', accountId);
    console.log('- Network:', network);
    console.log('- TRUST Token ID:', trustTokenId);

    if (!accountId || !privateKey || !trustTokenId) {
      throw new Error('Missing required environment variables');
    }

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

    // Test token ID parsing
    console.log('\n🧪 Testing token ID parsing...');
    try {
      const tokenId = TokenId.fromString(trustTokenId);
      console.log('✅ Token ID parsed successfully:', tokenId.toString());
    } catch (error) {
      console.log('❌ Token ID parsing failed:', error.message);
      return;
    }

    // Test minting transaction creation
    console.log('\n🧪 Testing minting transaction creation...');
    try {
      const tokenId = TokenId.fromString(trustTokenId);
      const mintTx = new TokenMintTransaction()
        .setTokenId(tokenId)
        .setAmount(100)
        .setMaxTransactionFee(new Hbar(5));

      console.log('✅ Minting transaction created successfully');
      console.log('- Token ID:', mintTx.tokenId?.toString());
      console.log('- Amount:', mintTx.amount);
      console.log('- Max Fee:', mintTx.maxTransactionFee?.toString());
    } catch (error) {
      console.log('❌ Minting transaction creation failed:', error.message);
      return;
    }

    // Test actual minting (small amount)
    console.log('\n🧪 Testing actual minting (10 tokens)...');
    try {
      const tokenId = TokenId.fromString(trustTokenId);
      const mintTx = new TokenMintTransaction()
        .setTokenId(tokenId)
        .setAmount(10)
        .setMaxTransactionFee(new Hbar(5));

      console.log('🔄 Executing minting transaction...');
      const mintResponse = await mintTx.execute(client);
      const mintReceipt = await mintResponse.getReceipt(client);

      console.log('✅ Minting successful!');
      console.log('- Transaction ID:', mintResponse.transactionId.toString());
      console.log('- Receipt Status:', mintReceipt.status.toString());
    } catch (error) {
      console.log('❌ Minting execution failed:', error.message);
      console.log('Error details:', error);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugTrustToken();
