/**
 * Auto-Convert TRUST to HBAR for Gas Replenishment
 * This script can be run as a cron job to maintain marketplace HBAR balance
 */

const {
  Client,
  AccountId,
  PrivateKey,
  TransferTransaction,
  TokenId,
  Hbar,
  AccountBalanceQuery,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
} = require('@hashgraph/sdk');
require('dotenv').config();

const MIN_HBAR_BALANCE = 100; // Minimum HBAR to maintain
const TRUST_TO_CONVERT = 100; // Convert 100 TRUST at a time
const TRUST_TOKEN_ID = '0.0.6935064';

async function autoConvertTRUSTToHBAR() {
  console.log('🔄 Auto-Convert TRUST to HBAR Service\n');

  // Initialize client
  const client = Client.forTestnet();
  const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);
  client.setOperator(operatorId, operatorKey);

  try {
    // Step 1: Check current balances
    console.log('📊 Checking marketplace balances...');
    const balance = await new AccountBalanceQuery()
      .setAccountId(operatorId)
      .execute(client);

    const hbarBalance = balance.hbars.toBigNumber().toNumber();
    const trustBalance = balance.tokens?.get(TokenId.fromString(TRUST_TOKEN_ID))?.toNumber() || 0;

    console.log('💰 Current Balances:');
    console.log('   HBAR:', hbarBalance, 'ℏ');
    console.log('   TRUST:', trustBalance, 'tokens');

    // Step 2: Check if conversion needed
    if (hbarBalance >= MIN_HBAR_BALANCE) {
      console.log('✅ HBAR balance is sufficient (' + hbarBalance + ' ℏ >= ' + MIN_HBAR_BALANCE + ' ℏ)');
      console.log('   No conversion needed.');
      return {
        success: true,
        conversionNeeded: false,
        hbarBalance,
        trustBalance,
      };
    }

    if (trustBalance < TRUST_TO_CONVERT) {
      console.warn('⚠️ Low HBAR but insufficient TRUST for conversion');
      console.warn('   HBAR:', hbarBalance, 'ℏ (needs top-up!)');
      console.warn('   TRUST:', trustBalance, '(need', TRUST_TO_CONVERT, 'for conversion)');
      console.warn('');
      console.warn('🚨 ACTION REQUIRED: Manual HBAR top-up needed!');
      return {
        success: false,
        conversionNeeded: true,
        conversionDone: false,
        hbarBalance,
        trustBalance,
        message: 'Manual top-up required',
      };
    }

    // Step 3: Convert TRUST to HBAR
    console.log('🔄 Converting', TRUST_TO_CONVERT, 'TRUST to HBAR...');
    console.log('');

    // Check if exchange contract is deployed
    const exchangeContractId = process.env.TRUST_EXCHANGE_CONTRACT_ID;

    if (!exchangeContractId) {
      console.warn('⚠️ Exchange contract not configured');
      console.warn('   Set TRUST_EXCHANGE_CONTRACT_ID in .env');
      console.warn('');
      console.warn('💡 Alternative: Use HBAR → TRUST Exchange in REVERSE:');
      console.warn('   1. Go to: https://www.saucerswap.finance/');
      console.warn('   2. Swap TRUST → HBAR');
      console.warn('   3. Send HBAR back to marketplace account');
      
      return {
        success: false,
        conversionNeeded: true,
        conversionDone: false,
        message: 'Exchange contract not configured',
      };
    }

    // Call exchange contract to burn TRUST and get HBAR back
    console.log('📞 Calling TrustTokenExchange contract...');
    
    const contractExecTx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(exchangeContractId))
      .setGas(200000)
      .setFunction(
        'burnTrustForHBAR', // Assuming this function exists
        new ContractFunctionParameters()
          .addUint256(TRUST_TO_CONVERT * 100000000) // Convert to smallest unit
      )
      .setMaxTransactionFee(new Hbar(5));

    const response = await contractExecTx.execute(client);
    const receipt = await response.getReceipt(client);

    console.log('✅ Conversion completed!');
    console.log('   Transaction:', response.transactionId.toString());

    // Check new balances
    const newBalance = await new AccountBalanceQuery()
      .setAccountId(operatorId)
      .execute(client);

    const newHbarBalance = newBalance.hbars.toBigNumber().toNumber();
    const newTrustBalance = newBalance.tokens?.get(TokenId.fromString(TRUST_TOKEN_ID))?.toNumber() || 0;

    console.log('');
    console.log('💰 New Balances:');
    console.log('   HBAR:', newHbarBalance, 'ℏ (+' + (newHbarBalance - hbarBalance) + ')');
    console.log('   TRUST:', newTrustBalance, '(-' + (trustBalance - newTrustBalance) + ')');

    return {
      success: true,
      conversionNeeded: true,
      conversionDone: true,
      hbarBalance: newHbarBalance,
      trustBalance: newTrustBalance,
      hbarGained: newHbarBalance - hbarBalance,
      trustSpent: trustBalance - newTrustBalance,
    };

  } catch (error) {
    console.error('❌ Auto-conversion failed:', error);
    return {
      success: false,
      conversionNeeded: true,
      conversionDone: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    client.close();
  }
}

// Can be run as cron job or manually
if (require.main === module) {
  autoConvertTRUSTToHBAR()
    .then(result => {
      console.log('\n📋 Result:', JSON.stringify(result, null, 2));
      
      if (result.conversionDone) {
        console.log('\n✅ Gas replenishment successful!');
      } else if (result.conversionNeeded && !result.conversionDone) {
        console.log('\n⚠️ Manual intervention required!');
      } else {
        console.log('\n✅ No action needed!');
      }
      
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { autoConvertTRUSTToHBAR };

