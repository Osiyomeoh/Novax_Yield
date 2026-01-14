const {
  AccountId,
  PrivateKey,
  Client,
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

    // Pre-configured client for test network (testnet)
    client = Client.forTestnet();

    // Set the operator with the account ID and private key
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    console.log('🧪 Testing HSCS Contracts...');
    console.log('Account ID:', MY_ACCOUNT_ID.toString());

    // Load deployment results
    const deploymentFile = path.join(__dirname, '../contracts/deployments/hscs-complete.json');
    let deploymentData;
    
    try {
      deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
      console.log('📁 Loaded deployment data from:', deploymentFile);
    } catch (error) {
      console.error('❌ Failed to load deployment data:', error.message);
      console.log('Please run the deployment script first.');
      process.exit(1);
    }

    const contracts = deploymentData.contracts;

    // Test TrustTokenExchange
    if (contracts.trustTokenExchange) {
      console.log('\n🔄 Testing TrustTokenExchange...');
      try {
        // Test getExchangeStats function
        const contractCallQuery = new ContractCallQuery()
          .setContractId(contracts.trustTokenExchange)
          .setGas(100000)
          .setFunction("getExchangeStats");

        const contractCallResult = await contractCallQuery.execute(client);
        console.log("✅ TrustTokenExchange getExchangeStats successful");
        console.log("Total HBAR Received:", contractCallResult.getInt256(0).toString());
        console.log("Total TRUST Minted:", contractCallResult.getInt256(1).toString());
        console.log("Total Exchanges:", contractCallResult.getInt256(2).toString());
        console.log("Contract Balance:", contractCallResult.getInt256(3).toString());
        
        // Test calculateTrustAmount function
        const calculateQuery = new ContractCallQuery()
          .setContractId(contracts.trustTokenExchange)
          .setGas(100000)
          .setFunction("calculateTrustAmount", new ContractFunctionParameters()
            .addUint256(1000000000000000000) // 1 HBAR in wei
          );

        const calculateResult = await calculateQuery.execute(client);
        console.log("✅ TrustTokenExchange calculateTrustAmount successful");
        console.log("1 HBAR =", calculateResult.getInt256(0).toString(), "TRUST tokens");
        
      } catch (error) {
        console.log("❌ TrustTokenExchange test failed:", error.message);
      }
    }

    // Test TrustTokenBurner
    if (contracts.trustTokenBurner) {
      console.log('\n🔄 Testing TrustTokenBurner...');
      try {
        // Test calculateNftCreationFee function
        const contractCallQuery = new ContractCallQuery()
          .setContractId(contracts.trustTokenBurner)
          .setGas(100000)
          .setFunction("calculateNftCreationFee", new ContractFunctionParameters()
            .addString("basic")
            .addString("common")
          );

        const contractCallResult = await contractCallQuery.execute(client);
        console.log("✅ TrustTokenBurner calculateNftCreationFee successful");
        console.log("Basic Common NFT Fee:", contractCallResult.getInt256(0).toString(), "TRUST tokens");
        
        // Test premium legendary fee
        const premiumQuery = new ContractCallQuery()
          .setContractId(contracts.trustTokenBurner)
          .setGas(100000)
          .setFunction("calculateNftCreationFee", new ContractFunctionParameters()
            .addString("premium")
            .addString("legendary")
          );

        const premiumResult = await premiumQuery.execute(client);
        console.log("Premium Legendary NFT Fee:", premiumResult.getInt256(0).toString(), "TRUST tokens");
        
      } catch (error) {
        console.log("❌ TrustTokenBurner test failed:", error.message);
      }
    }

    // Test TrustTokenStaking
    if (contracts.trustTokenStaking) {
      console.log('\n🔄 Testing TrustTokenStaking...');
      try {
        // Test getGlobalStats function
        const contractCallQuery = new ContractCallQuery()
          .setContractId(contracts.trustTokenStaking)
          .setGas(100000)
          .setFunction("getGlobalStats");

        const contractCallResult = await contractCallQuery.execute(client);
        console.log("✅ TrustTokenStaking getGlobalStats successful");
        console.log("Total Staked:", contractCallResult.getInt256(0).toString());
        console.log("Total Rewards:", contractCallResult.getInt256(1).toString());
        console.log("Total Stakers:", contractCallResult.getInt256(2).toString());
        
      } catch (error) {
        console.log("❌ TrustTokenStaking test failed:", error.message);
      }
    }

    // Test contract execution (if contracts support it)
    console.log('\n🔄 Testing contract execution...');
    
    if (contracts.trustTokenExchange) {
      try {
        // Test a simple function call
        const txContractExecute = new ContractExecuteTransaction()
          .setContractId(contracts.trustTokenExchange)
          .setGas(100000)
          .setFunction("getExchangeInfo");

        const txContractExecuteResponse = await txContractExecute.execute(client);
        const receiptContractExecuteTx = await txContractExecuteResponse.getReceipt(client);
        
        console.log("✅ Contract execution test successful");
        console.log("Transaction ID:", txContractExecuteResponse.transactionId.toString());
        console.log("Hashscan URL:", "https://hashscan.io/testnet/tx/" + txContractExecuteResponse.transactionId.toString());
        
      } catch (error) {
        console.log("⚠️ Contract execution test failed:", error.message);
      }
    }

    console.log('\n🎉 HSCS Contract Testing Complete!');
    console.log('\n📊 Test Summary:');
    console.log('┌─────────────────────────┬──────────────────────────────────────────┐');
    console.log('│ Contract                │ Status                                   │');
    console.log('├─────────────────────────┼──────────────────────────────────────────┤');
    console.log(`│ TrustTokenExchange      │ ${contracts.trustTokenExchange ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'}`);
    console.log(`│ TrustTokenBurner        │ ${contracts.trustTokenBurner ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'}`);
    console.log(`│ TrustTokenStaking       │ ${contracts.trustTokenStaking ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'}`);
    console.log('└─────────────────────────┴──────────────────────────────────────────┘');
    
    console.log('\n🔗 Contract Explorer Links:');
    if (contracts.trustTokenExchange) {
      console.log(`TrustTokenExchange: https://hashscan.io/testnet/contract/${contracts.trustTokenExchange}`);
    }
    if (contracts.trustTokenBurner) {
      console.log(`TrustTokenBurner: https://hashscan.io/testnet/contract/${contracts.trustTokenBurner}`);
    }
    if (contracts.trustTokenStaking) {
      console.log(`TrustTokenStaking: https://hashscan.io/testnet/contract/${contracts.trustTokenStaking}`);
    }
      
  } catch (error) {
    console.error('❌ Testing failed:', error);
  } finally {
    if (client) client.close();
  }
}

main();
