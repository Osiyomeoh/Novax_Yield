const { 
  Client, 
  AccountId, 
  PrivateKey, 
  ContractCreateTransaction,
  ContractFunctionParameters,
  Hbar,
  FileCreateTransaction,
  FileAppendTransaction,
  AccountBalanceQuery
} = require('@hashgraph/sdk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

async function deployMarketplace() {
  console.log('🚀 Starting TrustBridge Marketplace Deployment...\n');
  
  // Get configuration from environment
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';
  const trustTokenId = process.env.TRUST_TOKEN_ID || '0.0.6935064';
  
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
    const balance = await new AccountBalanceQuery()
      .setAccountId(operatorId)
      .execute(client);
    
    console.log('💰 Account balance:', balance.hbars.toString(), 'HBAR');
    
    if (balance.hbars.toTinybars() < 1000000000) { // Less than 10 HBAR
      console.warn('⚠️ Low account balance. Consider adding more HBAR for deployment.');
    }
    
    // Step 1: Compile contracts using Hardhat
    console.log('\n🔄 Compiling marketplace contract...');
    try {
      execSync('npx hardhat compile', { 
        cwd: path.join(__dirname, '../contracts'),
        stdio: 'inherit' 
      });
      console.log('✅ Contract compiled successfully');
    } catch (error) {
      console.error('❌ Contract compilation failed:', error.message);
      process.exit(1);
    }
    
    // Step 2: Read compiled bytecode
    console.log('\n📄 Reading compiled marketplace artifact...');
    const artifactPath = path.join(
      __dirname,
      '../contracts/artifacts/contracts/TrustBridgeMarketplace.sol/TrustBridgeMarketplace.json'
    );
    
    if (!fs.existsSync(artifactPath)) {
      console.error('❌ Artifact not found. Please ensure TrustBridgeMarketplace.sol is in contracts/contracts/ directory');
      process.exit(1);
    }
    
    const marketplaceArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const bytecode = marketplaceArtifact.bytecode;
    const abi = marketplaceArtifact.abi;
    
    console.log('✅ Artifact loaded');
    console.log('   Bytecode size:', (bytecode.length / 2), 'bytes');
    
    // Step 3: Create file for bytecode storage
    console.log('\n🔄 Creating file for bytecode...');
    
    const fileCreateTx = new FileCreateTransaction()
      .setContents(bytecode.substring(0, 4096)) // First chunk
      .setKeys([operatorKey.publicKey])
      .setMaxTransactionFee(new Hbar(5));
    
    const fileCreateResponse = await fileCreateTx.execute(client);
    const fileCreateReceipt = await fileCreateResponse.getReceipt(client);
    const bytecodeFileId = fileCreateReceipt.fileId;
    
    console.log('✅ Bytecode file created:', bytecodeFileId.toString());
    
    // Step 4: Append remaining bytecode if necessary
    if (bytecode.length > 4096) {
      console.log('🔄 Appending remaining bytecode...');
      
      for (let i = 4096; i < bytecode.length; i += 4096) {
        const chunk = bytecode.substring(i, Math.min(i + 4096, bytecode.length));
        
        const fileAppendTx = new FileAppendTransaction()
          .setFileId(bytecodeFileId)
          .setContents(chunk)
          .setMaxTransactionFee(new Hbar(5));
        
        await fileAppendTx.execute(client);
      }
      
      console.log('✅ All bytecode appended');
    }
    
    // Step 5: Prepare constructor parameters
    const platformFeeBps = 250; // 2.5% platform fee
    const trustTokenAddress = AccountId.fromString(trustTokenId).toSolidityAddress();
    const treasuryAddress = operatorId.toSolidityAddress();
    
    console.log('\n📋 Constructor Parameters:');
    console.log('   TRUST Token:', trustTokenId);
    console.log('   Treasury:', accountId);
    console.log('   Platform Fee:', platformFeeBps / 100, '%');
    
    const constructorParams = new ContractFunctionParameters()
      .addAddress(trustTokenAddress)
      .addAddress(treasuryAddress)
      .addUint256(platformFeeBps);
    
    // Step 6: Deploy contract
    console.log('\n🚀 Deploying marketplace contract...');
    
    const contractCreateTx = new ContractCreateTransaction()
      .setBytecodeFileId(bytecodeFileId)
      .setGas(1000000)
      .setConstructorParameters(constructorParams)
      .setMaxTransactionFee(new Hbar(20));
    
    const contractCreateResponse = await contractCreateTx.execute(client);
    const contractCreateReceipt = await contractCreateResponse.getReceipt(client);
    const marketplaceContractId = contractCreateReceipt.contractId;
    
    console.log('\n✅ Marketplace Contract Deployed Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Contract ID:', marketplaceContractId.toString());
    console.log('Bytecode File ID:', bytecodeFileId.toString());
    console.log('Transaction ID:', contractCreateResponse.transactionId.toString());
    console.log('Hashscan:', `https://hashscan.io/${network}/contract/${marketplaceContractId.toString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Step 7: Save deployment info
    const deploymentInfo = {
      marketplaceContractId: marketplaceContractId.toString(),
      bytecodeFileId: bytecodeFileId.toString(),
      trustTokenId: trustTokenId,
      platformTreasury: accountId,
      platformFeeBps: platformFeeBps,
      operatorId: accountId,
      network: network,
      deployedAt: new Date().toISOString(),
      transactionId: contractCreateResponse.transactionId.toString(),
      abi: abi
    };
    
    // Save to JSON
    const outputPath = path.join(__dirname, '../marketplace-deployment.json');
    fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('\n💾 Deployment info saved to:', outputPath);
    
    // Update .env
    const envPath = path.join(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('MARKETPLACE_CONTRACT_ID=')) {
      envContent = envContent.replace(
        /MARKETPLACE_CONTRACT_ID=.*/,
        `MARKETPLACE_CONTRACT_ID=${marketplaceContractId.toString()}`
      );
    } else {
      envContent += `\nMARKETPLACE_CONTRACT_ID=${marketplaceContractId.toString()}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env with MARKETPLACE_CONTRACT_ID');
    
    // Summary
    console.log('\n📊 Deployment Summary:');
    console.log('═══════════════════════════════════════════════════');
    console.log('Marketplace Contract:', marketplaceContractId.toString());
    console.log('TRUST Token:         ', trustTokenId);
    console.log('Platform Treasury:   ', accountId);
    console.log('Platform Fee:        ', platformFeeBps / 100, '%');
    console.log('Network:             ', network);
    console.log('═══════════════════════════════════════════════════');
    
    console.log('\n✅ Marketplace deployment complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Create backend marketplace service');
    console.log('   2. Update frontend to use marketplace contract');
    console.log('   3. Test listing and buying flow\n');
    
    client.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run deployment
deployMarketplace();

