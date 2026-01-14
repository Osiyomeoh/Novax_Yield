const { 
  Client, 
  AccountId, 
  PrivateKey, 
  ContractCreateTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  Hbar,
  FileCreateTransaction,
  FileAppendTransaction,
  FileId
} = require('@hashgraph/sdk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

async function deployHscsContractsProper() {
  console.log('🚀 Starting Proper HSCS Contract Deployment...');
  
  // Get configuration from environment
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';
  const trustTokenId = process.env.TRUST_TOKEN_ID || '0.0.6934709';
  
  if (!accountId || !privateKey) {
    console.error('❌ Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY in environment variables');
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
    
    // Step 1: Compile contracts using Hardhat
    console.log('\n🔄 Compiling contracts...');
    try {
      execSync('npx hardhat compile', { 
        cwd: path.join(__dirname, '../contracts'),
        stdio: 'inherit' 
      });
      console.log('✅ Contracts compiled successfully');
    } catch (error) {
      console.error('❌ Contract compilation failed:', error.message);
      process.exit(1);
    }
    
    // Step 2: Read compiled bytecode
    const contractsDir = path.join(__dirname, '../contracts/artifacts/contracts');
    const deploymentResults = {};
    
    // Deploy TrustTokenExchange
    console.log('\n🔄 Deploying TrustTokenExchange...');
    try {
      const exchangeArtifact = JSON.parse(fs.readFileSync(
        path.join(contractsDir, 'TrustTokenExchange.sol/TrustTokenExchange.json'), 
        'utf8'
      ));
      
      const exchangeBytecode = exchangeArtifact.bytecode;
      
      // Create file for bytecode
      const fileCreateTx = new FileCreateTransaction()
        .setContents(exchangeBytecode)
        .setMaxTransactionFee(1000);
      
      const fileCreateResponse = await fileCreateTx.execute(client);
      const fileCreateReceipt = await fileCreateResponse.getReceipt(client);
      const fileId = fileCreateReceipt.fileId;
      
      console.log('📁 Bytecode file created:', fileId.toString());
      
      // Deploy contract
      const contractCreateTx = new ContractCreateTransaction()
        .setBytecodeFileId(fileId)
        .setGas(500000)
        .setConstructorParameters(
          new ContractFunctionParameters()
            .addAddress(accountId) // treasuryWallet
            .addAddress(accountId) // operationsWallet  
            .addAddress(accountId) // stakingPool
            .addAddress(trustTokenId) // trustTokenContract
        )
        .setMaxTransactionFee(1000);
      
      const contractCreateResponse = await contractCreateTx.execute(client);
      const contractCreateReceipt = await contractCreateResponse.getReceipt(client);
      const exchangeContractId = contractCreateReceipt.contractId;
      
      deploymentResults.trustTokenExchange = exchangeContractId.toString();
      console.log('✅ TrustTokenExchange deployed to:', exchangeContractId.toString());
      
    } catch (error) {
      console.error('❌ Failed to deploy TrustTokenExchange:', error.message);
    }
    
    // Deploy TrustTokenBurner
    console.log('\n🔄 Deploying TrustTokenBurner...');
    try {
      const burnerArtifact = JSON.parse(fs.readFileSync(
        path.join(contractsDir, 'TrustTokenBurner.sol/TrustTokenBurner.json'), 
        'utf8'
      ));
      
      const burnerBytecode = burnerArtifact.bytecode;
      
      // Create file for bytecode
      const fileCreateTx = new FileCreateTransaction()
        .setContents(burnerBytecode)
        .setMaxTransactionFee(1000);
      
      const fileCreateResponse = await fileCreateTx.execute(client);
      const fileCreateReceipt = await fileCreateResponse.getReceipt(client);
      const fileId = fileCreateReceipt.fileId;
      
      console.log('📁 Bytecode file created:', fileId.toString());
      
      // Deploy contract
      const contractCreateTx = new ContractCreateTransaction()
        .setBytecodeFileId(fileId)
        .setGas(300000)
        .setConstructorParameters(
          new ContractFunctionParameters()
            .addAddress(trustTokenId) // trustTokenContract
            .addAddress(accountId) // treasuryWallet
        )
        .setMaxTransactionFee(1000);
      
      const contractCreateResponse = await contractCreateTx.execute(client);
      const contractCreateReceipt = await contractCreateResponse.getReceipt(client);
      const burnerContractId = contractCreateReceipt.contractId;
      
      deploymentResults.trustTokenBurner = burnerContractId.toString();
      console.log('✅ TrustTokenBurner deployed to:', burnerContractId.toString());
      
    } catch (error) {
      console.error('❌ Failed to deploy TrustTokenBurner:', error.message);
    }
    
    // Deploy TrustTokenStaking
    console.log('\n🔄 Deploying TrustTokenStaking...');
    try {
      const stakingArtifact = JSON.parse(fs.readFileSync(
        path.join(contractsDir, 'TrustTokenStaking.sol/TrustTokenStaking.json'), 
        'utf8'
      ));
      
      const stakingBytecode = stakingArtifact.bytecode;
      
      // Create file for bytecode
      const fileCreateTx = new FileCreateTransaction()
        .setContents(stakingBytecode)
        .setMaxTransactionFee(1000);
      
      const fileCreateResponse = await fileCreateTx.execute(client);
      const fileCreateReceipt = await fileCreateResponse.getReceipt(client);
      const fileId = fileCreateReceipt.fileId;
      
      console.log('📁 Bytecode file created:', fileId.toString());
      
      // Deploy contract
      const contractCreateTx = new ContractCreateTransaction()
        .setBytecodeFileId(fileId)
        .setGas(400000)
        .setConstructorParameters(
          new ContractFunctionParameters()
            .addAddress(trustTokenId) // trustTokenContract
            .addAddress(accountId) // rewardPool
        )
        .setMaxTransactionFee(1000);
      
      const contractCreateResponse = await contractCreateTx.execute(client);
      const contractCreateReceipt = await contractCreateResponse.getReceipt(client);
      const stakingContractId = contractCreateReceipt.contractId;
      
      deploymentResults.trustTokenStaking = stakingContractId.toString();
      console.log('✅ TrustTokenStaking deployed to:', stakingContractId.toString());
      
    } catch (error) {
      console.error('❌ Failed to deploy TrustTokenStaking:', error.message);
    }
    
    // Save deployment results
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
    
    const deploymentFile = path.join(__dirname, '../contracts/deployments/hscs-contracts-proper.json');
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

deployHscsContractsProper()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
