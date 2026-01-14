const { 
  Client, 
  AccountId, 
  PrivateKey, 
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  Hbar
} = require('@hashgraph/sdk');
require('dotenv').config();

async function createNewTrustToken() {
  console.log('🚀 Creating New TRUST Token with Supply Key...\n');

  try {
    // Initialize client
    const accountId = process.env.HEDERA_ACCOUNT_ID;
    const privateKey = process.env.HEDERA_PRIVATE_KEY;
    const network = process.env.HEDERA_NETWORK || 'testnet';

    console.log('📋 Configuration:');
    console.log('- Account ID:', accountId);
    console.log('- Network:', network);

    if (!accountId || !privateKey) {
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

    // Check account balance
    const balance = await new (require('@hashgraph/sdk').AccountBalanceQuery)()
      .setAccountId(operatorId)
      .execute(client);
    
    console.log('💰 Account balance:', balance.hbars.toString(), 'HBAR');

    // Create new TRUST token with supply key
    console.log('\n🔄 Creating new TRUST token with supply key...');
    
    const tokenCreateTx = new TokenCreateTransaction()
      .setTokenName('TrustBridge Token')
      .setTokenSymbol('TRUST')
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(8)
      .setInitialSupply(0) // Start with 0 supply, mint as needed
      .setTreasuryAccountId(operatorId)
      .setSupplyType(TokenSupplyType.Infinite) // Allow unlimited minting
      .setSupplyKey(operatorKey) // IMPORTANT: Set supply key for minting
      .setMaxTransactionFee(new Hbar(10));

    const tokenCreateResponse = await tokenCreateTx.execute(client);
    const tokenCreateReceipt = await tokenCreateResponse.getReceipt(client);

    const newTrustTokenId = tokenCreateReceipt.tokenId;

    console.log('✅ New TRUST token created successfully!');
    console.log('- Token ID:', newTrustTokenId.toString());
    console.log('- Token Name: TrustBridge Token');
    console.log('- Token Symbol: TRUST');
    console.log('- Decimals: 8');
    console.log('- Initial Supply: 0 (mint as needed)');
    console.log('- Supply Type: Infinite (unlimited minting)');
    console.log('- Treasury Account:', operatorId.toString());
    console.log('- Supply Key: Set (allows minting)');
    console.log('- Transaction ID:', tokenCreateResponse.transactionId.toString());

    // Test minting immediately
    console.log('\n🧪 Testing minting with new token...');
    
    const { TokenMintTransaction } = require('@hashgraph/sdk');
    const mintTx = new TokenMintTransaction()
      .setTokenId(newTrustTokenId)
      .setAmount(1000) // Mint 1000 TRUST tokens
      .setMaxTransactionFee(new Hbar(5));

    const mintResponse = await mintTx.execute(client);
    const mintReceipt = await mintResponse.getReceipt(client);

    console.log('✅ Minting test successful!');
    console.log('- Transaction ID:', mintResponse.transactionId.toString());
    console.log('- Receipt Status:', mintReceipt.status.toString());
    console.log('- Amount Minted: 1000 TRUST tokens');

    // Update .env file with new token ID
    console.log('\n📝 Updating .env file with new token ID...');
    
    const fs = require('fs');
    const envFile = '.env';
    
    // Read existing .env file
    let existingContent = '';
    try {
      existingContent = fs.readFileSync(envFile, 'utf8');
    } catch (error) {
      console.log('📝 Creating new .env file');
    }
    
    // Remove old TRUST_TOKEN_ID and add new one
    const lines = existingContent.split('\n');
    const filteredLines = lines.filter(line => !line.startsWith('TRUST_TOKEN_ID='));
    
    const newEnvContent = filteredLines.join('\n') + 
      `\n# Updated TRUST Token ID (Generated on ${new Date().toISOString()})\n` +
      `TRUST_TOKEN_ID=${newTrustTokenId.toString()}\n`;
    
    fs.writeFileSync(envFile, newEnvContent);
    
    console.log('✅ .env file updated with new token ID:', newTrustTokenId.toString());

    console.log('\n🎉 New TRUST token creation completed successfully!');
    console.log('The token can now be minted, burned, and used in the platform.');
    console.log('\n📋 Next Steps:');
    console.log('1. Restart the backend server to pick up the new token ID');
    console.log('2. Test the hybrid integration with the new token');
    console.log('3. Update frontend to use the new token');

  } catch (error) {
    console.error('❌ Creation failed:', error.message);
    if (error.status) {
      console.error('Status:', error.status.toString());
    }
  }
}

createNewTrustToken();
