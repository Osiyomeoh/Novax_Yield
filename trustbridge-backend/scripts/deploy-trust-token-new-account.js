const { Client, AccountId, PrivateKey, TokenCreateTransaction, TokenType, TokenSupplyType } = require('@hashgraph/sdk');
require('dotenv').config();

async function deployTrustTokenNewAccount() {
  console.log('🚀 Deploying TRUST Token with new deployer account...');
  
  // Get configuration from environment
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';
  
  if (!accountId || !privateKey) {
    console.error('❌ Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY in environment variables');
    process.exit(1);
  }
  
  console.log('📋 Configuration:');
  console.log('Account ID:', accountId);
  console.log('Network:', network);
  
  try {
    // Initialize Hedera client
    const client = Client.forName(network);
    const operatorId = AccountId.fromString(accountId);
    
    // Try ECDSA first, fallback to regular parsing
    let operatorKey;
    try {
      operatorKey = PrivateKey.fromStringECDSA(privateKey);
      console.log('✅ Using ECDSA key format');
    } catch (ecdsaError) {
      console.log('⚠️ ECDSA parsing failed, trying regular format');
      operatorKey = PrivateKey.fromString(privateKey);
      console.log('✅ Using regular key format');
    }
    
    client.setOperator(operatorId, operatorKey);
    
    // Check account balance
    const balance = await new (require('@hashgraph/sdk').AccountBalanceQuery)()
      .setAccountId(operatorId)
      .execute(client);
    
    console.log('💰 Account balance:', balance.hbars.toString(), 'HBAR');
    
    if (balance.hbars.toTinybars() < 1000000000) { // Less than 10 HBAR
      console.warn('⚠️ Low account balance. Consider adding more HBAR for deployment.');
    }
    
    // Create TRUST token
    console.log('\n🔄 Creating TRUST token...');
    
    const tokenCreateTx = new TokenCreateTransaction()
      .setTokenName('TrustBridge Token')
      .setTokenSymbol('TRUST')
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(8)
      .setInitialSupply(0) // Start with 0 supply, mint as needed
      .setTreasuryAccountId(operatorId)
      .setSupplyType(TokenSupplyType.Infinite) // Allow unlimited minting
      .setMaxTransactionFee(1000);
    
    const tokenCreateResponse = await tokenCreateTx.execute(client);
    const tokenCreateReceipt = await tokenCreateResponse.getReceipt(client);
    
    const trustTokenId = tokenCreateReceipt.tokenId;
    
    console.log('✅ TRUST token created successfully!');
    console.log('Token ID:', trustTokenId.toString());
    console.log('Token Name: TrustBridge Token');
    console.log('Token Symbol: TRUST');
    console.log('Decimals: 8');
    console.log('Initial Supply: 0 (mint as needed)');
    console.log('Supply Type: Infinite (unlimited minting)');
    console.log('Treasury Account:', operatorId.toString());
    
    // Save token ID to environment file
    const envContent = `\n# TRUST Token Configuration (Generated on ${new Date().toISOString()})
TRUST_TOKEN_ID=${trustTokenId.toString()}
TRUST_TOKEN_NAME=TrustBridge Token
TRUST_TOKEN_SYMBOL=TRUST
TRUST_TOKEN_DECIMALS=8
TRUST_TOKEN_INITIAL_SUPPLY=0
TRUST_TOKEN_SUPPLY_TYPE=Infinite
TRUST_TOKEN_TREASURY=${operatorId.toString()}
`;
    
    const fs = require('fs');
    const envFile = '.env';
    
    // Read existing .env file
    let existingContent = '';
    try {
      existingContent = fs.readFileSync(envFile, 'utf8');
    } catch (error) {
      console.log('📝 Creating new .env file');
    }
    
    // Remove existing TRUST_TOKEN_ID if it exists
    const lines = existingContent.split('\n');
    const filteredLines = lines.filter(line => !line.startsWith('TRUST_TOKEN_'));
    const newContent = filteredLines.join('\n') + envContent;
    
    fs.writeFileSync(envFile, newContent);
    console.log('💾 Token configuration saved to .env file');
    
    // Generate environment variables for HSCS deployment
    const hscsEnvContent = `
# HSCS Contract Deployment Environment Variables (Generated on ${new Date().toISOString()})
TRUST_TOKEN_ID=${trustTokenId.toString()}
TREASURY_ACCOUNT_ID=${operatorId.toString()}
OPERATIONS_ACCOUNT_ID=${operatorId.toString()}
STAKING_ACCOUNT_ID=${operatorId.toString()}
HEDERA_ACCOUNT_ID=${operatorId.toString()}
`;
    
    fs.writeFileSync('.env.hscs', hscsEnvContent);
    console.log('📝 HSCS environment variables saved to .env.hscs');
    
    console.log('\n🎉 TRUST Token Deployment Complete!');
    console.log('\n📊 Token Summary:');
    console.log('┌─────────────────────────┬──────────────────────────────────────────┐');
    console.log('│ Property                │ Value                                     │');
    console.log('├─────────────────────────┼──────────────────────────────────────────┤');
    console.log(`│ Token ID                │ ${trustTokenId.toString().padEnd(42)} │`);
    console.log(`│ Name                    │ TrustBridge Token${' '.padEnd(25)} │`);
    console.log(`│ Symbol                  │ TRUST${' '.padEnd(37)} │`);
    console.log(`│ Decimals                │ 8${' '.padEnd(40)} │`);
    console.log(`│ Initial Supply          │ 0${' '.padEnd(40)} │`);
    console.log(`│ Supply Type             │ Infinite${' '.padEnd(33)} │`);
    console.log(`│ Treasury Account        │ ${operatorId.toString().padEnd(42)} │`);
    console.log('└─────────────────────────┴──────────────────────────────────────────┘');
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Deploy HSCS contracts using the token ID above');
    console.log('2. Test the TRUST token economy integration');
    console.log('3. Verify token on Hedera Explorer');
    console.log(`4. Hedera Explorer: https://testnet.hashio.io/token/${trustTokenId.toString()}`);
    
  } catch (error) {
    console.error('❌ Failed to deploy TRUST token:', error);
    process.exit(1);
  }
}

deployTrustTokenNewAccount()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
