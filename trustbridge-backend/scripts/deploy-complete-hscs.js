const {
  AccountId,
  PrivateKey,
  Client,
  ContractCreateFlow,
  ContractUpdateTransaction,
  Hbar,
  ContractDeleteTransaction,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractCallQuery
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

    console.log('🚀 Deploying Complete HSCS Contract Suite...');
    console.log('Account ID:', MY_ACCOUNT_ID.toString());
    console.log('Trust Token ID:', TRUST_TOKEN_ID);

    // Check balance
    const balance = await new (require('@hashgraph/sdk').AccountBalanceQuery)()
      .setAccountId(MY_ACCOUNT_ID)
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
      
      const bytecode = exchangeArtifact.bytecode;
      
      // Create the transaction
      const contractCreateFlow = new ContractCreateFlow()
        .setGas(2000000)
        .setBytecode(bytecode)
        .setConstructorParameters(
          new ContractFunctionParameters()
            .addAddress(MY_ACCOUNT_ID.toSolidityAddress()) // treasuryWallet
            .addAddress(MY_ACCOUNT_ID.toSolidityAddress()) // operationsWallet  
            .addAddress(MY_ACCOUNT_ID.toSolidityAddress()) // stakingPool
            .addAddress(AccountId.fromString(TRUST_TOKEN_ID).toSolidityAddress()) // trustTokenContract
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
      
      // Test the deployed contract
      console.log('\n🧪 Testing TrustTokenExchange...');
      try {
        const contractCallQuery = new ContractCallQuery()
          .setContractId(contractId)
          .setGas(100000)
          .setFunction("getExchangeStats");

        const contractCallResult = await contractCallQuery.execute(client);
        console.log("✅ TrustTokenExchange test successful");
        console.log("Total HBAR Received:", contractCallResult.getInt256(0).toString());
        console.log("Total TRUST Minted:", contractCallResult.getInt256(1).toString());
        console.log("Total Exchanges:", contractCallResult.getInt256(2).toString());
        console.log("Contract Balance:", contractCallResult.getInt256(3).toString());
      } catch (error) {
        console.log("⚠️ TrustTokenExchange test failed:", error.message);
      }
      
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
      
      const bytecode = burnerArtifact.bytecode;
      
      // Create the transaction
      const contractCreateFlow = new ContractCreateFlow()
        .setGas(1500000)
        .setBytecode(bytecode)
        .setConstructorParameters(
          new ContractFunctionParameters()
            .addAddress(AccountId.fromString(TRUST_TOKEN_ID).toSolidityAddress()) // trustTokenContract
            .addAddress(MY_ACCOUNT_ID.toSolidityAddress()) // treasuryWallet
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
      
      // Test the deployed contract
      console.log('\n🧪 Testing TrustTokenBurner...');
      try {
        const contractCallQuery = new ContractCallQuery()
          .setContractId(contractId)
          .setGas(100000)
          .setFunction("calculateNftCreationFee", new ContractFunctionParameters()
            .addString("basic")
            .addString("common")
          );

        const contractCallResult = await contractCallQuery.execute(client);
        console.log("✅ TrustTokenBurner test successful");
        console.log("NFT Creation Fee:", contractCallResult.getInt256(0).toString());
      } catch (error) {
        console.log("⚠️ TrustTokenBurner test failed:", error.message);
      }
      
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
      
      const bytecode = stakingArtifact.bytecode;
      
      // Create the transaction
      const contractCreateFlow = new ContractCreateFlow()
        .setGas(1800000)
        .setBytecode(bytecode)
        .setConstructorParameters(
          new ContractFunctionParameters()
            .addAddress(AccountId.fromString(TRUST_TOKEN_ID).toSolidityAddress()) // trustTokenContract
            .addAddress(MY_ACCOUNT_ID.toSolidityAddress()) // rewardPool
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
      
      // Test the deployed contract
      console.log('\n🧪 Testing TrustTokenStaking...');
      try {
        const contractCallQuery = new ContractCallQuery()
          .setContractId(contractId)
          .setGas(100000)
          .setFunction("getGlobalStats");

        const contractCallResult = await contractCallQuery.execute(client);
        console.log("✅ TrustTokenStaking test successful");
        console.log("Global Stats:", contractCallResult);
      } catch (error) {
        console.log("⚠️ TrustTokenStaking test failed:", error.message);
      }
      
    } catch (error) {
      console.error('❌ Failed to deploy TrustTokenStaking:', error.message);
    }

    // Step 5: Test contract interactions
    console.log('\n🔄 Testing contract interactions...');
    
    if (deploymentResults.trustTokenExchange) {
      try {
        // Test exchange functionality
        const txContractExecute = new ContractExecuteTransaction()
          .setContractId(deploymentResults.trustTokenExchange)
          .setGas(100000)
          .setFunction("calculateTrustAmount", new ContractFunctionParameters()
            .addUint256(1000000000000000000) // 1 HBAR in wei
          );

        const txContractExecuteResponse = await txContractExecute.execute(client);
        const receiptContractExecuteTx = await txContractExecuteResponse.getReceipt(client);
        
        console.log("✅ TrustTokenExchange interaction test successful");
        console.log("Transaction ID:", txContractExecuteResponse.transactionId.toString());
      } catch (error) {
        console.log("⚠️ TrustTokenExchange interaction test failed:", error.message);
      }
    }

    // Step 6: Save deployment results
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
    
    const deploymentFile = path.join(__dirname, '../contracts/deployments/hscs-complete.json');
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
    
    console.log('\n🎉 Complete HSCS Contract Deployment Finished!');
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
    
    // Step 7: Query deployed contracts from Mirror Node
    console.log('\n🔍 Querying deployed contracts from Mirror Node...');
    try {
      const getContractsParams = {
        limit: 10,
        order: "desc"
      };
      
      const getContractsResponse = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/contracts?limit=${getContractsParams.limit}&order=${getContractsParams.order}`
      );

      if (getContractsResponse.ok) {
        const getContractsData = await getContractsResponse.json();
        console.log("------------------------------ Get Contracts ------------------------------ ");
        console.log("Response status         :", getContractsResponse.status);
        console.log("Total contracts found   :", getContractsData.contracts?.length || 0);
        
        // Find our deployed contracts
        const ourContracts = getContractsData.contracts?.filter(contract => 
          Object.values(deploymentResults).includes(contract.contract_id)
        ) || [];
        
        if (ourContracts.length > 0) {
          console.log("Our deployed contracts:");
          ourContracts.forEach(contract => {
            console.log(`- ${contract.contract_id} (${contract.file_id})`);
          });
        }
      }
    } catch (error) {
      console.log("⚠️ Mirror Node query failed:", error.message);
    }
      
  } catch (error) {
    console.error('❌ Deployment failed:', error);
  } finally {
    if (client) client.close();
  }
}

main();
