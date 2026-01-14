const { 
  Client, 
  AccountId, 
  PrivateKey, 
  TokenId,
  TokenUpdateTransaction,
  KeyList,
  Hbar
} = require('@hashgraph/sdk');
require('dotenv').config();

async function fixTrustTokenSupplyKey() {
  console.log('🔧 Fixing TRUST Token Supply Key...\n');

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

    // Create a new supply key (using the same operator key for simplicity)
    const supplyKey = operatorKey;
    console.log('🔑 Supply key created');

    // Update the token to add the supply key
    console.log('\n🔄 Updating TRUST token with supply key...');
    
    const tokenUpdateTx = new TokenUpdateTransaction()
      .setTokenId(TokenId.fromString(trustTokenId))
      .setSupplyKey(supplyKey)
      .setMaxTransactionFee(new Hbar(10));

    const updateResponse = await tokenUpdateTx.execute(client);
    const updateReceipt = await updateResponse.getReceipt(client);

    console.log('✅ TRUST token updated successfully!');
    console.log('- Transaction ID:', updateResponse.transactionId.toString());
    console.log('- Receipt Status:', updateReceipt.status.toString());
    console.log('- Supply Key Added:', supplyKey.publicKey.toString());

    // Test minting after the update
    console.log('\n🧪 Testing minting after supply key update...');
    
    const { TokenMintTransaction } = require('@hashgraph/sdk');
    const mintTx = new TokenMintTransaction()
      .setTokenId(TokenId.fromString(trustTokenId))
      .setAmount(100)
      .setMaxTransactionFee(new Hbar(5));

    const mintResponse = await mintTx.execute(client);
    const mintReceipt = await mintResponse.getReceipt(client);

    console.log('✅ Minting test successful!');
    console.log('- Transaction ID:', mintResponse.transactionId.toString());
    console.log('- Receipt Status:', mintReceipt.status.toString());
    console.log('- Amount Minted: 100 TRUST tokens');

    console.log('\n🎉 TRUST token supply key fix completed successfully!');
    console.log('The token can now be minted and burned.');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    if (error.status) {
      console.error('Status:', error.status.toString());
    }
  }
}

fixTrustTokenSupplyKey();
