const {
  Client,
  PrivateKey,
  AccountId,
  ContractCreateFlow,
  ContractFunctionParameters,
  Hbar,
  AccountBalanceQuery
} = require('@hashgraph/sdk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

/**
 * Deploy TrustBridge Marketplace Contract to Hedera Testnet
 */
async function deployMarketplace() {
  let client;
  
  try {
    console.log('\n🚀 Starting TrustBridge Marketplace Deployment...\n');

    // Setup Hedera client
    const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

    client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);
    client.setDefaultMaxTransactionFee(new Hbar(100));

    console.log('✅ Hedera client configured');
    console.log(`   Operator: ${operatorId.toString()}`);
    console.log(`   Network: Testnet\n`);

    // Check balance
    const balance = await new AccountBalanceQuery()
      .setAccountId(operatorId)
      .execute(client);
    console.log('💰 Account balance:', balance.hbars.toString(), 'HBAR\n');

    // Step 1: Compile contract using Hardhat
    console.log('🔨 Compiling marketplace contract with Hardhat...');
    try {
      execSync('npx hardhat compile', { 
        cwd: path.join(__dirname, '../contracts'),
        stdio: 'inherit' 
      });
      console.log('✅ Contract compiled successfully\n');
    } catch (error) {
      console.error('❌ Hardhat compilation failed:', error.message);
      console.log('💡 Make sure hardhat.config.js is properly configured');
      process.exit(1);
    }

    // Step 2: Read compiled artifact
    console.log('📄 Reading compiled contract artifact...');
    const artifactPath = path.join(
      __dirname, 
      '../contracts/artifacts/contracts/TrustBridgeMarketplace.sol/TrustBridgeMarketplace.json'
    );
    
    if (!fs.existsSync(artifactPath)) {
      console.error('❌ Artifact not found at:', artifactPath);
      console.log('💡 Ensure the contract compiled successfully');
      process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const bytecode = artifact.bytecode;
    const abi = artifact.abi;

    console.log('✅ Artifact loaded successfully');
    console.log(`   Bytecode size: ${bytecode.length / 2} bytes\n`);

    // Get constructor parameters
    const trustTokenId = process.env.TRUST_TOKEN_ID || '0.0.6935064';
    const platformTreasury = process.env.HEDERA_ACCOUNT_ID; // Use operator as treasury
    const platformFeeBps = 250; // 2.5% platform fee

    console.log('📋 Constructor Parameters:');
    console.log(`   TRUST Token: ${trustTokenId}`);
    console.log(`   Treasury: ${platformTreasury}`);
    console.log(`   Platform Fee: ${platformFeeBps / 100}%\n`);

    // Convert to Solidity addresses (20 bytes)
    const trustTokenAddress = AccountId.fromString(trustTokenId).toSolidityAddress();
    const treasuryAddress = AccountId.fromString(platformTreasury).toSolidityAddress();

    // Create constructor parameters
    const constructorParams = new ContractFunctionParameters()
      .addAddress(trustTokenAddress)
      .addAddress(treasuryAddress)
      .addUint256(platformFeeBps);

    // Step 3: Deploy contract
    console.log('🚀 Deploying marketplace contract to Hedera...');
    console.log('   This may take a minute...\n');

    const contractCreateFlow = new ContractCreateFlow()
      .setBytecode(bytecode)
      .setGas(2000000) // Increased gas for safety
      .setConstructorParameters(constructorParams);

    const txResponse = await contractCreateFlow.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const marketplaceContractId = receipt.contractId;

    console.log("--------------------------------- Marketplace Deployment ---------------------------------");
    console.log("Consensus status           :", receipt.status.toString());
    console.log("Transaction ID             :", txResponse.transactionId.toString());
    console.log("Hashscan URL               :", `https://hashscan.io/testnet/tx/${txResponse.transactionId.toString()}`);
    console.log("Contract ID                :", marketplaceContractId.toString());
    console.log("----------------------------------------------------------------------------------------\n");

    console.log('✅ Marketplace contract deployed successfully!');
    console.log(`   Contract ID: ${marketplaceContractId.toString()}\n`);

    // Save deployment info
    const deploymentInfo = {
      contractId: marketplaceContractId.toString(),
      trustTokenId: trustTokenId,
      platformTreasury: platformTreasury,
      platformFeeBps: platformFeeBps,
      operatorId: operatorId.toString(),
      network: 'testnet',
      deployedAt: new Date().toISOString(),
      abi: abi
    };

    // Save to JSON file
    const outputPath = path.join(__dirname, '../marketplace-deployment.json');
    fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('💾 Deployment info saved to:', outputPath);

    // Update .env file
    const envPath = path.join(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Add or update marketplace contract ID
    if (envContent.includes('MARKETPLACE_CONTRACT_ID=')) {
      envContent = envContent.replace(
        /MARKETPLACE_CONTRACT_ID=.*/,
        `MARKETPLACE_CONTRACT_ID=${marketplaceContractId.toString()}`
      );
    } else {
      envContent += `\nMARKETPLACE_CONTRACT_ID=${marketplaceContractId.toString()}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env with MARKETPLACE_CONTRACT_ID\n');

    // Display summary
    console.log('📊 Deployment Summary:');
    console.log('   ═══════════════════════════════════════════════');
    console.log(`   Marketplace Contract: ${marketplaceContractId.toString()}`);
    console.log(`   TRUST Token:          ${trustTokenId}`);
    console.log(`   Platform Treasury:    ${platformTreasury}`);
    console.log(`   Platform Fee:         ${platformFeeBps / 100}%`);
    console.log(`   Network:              Testnet`);
    console.log(`   Operator:             ${operatorId.toString()}`);
    console.log('   ═══════════════════════════════════════════════\n');

    console.log('✅ Marketplace deployment complete!');
    console.log('📝 Next steps:');
    console.log('   1. Associate marketplace contract with TRUST token');
    console.log('   2. Update backend services to use marketplace contract');
    console.log('   3. Update frontend to interact with marketplace');
    console.log('   4. Test listing and buying flow\n');

    client.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    console.error(error.stack);
    client.close();
    process.exit(1);
  }
}

// Run deployment
deployMarketplace();

