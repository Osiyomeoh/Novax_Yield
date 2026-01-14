const {
  Client,
  AccountId,
  PrivateKey,
  ContractCreateFlow,
  ContractFunctionParameters,
  Hbar,
  ContractExecuteTransaction,
  ContractCallQuery,
} = require('@hashgraph/sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load compiled contract
const compiledContractPath = path.join(__dirname, '../contracts/artifacts/contracts/TRUSTMarketplaceV2.sol/TRUSTMarketplaceV2.json');

async function deployMarketplaceV2() {
  console.log('🚀 Starting TRUSTMarketplaceV2 Deployment...\n');

  // Initialize Hedera client
  const accountId = process.env.HEDERA_ACCOUNT_ID || process.env.OPERATOR_ACCOUNT_ID;
  const privateKeyStr = process.env.HEDERA_PRIVATE_KEY || process.env.OPERATOR_PRIVATE_KEY;
  
  const client = Client.forTestnet();
  const operatorId = AccountId.fromString(accountId);
  
  // Try ECDSA first, fallback to regular parsing
  let operatorKey;
  try {
    operatorKey = PrivateKey.fromStringECDSA(privateKeyStr);
    console.log('✅ Using ECDSA key format');
  } catch (ecdsaError) {
    console.log('⚠️ ECDSA parsing failed, trying regular format');
    operatorKey = PrivateKey.fromString(privateKeyStr);
    console.log('✅ Using regular key format');
  }
  
  client.setOperator(operatorId, operatorKey);
  client.setDefaultMaxTransactionFee(new Hbar(100));

  console.log('✅ Hedera Client Initialized');
  console.log('📋 Operator Account:', operatorId.toString());

  try {
    // Load contract bytecode
    let contractJson;
    try {
      contractJson = JSON.parse(fs.readFileSync(compiledContractPath, 'utf8'));
    } catch (error) {
      console.error('❌ Contract bytecode not found. Please compile first:');
      console.error('   cd contracts && npx hardhat compile');
      process.exit(1);
    }

    const bytecode = contractJson.bytecode;
    console.log('✅ Contract Bytecode Loaded');
    console.log('📏 Bytecode Size:', (bytecode.length / 2).toLocaleString(), 'bytes\n');

    // Get TRUST token ID
    const trustTokenId = process.env.TRUST_TOKEN_ID || '0.0.6935064';
    console.log('💰 TRUST Token ID:', trustTokenId);

    // Fee recipient (platform wallet)
    const feeRecipient = process.env.PLATFORM_FEE_ACCOUNT || operatorId.toString();
    console.log('💵 Fee Recipient:', feeRecipient);

    // Check balance
    const { AccountBalanceQuery } = require('@hashgraph/sdk');
    const balance = await new AccountBalanceQuery()
      .setAccountId(operatorId)
      .execute(client);
    
    console.log('💰 Account balance:', balance.hbars.toString(), 'HBAR');

    // Deploy contract using proper Hedera method
    console.log('\n🔨 Deploying TRUSTMarketplaceV2...');
    
    // Step 1: Create file for bytecode with chunking
    const { FileCreateTransaction, FileAppendTransaction, ContractCreateTransaction } = require('@hashgraph/sdk');
    const fileCreateTx = new FileCreateTransaction()
      .setContents(bytecode.substring(0, 4096)) // First chunk
      .setKeys([operatorKey.publicKey])          // IMPORTANT: Set keys for file
      .setMaxTransactionFee(new Hbar(5));
    
    const fileCreateResponse = await fileCreateTx.execute(client);
    const fileCreateReceipt = await fileCreateResponse.getReceipt(client);
    const bytecodeFileId = fileCreateReceipt.fileId;
    
    console.log('📁 Bytecode file created:', bytecodeFileId.toString());
    
    // Step 2: Append remaining bytecode if necessary
    if (bytecode.length > 4096) {
      console.log('📎 Appending remaining bytecode...');
      
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
    
    // Step 3: Prepare constructor parameters (convert to Solidity addresses)
    const trustTokenAddress = AccountId.fromString(trustTokenId).toSolidityAddress();
    const feeRecipientAddress = operatorId.toSolidityAddress();
    
    console.log('\n📋 Constructor Parameters:');
    console.log('   TRUST Token:', trustTokenId, '→', trustTokenAddress);
    console.log('   Fee Recipient:', feeRecipient, '→', feeRecipientAddress);
    
    // Step 4: Deploy contract
    const contractCreateTx = new ContractCreateTransaction()
      .setBytecodeFileId(bytecodeFileId)
      .setGas(4000000) // Increased gas for contract with royalties
      .setConstructorParameters(
        new ContractFunctionParameters()
          .addAddress(trustTokenAddress)      // TRUST token contract
          .addAddress(feeRecipientAddress)    // Fee recipient
      )
      .setMaxTransactionFee(new Hbar(50));

    const contractCreateSubmit = await contractCreateTx.execute(client);
    const contractCreateRx = await contractCreateSubmit.getReceipt(client);
    const contractId = contractCreateRx.contractId;

    console.log('✅ Contract Deployed Successfully!');
    console.log('📝 Contract ID:', contractId.toString());
    console.log('🔗 View on HashScan:', `https://hashscan.io/testnet/contract/${contractId}`);

    // Query contract info
    console.log('\n🔍 Querying Contract Info...');
    
    // Get trading fee
    const tradingFeeQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction('tradingFee');
    
    const tradingFeeResult = await tradingFeeQuery.execute(client);
    const tradingFee = tradingFeeResult.getUint256(0);
    console.log('💵 Trading Fee:', tradingFee.toString(), 'basis points (', tradingFee / 100, '%)');

    // Get max royalty
    const maxRoyaltyQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction('maxRoyaltyPercentage');
    
    const maxRoyaltyResult = await maxRoyaltyQuery.execute(client);
    const maxRoyalty = maxRoyaltyResult.getUint256(0);
    console.log('👑 Max Royalty:', maxRoyalty.toString(), 'basis points (', maxRoyalty / 100, '%)');

    // Save deployment info
    const deploymentInfo = {
      network: 'testnet',
      contractId: contractId.toString(),
      trustTokenId: trustTokenId,
      feeRecipient: feeRecipient,
      tradingFee: tradingFee.toString(),
      maxRoyalty: maxRoyalty.toString(),
      deployedAt: new Date().toISOString(),
      deployedBy: operatorId.toString(),
      txHash: contractCreateSubmit.transactionId.toString(),
    };

    const deploymentPath = path.join(__dirname, '../contracts/deployments/marketplace-v2.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('\n💾 Deployment info saved to:', deploymentPath);

    // Update frontend config
    const frontendConfigPath = path.join(__dirname, '../../trustbridge-frontend/src/config/contracts.ts');
    console.log('\n📝 Update your frontend config at:', frontendConfigPath);
    console.log('   Add: TRUST_MARKETPLACE_V2: "' + contractId.toString() + '"');

    console.log('\n🎉 Deployment Complete!\n');
    console.log('📋 Summary:');
    console.log('   Contract ID:', contractId.toString());
    console.log('   Trading Fee:', tradingFee / 100, '%');
    console.log('   Max Royalty:', maxRoyalty / 100, '%');
    console.log('   HashScan:', `https://hashscan.io/testnet/contract/${contractId}`);

    return {
      contractId: contractId.toString(),
      trustTokenId,
      feeRecipient,
    };

  } catch (error) {
    console.error('\n❌ Deployment Failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.close();
  }
}

// Run deployment
deployMarketplaceV2()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

