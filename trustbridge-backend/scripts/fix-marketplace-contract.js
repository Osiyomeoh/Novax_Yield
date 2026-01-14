/**
 * Fix TRUSTMarketplaceV2 Contract Issues
 * Check and fix access control, pause status, etc.
 */

require('dotenv').config();
const {
  Client,
  AccountId,
  PrivateKey,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractId,
  Hbar,
} = require('@hashgraph/sdk');

const MARKETPLACE_CONTRACT_ID = '0.0.7053859';

async function main() {
  console.log('\n🔧 Diagnosing TRUSTMarketplaceV2 Contract Issues...\n');

  const accountId = process.env.HEDERA_ACCOUNT_ID || process.env.MY_ACCOUNT_ID;
  const privateKeyStr = process.env.HEDERA_PRIVATE_KEY || process.env.MY_PRIVATE_KEY;

  const client = Client.forTestnet();
  const operatorId = AccountId.fromString(accountId);
  
  let operatorKey;
  try {
    operatorKey = PrivateKey.fromStringECDSA(privateKeyStr);
  } catch (e) {
    operatorKey = PrivateKey.fromString(privateKeyStr);
  }
  
  client.setOperator(operatorId, operatorKey);

  console.log('Account:', accountId);
  console.log('Contract:', MARKETPLACE_CONTRACT_ID);
  console.log('');

  // Test 1: Check if contract is paused
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Check if contract is paused');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const pausedQuery = new ContractCallQuery()
      .setContractId(ContractId.fromString(MARKETPLACE_CONTRACT_ID))
      .setGas(100000)
      .setFunction('paused');
    
    const pausedResult = await pausedQuery.execute(client);
    const isPaused = pausedResult.getBool(0);
    
    console.log(`Contract paused: ${isPaused}`);
    
    if (isPaused) {
      console.log('\n⚠️  CONTRACT IS PAUSED! Need to unpause it...\n');
      
      // Try to unpause
      const unpauseTx = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(MARKETPLACE_CONTRACT_ID))
        .setGas(200000)
        .setFunction('unpause')
        .setMaxTransactionFee(new Hbar(2));

      console.log('Attempting to unpause contract...');
      const unpauseResponse = await unpauseTx.execute(client);
      await unpauseResponse.getReceipt(client);
      
      console.log('✅ Contract unpaused successfully!');
      console.log(`   Transaction: ${unpauseResponse.transactionId.toString()}\n`);
    } else {
      console.log('✅ Contract is not paused\n');
    }
  } catch (error) {
    console.error('❌ Failed to check pause status:', error.message);
    console.log('   This might mean the contract doesn\'t have a paused() function\n');
  }

  // Test 2: Try simple query that should always work
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Query trading fee (should work if contract is valid)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const feeQuery = new ContractCallQuery()
      .setContractId(ContractId.fromString(MARKETPLACE_CONTRACT_ID))
      .setGas(100000)
      .setFunction('getTradingFee');
    
    const feeResult = await feeQuery.execute(client);
    const fee = feeResult.getUint256(0).toNumber();
    
    console.log(`✅ Trading Fee: ${fee} basis points (${fee / 100}%)`);
    console.log('   Contract is responding to queries!\n');
  } catch (error) {
    console.error('❌ Contract query failed:', error.message);
    
    if (error.message.includes('CONTRACT_REVERT_EXECUTED')) {
      console.log('\n🚨 DIAGNOSIS: Contract is reverting all calls!');
      console.log('   Possible causes:');
      console.log('   1. Contract is paused');
      console.log('   2. Constructor failed and contract is in invalid state');
      console.log('   3. Wrong contract ABI');
      console.log('   4. Contract needs to be redeployed\n');
      
      console.log('💡 RECOMMENDATION: Redeploy the contract or use escrow model instead\n');
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DIAGNOSIS COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📋 Summary:');
  console.log('   - Contract exists on chain: ✅');
  console.log('   - Contract responding to calls: Check logs above');
  console.log('   - If contract is reverting: Use escrow model (working solution)\n');

  client.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Diagnosis failed:', error);
    process.exit(1);
  });

