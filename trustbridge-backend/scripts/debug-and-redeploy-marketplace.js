/**
 * Debug and Redeploy TRUSTMarketplaceV2
 * This script will diagnose issues and redeploy if needed
 */

require('dotenv').config();
const {
  Client,
  AccountId,
  PrivateKey,
  ContractCreateTransaction,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  ContractId,
  FileCreateTransaction,
  FileAppendTransaction,
  Hbar,
} = require('@hashgraph/sdk');
const fs = require('fs');
const path = require('path');

const EXISTING_CONTRACT_ID = '0.0.7053859';
const TRUST_TOKEN_ID = '0.0.6935064';

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     TRUSTMarketplaceV2 - Debug & Redeploy Script           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Setup
  const accountId = process.env.HEDERA_ACCOUNT_ID || process.env.MY_ACCOUNT_ID;
  const privateKeyStr = process.env.HEDERA_PRIVATE_KEY || process.env.MY_PRIVATE_KEY;

  if (!accountId || !privateKeyStr) {
    throw new Error('Missing HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY in .env');
  }

  const client = Client.forTestnet();
  const operatorId = AccountId.fromString(accountId);
  
  let operatorKey;
  try {
    operatorKey = PrivateKey.fromStringECDSA(privateKeyStr);
  } catch (e) {
    operatorKey = PrivateKey.fromString(privateKeyStr);
  }
  
  client.setOperator(operatorId, operatorKey);

  console.log('🔧 Operator Account:', accountId);
  console.log('📋 Existing Contract:', EXISTING_CONTRACT_ID);
  console.log('');

  // Step 1: Test existing contract
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: Test Existing Contract');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let contractWorking = false;
  try {
    const pausedQuery = new ContractCallQuery()
      .setContractId(ContractId.fromString(EXISTING_CONTRACT_ID))
      .setGas(100000)
      .setFunction('paused');
    
    const result = await pausedQuery.execute(client);
    const isPaused = result.getBool(0);
    
    console.log(`✅ Contract responds to paused(): ${isPaused}`);
    contractWorking = true;
  } catch (error) {
    console.error(`❌ Contract query failed: ${error.message}`);
    console.log('   Contract is in invalid state\n');
  }

  if (contractWorking) {
    console.log('\n✅ Contract is working! No need to redeploy.\n');
    console.log('The issue might be in the frontend integration.');
    console.log('Check:');
    console.log('  1. Contract ID in frontend matches:', EXISTING_CONTRACT_ID);
    console.log('  2. ABI file is correct');
    console.log('  3. Function signatures match');
    console.log('');
    client.close();
    return;
  }

  // Step 2: Check if we have the contract source
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: Locate Contract Bytecode');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const possiblePaths = [
    'contracts/artifacts/TRUSTMarketplaceV2.json',
    'contracts/build/TRUSTMarketplaceV2.json',
    'contracts/deployments/marketplace-v2.json',
    '../trustbridge-frontend/src/contracts/TRUSTMarketplaceV2.json'
  ];

  let contractJson = null;
  let contractPath = null;

  for (const p of possiblePaths) {
    const fullPath = path.join(__dirname, '..', p);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ Found contract at: ${p}`);
      contractJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      contractPath = fullPath;
      break;
    }
  }

  if (!contractJson) {
    console.error('❌ Contract bytecode not found!');
    console.log('\nSearched in:');
    possiblePaths.forEach(p => console.log(`  - ${p}`));
    console.log('\nPlease compile the contract first or provide the bytecode.');
    client.close();
    return;
  }

  // Extract bytecode
  let bytecode = contractJson.bytecode || contractJson.data?.bytecode?.object;
  if (!bytecode) {
    console.error('❌ Bytecode not found in JSON file');
    client.close();
    return;
  }

  if (bytecode.startsWith('0x')) {
    bytecode = bytecode.substring(2);
  }

  console.log(`   Bytecode size: ${bytecode.length / 2} bytes`);
  console.log('');

  // Step 3: Deploy new contract
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: Deploy New Contract');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📄 Creating bytecode file...');
  
  // Create file with bytecode (chunked for large contracts)
  const fileCreateTx = new FileCreateTransaction()
    .setContents(bytecode.substring(0, 4096))
    .setKeys([operatorKey.publicKey])
    .setMaxTransactionFee(new Hbar(5));

  const fileCreateSubmit = await fileCreateTx.execute(client);
  const fileCreateReceipt = await fileCreateSubmit.getReceipt(client);
  const bytecodeFileId = fileCreateReceipt.fileId;

  console.log(`✅ Bytecode file created: ${bytecodeFileId.toString()}`);

  // Append remaining bytecode if needed
  if (bytecode.length > 4096) {
    console.log('📄 Appending remaining bytecode...');
    for (let i = 4096; i < bytecode.length; i += 4096) {
      const chunk = bytecode.substring(i, Math.min(i + 4096, bytecode.length));
      const fileAppendTx = new FileAppendTransaction()
        .setFileId(bytecodeFileId)
        .setContents(chunk)
        .setMaxTransactionFee(new Hbar(5));
      
      await fileAppendTx.execute(client);
    }
    console.log('✅ All bytecode chunks appended');
  }

  // Prepare constructor parameters
  console.log('\n🔧 Preparing constructor parameters...');
  
  // Convert TRUST token ID to Solidity address
  const trustTokenAddress = AccountId.fromString(TRUST_TOKEN_ID).toSolidityAddress();
  const feeRecipientAddress = operatorId.toSolidityAddress();

  console.log('   TRUST Token ID:', TRUST_TOKEN_ID);
  console.log('   TRUST Token Address:', trustTokenAddress);
  console.log('   Fee Recipient:', accountId);
  console.log('   Fee Recipient Address:', feeRecipientAddress);

  // Deploy contract
  console.log('\n🚀 Deploying contract...');
  
  const contractCreateTx = new ContractCreateTransaction()
    .setBytecodeFileId(bytecodeFileId)
    .setGas(4000000) // High gas limit for complex contract
    .setConstructorParameters(
      new ContractFunctionParameters()
        .addAddress(trustTokenAddress)
        .addAddress(feeRecipientAddress)
    )
    .setMaxTransactionFee(new Hbar(50));

  const contractCreateSubmit = await contractCreateTx.execute(client);
  const contractCreateReceipt = await contractCreateSubmit.getReceipt(client);
  const newContractId = contractCreateReceipt.contractId;

  console.log('\n✅ CONTRACT DEPLOYED SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Contract ID:', newContractId.toString());
  console.log('   Transaction:', contractCreateSubmit.transactionId.toString());
  console.log('   HashScan:', `https://hashscan.io/testnet/contract/${newContractId.toString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 4: Verify new contract works
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4: Verify New Contract');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test paused status
  const pausedQuery = new ContractCallQuery()
    .setContractId(newContractId)
    .setGas(100000)
    .setFunction('paused');
  
  const pausedResult = await pausedQuery.execute(client);
  const isPaused = pausedResult.getBool(0);
  console.log(`✅ paused(): ${isPaused}`);

  // Test trading fee
  const feeQuery = new ContractCallQuery()
    .setContractId(newContractId)
    .setGas(100000)
    .setFunction('getTradingFee');
  
  const feeResult = await feeQuery.execute(client);
  const fee = feeResult.getUint256(0).toNumber();
  console.log(`✅ getTradingFee(): ${fee} basis points (${fee / 100}%)`);

  // Test max royalty
  const royaltyQuery = new ContractCallQuery()
    .setContractId(newContractId)
    .setGas(100000)
    .setFunction('getMaxRoyaltyPercentage');
  
  const royaltyResult = await royaltyQuery.execute(client);
  const maxRoyalty = royaltyResult.getUint256(0).toNumber();
  console.log(`✅ getMaxRoyaltyPercentage(): ${maxRoyalty} basis points (${maxRoyalty / 100}%)`);

  console.log('\n✅ All contract functions working!\n');

  // Step 5: Save deployment info
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 5: Update Configuration Files');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const deploymentInfo = {
    contractId: newContractId.toString(),
    transactionId: contractCreateSubmit.transactionId.toString(),
    timestamp: new Date().toISOString(),
    trustToken: TRUST_TOKEN_ID,
    feeRecipient: accountId,
    tradingFee: fee,
    maxRoyalty: maxRoyalty,
    hashscan: `https://hashscan.io/testnet/contract/${newContractId.toString()}`
  };

  // Save to deployments folder
  const deploymentsDir = path.join(__dirname, '..', 'contracts', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, 'marketplace-v2-latest.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`✅ Saved deployment info: ${deploymentPath}`);

  // Update frontend config
  const frontendConfigPath = path.join(__dirname, '..', '..', 'trustbridge-frontend', 'src', 'config', 'contracts.ts');
  
  if (fs.existsSync(frontendConfigPath)) {
    let configContent = fs.readFileSync(frontendConfigPath, 'utf8');
    
    // Update the trustMarketplaceV2 line
    configContent = configContent.replace(
      /trustMarketplaceV2:\s*'[^']*'/,
      `trustMarketplaceV2: '${newContractId.toString()}'`
    );
    
    fs.writeFileSync(frontendConfigPath, configContent);
    console.log(`✅ Updated frontend config: ${frontendConfigPath}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ DEPLOYMENT COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📋 Next Steps:');
  console.log('   1. Update CONTRACT_ADDRESSES.trustMarketplaceV2 in frontend');
  console.log(`      New ID: ${newContractId.toString()}`);
  console.log('   2. Restart frontend dev server');
  console.log('   3. Test listing an NFT');
  console.log('   4. Verify royalty distribution on purchase\n');

  console.log('🎯 To update environment variable:');
  console.log(`   export TRUST_MARKETPLACE_V2_ID=${newContractId.toString()}\n`);

  client.close();
}

main()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    console.error(error.stack);
    process.exit(1);
  });

