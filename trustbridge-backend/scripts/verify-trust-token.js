const { Client, AccountId, PrivateKey, TokenInfoQuery } = require('@hashgraph/sdk');
require('dotenv').config();

async function verifyTrustToken() {
  console.log('🔍 Verifying TRUST Token: 0.0.6923396');
  
  // Get configuration from environment
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';
  
  if (!accountId || !privateKey) {
    console.error('❌ Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY in environment variables');
    process.exit(1);
  }
  
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
    
    // Query token information
    const tokenId = '0.0.6923396';
    console.log('\n🔄 Querying token information...');
    
    const tokenInfoQuery = new TokenInfoQuery()
      .setTokenId(tokenId);
    
    const tokenInfo = await tokenInfoQuery.execute(client);
    
    console.log('✅ Token information retrieved successfully!');
    console.log('\n📊 TRUST Token Details:');
    console.log('┌─────────────────────────┬──────────────────────────────────────────┐');
    console.log('│ Property                │ Value                                     │');
    console.log('├─────────────────────────┼──────────────────────────────────────────┤');
    console.log(`│ Token ID                │ ${tokenId.padEnd(42)} │`);
    console.log(`│ Name                    │ ${tokenInfo.name.padEnd(42)} │`);
    console.log(`│ Symbol                  │ ${tokenInfo.symbol.padEnd(42)} │`);
    console.log(`│ Decimals                │ ${tokenInfo.decimals.toString().padEnd(42)} │`);
    console.log(`│ Total Supply            │ ${tokenInfo.totalSupply.toString().padEnd(42)} │`);
    console.log(`│ Treasury Account        │ ${tokenInfo.treasuryAccountId.toString().padEnd(42)} │`);
    console.log(`│ Supply Type             │ ${tokenInfo.supplyType.toString().padEnd(42)} │`);
    console.log(`│ Token Type              │ ${tokenInfo.tokenType.toString().padEnd(42)} │`);
    console.log('└─────────────────────────┴──────────────────────────────────────────┘');
    
    // Check if token aligns with our tokenomics
    console.log('\n🔍 Tokenomics Verification:');
    
    const isFungible = tokenInfo.tokenType.toString() === 'FungibleCommon';
    const hasInfiniteSupply = tokenInfo.supplyType.toString() === 'Infinite';
    const hasCorrectDecimals = tokenInfo.decimals === 8;
    const hasCorrectName = tokenInfo.name === 'TrustBridge Token' || tokenInfo.name.includes('Trust');
    const hasCorrectSymbol = tokenInfo.symbol === 'TRUST';
    
    console.log(`✅ Fungible Token: ${isFungible ? 'YES' : 'NO'}`);
    console.log(`✅ Infinite Supply: ${hasInfiniteSupply ? 'YES' : 'NO'}`);
    console.log(`✅ 8 Decimals: ${hasCorrectDecimals ? 'YES' : 'NO'}`);
    console.log(`✅ Correct Name: ${hasCorrectName ? 'YES' : 'NO'}`);
    console.log(`✅ Correct Symbol: ${hasCorrectSymbol ? 'YES' : 'NO'}`);
    
    const tokenomicsCompliant = isFungible && hasInfiniteSupply && hasCorrectDecimals && hasCorrectName && hasCorrectSymbol;
    
    if (tokenomicsCompliant) {
      console.log('\n🎉 Token is compliant with our tokenomics model!');
      console.log('✅ Ready for HSCS contract deployment');
    } else {
      console.log('\n⚠️ Token may not be fully compliant with our tokenomics model');
      console.log('Consider creating a new token or updating the existing one');
    }
    
    // Generate environment variables for HSCS deployment
    const envContent = `
# TRUST Token Configuration (Verified on ${new Date().toISOString()})
TRUST_TOKEN_ID=${tokenId}
TRUST_TOKEN_NAME=${tokenInfo.name}
TRUST_TOKEN_SYMBOL=${tokenInfo.symbol}
TRUST_TOKEN_DECIMALS=${tokenInfo.decimals}
TRUST_TOKEN_TOTAL_SUPPLY=${tokenInfo.totalSupply.toString()}
TRUST_TOKEN_TREASURY=${tokenInfo.treasuryAccountId.toString()}
TRUST_TOKEN_SUPPLY_TYPE=${tokenInfo.supplyType.toString()}
TRUST_TOKEN_TYPE=${tokenInfo.tokenType.toString()}

# HSCS Contract Deployment Environment Variables
TREASURY_ACCOUNT_ID=${tokenInfo.treasuryAccountId.toString()}
OPERATIONS_ACCOUNT_ID=${tokenInfo.treasuryAccountId.toString()}
STAKING_ACCOUNT_ID=${tokenInfo.treasuryAccountId.toString()}
`;
    
    const fs = require('fs');
    fs.writeFileSync('.env.trust-token', envContent);
    console.log('\n💾 Token configuration saved to .env.trust-token');
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Deploy HSCS contracts using this token ID');
    console.log('2. Test the TRUST token economy integration');
    console.log('3. Verify token on Hedera Explorer: https://testnet.hashio.io/token/' + tokenId);
    
  } catch (error) {
    console.error('❌ Failed to verify TRUST token:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

verifyTrustToken()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
