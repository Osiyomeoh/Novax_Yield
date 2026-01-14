const { 
  Client, 
  AccountId, 
  PrivateKey, 
  ContractCreateFlow,
  ContractCallQuery,
  ContractFunctionParameters,
  Hbar,
  ContractExecuteTransaction
} = require('@hashgraph/sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function deployHscsWithHederaSdk() {
  console.log('🚀 Deploying HSCS Contracts using Hedera SDK...');
  
  // Get configuration
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';
  const trustTokenId = process.env.TRUST_TOKEN_ID || '0.0.6934709';
  
  if (!accountId || !privateKey) {
    console.error('❌ Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY');
    process.exit(1);
  }
  
  console.log('📋 Configuration:');
  console.log('Account ID:', accountId);
  console.log('Network:', network);
  console.log('Trust Token ID:', trustTokenId);
  
  try {
    // Initialize Hedera client
    const client = Client.forName(network);
    const operatorId = AccountId.fromString(accountId);
    
    let operatorKey;
    try {
      operatorKey = PrivateKey.fromStringECDSA(privateKey);
      console.log('✅ Using ECDSA key format');
    } catch (ecdsaError) {
      operatorKey = PrivateKey.fromString(privateKey);
      console.log('✅ Using regular key format');
    }
    
    client.setOperator(operatorId, operatorKey);
    
    // Check balance
    const balance = await new (require('@hashgraph/sdk').AccountBalanceQuery)()
      .setAccountId(operatorId)
      .execute(client);
    
    console.log('💰 Account balance:', balance.hbars.toString(), 'HBAR');
    
    const deploymentResults = {};
    
    // Step 1: Compile contracts first
    console.log('\n🔄 Compiling contracts...');
    try {
      const { execSync } = require('child_process');
      execSync('npx hardhat compile', { 
        cwd: path.join(__dirname, '../contracts'),
        stdio: 'inherit' 
      });
      console.log('✅ Contracts compiled successfully');
    } catch (error) {
      console.error('❌ Compilation failed:', error.message);
      process.exit(1);
    }
    
    // Step 2: Deploy TrustTokenExchange
    console.log('\n🔄 Deploying TrustTokenExchange...');
    try {
      const exchangeArtifact = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/TrustTokenExchange.sol/TrustTokenExchange.json'), 
        'utf8'
      ));
      
      const exchangeBytecode = exchangeArtifact.bytecode;
      
      // Deploy contract using ContractCreateFlow
      const contractCreateFlow = new ContractCreateFlow()
        .setGas(1000000)
        .setBytecode(exchangeBytecode)
        .setConstructorParameters(
          new ContractFunctionParameters()
            .addAddress(accountId) // treasuryWallet
            .addAddress(accountId) // operationsWallet  
            .addAddress(accountId) // stakingPool
            .addAddress(trustTokenId) // trustTokenContract
        );
      
      const txResponse = await contractCreateFlow.execute(client);
      const receipt = await txResponse.getReceipt(client);
      const exchangeContractId = receipt.contractId;
      
      deploymentResults.trustTokenExchange = exchangeContractId.toString();
      console.log('✅ TrustTokenExchange deployed to:', exchangeContractId.toString());
      console.log('📊 Transaction ID:', txResponse.transactionId.toString());
      console.log('🔗 Hashscan URL:', `https://hashscan.io/testnet/tx/${txResponse.transactionId.toString()}`);
      
    } catch (error) {
      console.error('❌ Failed to deploy TrustTokenExchange:', error.message);
    }
    
    // Step 3: Deploy TrustTokenBurner
    console.log('\n🔄 Deploying TrustTokenBurner...');
    try {
      const burnerArtifact = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/TrustTokenBurner.sol/TrustTokenBurner.json'), 
        'utf8'
      ));
      
      const burnerBytecode = burnerArtifact.bytecode;
      
      // Deploy contract using ContractCreateFlow
      const contractCreateFlow = new ContractCreateFlow()
        .setGas(800000)
        .setBytecode(burnerBytecode)
        .setConstructorParameters(
          new ContractFunctionParameters()
            .addAddress(trustTokenId) // trustTokenContract
            .addAddress(accountId) // treasuryWallet
        );
      
      const txResponse = await contractCreateFlow.execute(client);
      const receipt = await txResponse.getReceipt(client);
      const burnerContractId = receipt.contractId;
      
      deploymentResults.trustTokenBurner = burnerContractId.toString();
      console.log('✅ TrustTokenBurner deployed to:', burnerContractId.toString());
      console.log('📊 Transaction ID:', txResponse.transactionId.toString());
      console.log('🔗 Hashscan URL:', `https://hashscan.io/testnet/tx/${txResponse.transactionId.toString()}`);
      
    } catch (error) {
      console.error('❌ Failed to deploy TrustTokenBurner:', error.message);
    }
    
    // Step 4: Deploy TrustTokenStaking
    console.log('\n🔄 Deploying TrustTokenStaking...');
    try {
      const stakingArtifact = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/TrustTokenStaking.sol/TrustTokenStaking.json'), 
        'utf8'
      ));
      
      const stakingBytecode = stakingArtifact.bytecode;
      
      // Deploy contract using ContractCreateFlow
      const contractCreateFlow = new ContractCreateFlow()
        .setGas(900000)
        .setBytecode(stakingBytecode)
        .setConstructorParameters(
          new ContractFunctionParameters()
            .addAddress(trustTokenId) // trustTokenContract
            .addAddress(accountId) // rewardPool
        );
      
      const txResponse = await contractCreateFlow.execute(client);
      const receipt = await txResponse.getReceipt(client);
      const stakingContractId = receipt.contractId;
      
      deploymentResults.trustTokenStaking = stakingContractId.toString();
      console.log('✅ TrustTokenStaking deployed to:', stakingContractId.toString());
      console.log('📊 Transaction ID:', txResponse.transactionId.toString());
      console.log('🔗 Hashscan URL:', `https://hashscan.io/testnet/tx/${txResponse.transactionId.toString()}`);
      
    } catch (error) {
      console.error('❌ Failed to deploy TrustTokenStaking:', error.message);
    }
    
    // Step 5: Test deployed contracts
    console.log('\n🧪 Testing deployed contracts...');
    
    if (deploymentResults.trustTokenExchange) {
      try {
        const exchangeStatsQuery = new ContractCallQuery()
          .setContractId(deploymentResults.trustTokenExchange)
          .setGas(100000)
          .setFunction("getExchangeStats");
        
        const exchangeStats = await exchangeStatsQuery.execute(client);
        console.log('✅ TrustTokenExchange test successful');
      } catch (error) {
        console.log('⚠️ TrustTokenExchange test failed:', error.message);
      }
    }
    
    if (deploymentResults.trustTokenBurner) {
      try {
        const burnerFeeQuery = new ContractCallQuery()
          .setContractId(deploymentResults.trustTokenBurner)
          .setGas(100000)
          .setFunction("calculateNftCreationFee", new ContractFunctionParameters()
            .addString("basic")
            .addString("common")
          );
        
        const fee = await burnerFeeQuery.execute(client);
        console.log('✅ TrustTokenBurner test successful');
      } catch (error) {
        console.log('⚠️ TrustTokenBurner test failed:', error.message);
      }
    }
    
    // Step 6: Save deployment results
    const deploymentData = {
      network: "hedera_testnet",
      chainId: 296,
      timestamp: new Date().toISOString(),
      deployer: accountId,
      contracts: deploymentResults,
      configuration: {
        treasuryWallet: accountId,
        operationsWallet: accountId,
        stakingPool: accountId,
        trustTokenContract: trustTokenId
      }
    };
    
    const deploymentFile = path.join(__dirname, '../contracts/deployments/hscs-hedera-sdk.json');
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log('\n💾 Deployment data saved to:', deploymentFile);
    
    // Generate environment variables
    const envVars = `
# HSCS Contract Addresses (Generated on ${new Date().toISOString()})
TRUST_TOKEN_EXCHANGE_CONTRACT_ID=${deploymentResults.trustTokenExchange || 'NOT_DEPLOYED'}
TRUST_TOKEN_BURNER_CONTRACT_ID=${deploymentResults.trustTokenBurner || 'NOT_DEPLOYED'}
TRUST_TOKEN_STAKING_CONTRACT_ID=${deploymentResults.trustTokenStaking || 'NOT_DEPLOYED'}

# Account Addresses for Distribution
TREASURY_ACCOUNT_ID=${accountId}
OPERATIONS_ACCOUNT_ID=${accountId}
STAKING_ACCOUNT_ID=${accountId}
TRUST_TOKEN_ID=${trustTokenId}
`;
    
    const envFile = path.join(__dirname, '../.env.hscs');
    fs.writeFileSync(envFile, envVars);
    console.log('📝 Environment variables saved to:', envFile);
    
    console.log('\n🎉 HSCS Contract Deployment Complete!');
    console.log('\n📊 Deployment Summary:');
    console.log('┌─────────────────────────┬──────────────────────────────────────────┐');
    console.log('│ Contract                │ Address                                   │');
    console.log('├─────────────────────────┼──────────────────────────────────────────┤');
    console.log(`│ TrustTokenExchange      │ ${(deploymentResults.trustTokenExchange || 'FAILED').padEnd(42)} │`);
    console.log(`│ TrustTokenBurner        │ ${(deploymentResults.trustTokenBurner || 'FAILED').padEnd(42)} │`);
    console.log(`│ TrustTokenStaking       │ ${(deploymentResults.trustTokenStaking || 'FAILED').padEnd(42)} │`);
    console.log('└─────────────────────────┴──────────────────────────────────────────┘');
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Update your .env file with the contract addresses above');
    console.log('2. Restart your backend service');
    console.log('3. Test the integration with the frontend');
    console.log('4. Verify contracts on Hedera Explorer');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

deployHscsWithHederaSdk()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
