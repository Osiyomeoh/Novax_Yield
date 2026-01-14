const {
  AccountId,
  PrivateKey,
  Client,
  ContractCreateFlow,
  ContractFunctionParameters
} = require("@hashgraph/sdk");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  let client;
  try {
    // Your account ID and private key from environment variables
    const MY_ACCOUNT_ID = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);
    const TRUST_TOKEN_ID = process.env.TRUST_TOKEN_ID || "0.0.6934709";

    // Pre-configured client for test network (testnet)
    client = Client.forTestnet();

    // Set the operator with the account ID and private key
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    console.log('🚀 Deploying HSCS Contracts...');
    console.log('Account ID:', MY_ACCOUNT_ID.toString());
    console.log('Trust Token ID:', TRUST_TOKEN_ID);

    // Check balance
    const balance = await new (require('@hashgraph/sdk').AccountBalanceQuery)()
      .setAccountId(MY_ACCOUNT_ID)
      .execute(client);
    console.log('💰 Account balance:', balance.hbars.toString(), 'HBAR');

    const deploymentResults = {};

    // Deploy TrustTokenExchange
    console.log('\n🔄 Deploying TrustTokenExchange...');
    try {
      const exchangeArtifact = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/TrustTokenExchange.sol/TrustTokenExchange.json'), 
        'utf8'
      ));
      
      const bytecode = exchangeArtifact.bytecode;
      
      // Create the transaction
      const contractCreateFlow = new ContractCreateFlow()
        .setGas(1000000)
        .setBytecode(bytecode)
        .setConstructorParameters(
          new ContractFunctionParameters()
            .addAddress(MY_ACCOUNT_ID.toString()) // treasuryWallet
            .addAddress(MY_ACCOUNT_ID.toString()) // operationsWallet  
            .addAddress(MY_ACCOUNT_ID.toString()) // stakingPool
            .addAddress(TRUST_TOKEN_ID) // trustTokenContract
        );

      // Sign the transaction with the client operator key and submit to a Hedera network
      const txContractCreateFlowResponse = await contractCreateFlow.execute(client);

      // Get the receipt of the transaction
      const receiptContractCreateFlow = await txContractCreateFlowResponse.getReceipt(client);

      // Get the status of the transaction
      const statusContractCreateFlow = receiptContractCreateFlow.status;

      // Get the Transaction ID
      const txContractCreateId = txContractCreateFlowResponse.transactionId.toString();

      // Get the new contract ID
      const contractId = receiptContractCreateFlow.contractId;
        
      console.log("--------------------------------- Create Contract Flow ---------------------------------");
      console.log("Consensus status           :", statusContractCreateFlow.toString());
      console.log("Transaction ID             :", txContractCreateId);
      console.log("Hashscan URL               :", "https://hashscan.io/testnet/tx/" + txContractCreateId);  
      console.log("Contract ID                :", contractId);
      
      deploymentResults.trustTokenExchange = contractId.toString();
      
    } catch (error) {
      console.error('❌ Failed to deploy TrustTokenExchange:', error.message);
    }

    // Deploy TrustTokenBurner
    console.log('\n🔄 Deploying TrustTokenBurner...');
    try {
      const burnerArtifact = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/TrustTokenBurner.sol/TrustTokenBurner.json'), 
        'utf8'
      ));
      
      const bytecode = burnerArtifact.bytecode;
      
      // Create the transaction
      const contractCreateFlow = new ContractCreateFlow()
        .setGas(800000)
        .setBytecode(bytecode)
        .setConstructorParameters(
          new ContractFunctionParameters()
            .addAddress(TRUST_TOKEN_ID) // trustTokenContract
            .addAddress(MY_ACCOUNT_ID.toString()) // treasuryWallet
        );

      // Sign the transaction with the client operator key and submit to a Hedera network
      const txContractCreateFlowResponse = await contractCreateFlow.execute(client);

      // Get the receipt of the transaction
      const receiptContractCreateFlow = await txContractCreateFlowResponse.getReceipt(client);

      // Get the status of the transaction
      const statusContractCreateFlow = receiptContractCreateFlow.status;

      // Get the Transaction ID
      const txContractCreateId = txContractCreateFlowResponse.transactionId.toString();

      // Get the new contract ID
      const contractId = receiptContractCreateFlow.contractId;
        
      console.log("--------------------------------- Create Contract Flow ---------------------------------");
      console.log("Consensus status           :", statusContractCreateFlow.toString());
      console.log("Transaction ID             :", txContractCreateId);
      console.log("Hashscan URL               :", "https://hashscan.io/testnet/tx/" + txContractCreateId);  
      console.log("Contract ID                :", contractId);
      
      deploymentResults.trustTokenBurner = contractId.toString();
      
    } catch (error) {
      console.error('❌ Failed to deploy TrustTokenBurner:', error.message);
    }

    // Deploy TrustTokenStaking
    console.log('\n🔄 Deploying TrustTokenStaking...');
    try {
      const stakingArtifact = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/TrustTokenStaking.sol/TrustTokenStaking.json'), 
        'utf8'
      ));
      
      const bytecode = stakingArtifact.bytecode;
      
      // Create the transaction
      const contractCreateFlow = new ContractCreateFlow()
        .setGas(900000)
        .setBytecode(bytecode)
        .setConstructorParameters(
          new ContractFunctionParameters()
            .addAddress(TRUST_TOKEN_ID) // trustTokenContract
            .addAddress(MY_ACCOUNT_ID.toString()) // rewardPool
        );

      // Sign the transaction with the client operator key and submit to a Hedera network
      const txContractCreateFlowResponse = await contractCreateFlow.execute(client);

      // Get the receipt of the transaction
      const receiptContractCreateFlow = await txContractCreateFlowResponse.getReceipt(client);

      // Get the status of the transaction
      const statusContractCreateFlow = receiptContractCreateFlow.status;

      // Get the Transaction ID
      const txContractCreateId = txContractCreateFlowResponse.transactionId.toString();

      // Get the new contract ID
      const contractId = receiptContractCreateFlow.contractId;
        
      console.log("--------------------------------- Create Contract Flow ---------------------------------");
      console.log("Consensus status           :", statusContractCreateFlow.toString());
      console.log("Transaction ID             :", txContractCreateId);
      console.log("Hashscan URL               :", "https://hashscan.io/testnet/tx/" + txContractCreateId);  
      console.log("Contract ID                :", contractId);
      
      deploymentResults.trustTokenStaking = contractId.toString();
      
    } catch (error) {
      console.error('❌ Failed to deploy TrustTokenStaking:', error.message);
    }

    // Save deployment results
    const deploymentData = {
      network: "hedera_testnet",
      chainId: 296,
      timestamp: new Date().toISOString(),
      deployer: MY_ACCOUNT_ID.toString(),
      contracts: deploymentResults,
      configuration: {
        treasuryWallet: MY_ACCOUNT_ID.toString(),
        operationsWallet: MY_ACCOUNT_ID.toString(),
        stakingPool: MY_ACCOUNT_ID.toString(),
        trustTokenContract: TRUST_TOKEN_ID
      }
    };
    
    const deploymentFile = path.join(__dirname, '../contracts/deployments/hscs-simple.json');
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log('\n💾 Deployment data saved to:', deploymentFile);
    
    // Generate environment variables
    const envVars = `
# HSCS Contract Addresses (Generated on ${new Date().toISOString()})
TRUST_TOKEN_EXCHANGE_CONTRACT_ID=${deploymentResults.trustTokenExchange || 'NOT_DEPLOYED'}
TRUST_TOKEN_BURNER_CONTRACT_ID=${deploymentResults.trustTokenBurner || 'NOT_DEPLOYED'}
TRUST_TOKEN_STAKING_CONTRACT_ID=${deploymentResults.trustTokenStaking || 'NOT_DEPLOYED'}

# Account Addresses for Distribution
TREASURY_ACCOUNT_ID=${MY_ACCOUNT_ID.toString()}
OPERATIONS_ACCOUNT_ID=${MY_ACCOUNT_ID.toString()}
STAKING_ACCOUNT_ID=${MY_ACCOUNT_ID.toString()}
TRUST_TOKEN_ID=${TRUST_TOKEN_ID}
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
      
  } catch (error) {
    console.error('❌ Deployment failed:', error);
  } finally {
    if (client) client.close();
  }
}

main();
