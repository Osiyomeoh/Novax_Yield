/**
 * Test TRUSTMarketplaceV2 Smart Contract Calls
 * This script tests direct interaction with the deployed marketplace contract
 */

require('dotenv').config();
const {
  Client,
  AccountId,
  PrivateKey,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  ContractId,
  TokenId,
  AccountAllowanceApproveTransaction,
  Hbar,
} = require('@hashgraph/sdk');

// Configuration
const MARKETPLACE_CONTRACT_ID = '0.0.7053859'; // TRUSTMarketplaceV2
const TRUST_TOKEN_ID = '0.0.6935064';
const TEST_NFT_TOKEN_ID = '0.0.7028555'; // Art6 NFT
const TEST_NFT_SERIAL = 1;

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     TRUSTMarketplaceV2 - Smart Contract Test Suite         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Setup client
  const accountId = process.env.HEDERA_ACCOUNT_ID || process.env.MY_ACCOUNT_ID;
  const privateKeyStr = process.env.HEDERA_PRIVATE_KEY || process.env.MY_PRIVATE_KEY;

  if (!accountId || !privateKeyStr) {
    throw new Error('Missing environment variables: HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY');
  }

  console.log('🔧 Initializing Hedera client...');
  console.log('   Account:', accountId);
  console.log('   Network: Testnet\n');

  const client = Client.forTestnet();
  const operatorId = AccountId.fromString(accountId);
  
  let operatorKey;
  try {
    operatorKey = PrivateKey.fromStringECDSA(privateKeyStr);
  } catch (e) {
    operatorKey = PrivateKey.fromString(privateKeyStr);
  }
  
  client.setOperator(operatorId, operatorKey);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Query Contract Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Get trading fee
    const getTradingFeeQuery = new ContractCallQuery()
      .setContractId(ContractId.fromString(MARKETPLACE_CONTRACT_ID))
      .setGas(100000)
      .setFunction('getTradingFee');
    
    const tradingFeeResult = await getTradingFeeQuery.execute(client);
    const tradingFee = tradingFeeResult.getUint256(0).toNumber();
    console.log(`✅ Trading Fee: ${tradingFee} basis points (${tradingFee / 100}%)`);

    // Get max royalty
    const getMaxRoyaltyQuery = new ContractCallQuery()
      .setContractId(ContractId.fromString(MARKETPLACE_CONTRACT_ID))
      .setGas(100000)
      .setFunction('getMaxRoyaltyPercentage');
    
    const maxRoyaltyResult = await getMaxRoyaltyQuery.execute(client);
    const maxRoyalty = maxRoyaltyResult.getUint256(0).toNumber();
    console.log(`✅ Max Royalty: ${maxRoyalty} basis points (${maxRoyalty / 100}%)`);

    // Get TRUST token address
    const getTrustTokenQuery = new ContractCallQuery()
      .setContractId(ContractId.fromString(MARKETPLACE_CONTRACT_ID))
      .setGas(100000)
      .setFunction('trustToken');
    
    const trustTokenResult = await getTrustTokenQuery.execute(client);
    const trustTokenAddress = '0x' + trustTokenResult.getAddress(0);
    console.log(`✅ TRUST Token Address: ${trustTokenAddress}`);

    console.log('\n✅ Contract configuration queries successful!\n');
  } catch (error) {
    console.error('❌ Contract query failed:', error.message);
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Set Royalty for NFT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    console.log(`Setting 5% royalty for NFT ${TEST_NFT_TOKEN_ID} serial ${TEST_NFT_SERIAL}...`);
    
    // Convert Token ID to Solidity address
    const nftTokenId = TokenId.fromString(TEST_NFT_TOKEN_ID);
    const nftSolidityAddress = nftTokenId.toSolidityAddress();
    
    console.log('   NFT Token ID:', TEST_NFT_TOKEN_ID);
    console.log('   NFT Solidity Address:', nftSolidityAddress);
    console.log('   Serial Number:', TEST_NFT_SERIAL);
    console.log('   Royalty: 5% (500 basis points)');
    
    const setRoyaltyTx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(MARKETPLACE_CONTRACT_ID))
      .setGas(200000)
      .setFunction(
        'setRoyalty',
        new ContractFunctionParameters()
          .addAddress(nftSolidityAddress)
          .addUint256(TEST_NFT_SERIAL)
          .addUint256(500) // 5% = 500 basis points
      )
      .setMaxTransactionFee(new Hbar(2));

    console.log('\n📤 Submitting setRoyalty transaction...');
    const setRoyaltyResponse = await setRoyaltyTx.execute(client);
    const setRoyaltyReceipt = await setRoyaltyResponse.getReceipt(client);
    
    console.log(`✅ Royalty set successfully!`);
    console.log(`   Transaction ID: ${setRoyaltyResponse.transactionId.toString()}`);
    console.log(`   Status: ${setRoyaltyReceipt.status.toString()}`);
    console.log(`   View: https://hashscan.io/testnet/transaction/${setRoyaltyResponse.transactionId.toString()}\n`);
  } catch (error) {
    console.error('❌ Set royalty failed:', error.message);
    console.log('   This might be expected if royalty is already set or if you don\'t own the NFT\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Approve NFT for Marketplace');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    console.log(`Approving marketplace to transfer NFT ${TEST_NFT_TOKEN_ID} serial ${TEST_NFT_SERIAL}...`);
    
    const marketplaceAccountId = AccountId.fromString(MARKETPLACE_CONTRACT_ID);
    const nftTokenId = TokenId.fromString(TEST_NFT_TOKEN_ID);
    
    console.log('   NFT Token ID:', TEST_NFT_TOKEN_ID);
    console.log('   Serial Number:', TEST_NFT_SERIAL);
    console.log('   Marketplace (Spender):', MARKETPLACE_CONTRACT_ID);
    console.log('   Owner:', accountId);
    
    const approveNftTx = new AccountAllowanceApproveTransaction()
      .approveTokenNftAllowance(
        nftTokenId,
        operatorId,
        marketplaceAccountId,
        [TEST_NFT_SERIAL]
      )
      .setMaxTransactionFee(new Hbar(2));

    console.log('\n📤 Submitting NFT approval...');
    const approveResponse = await approveNftTx.execute(client);
    const approveReceipt = await approveResponse.getReceipt(client);
    
    console.log(`✅ NFT approved for marketplace!`);
    console.log(`   Transaction ID: ${approveResponse.transactionId.toString()}`);
    console.log(`   Status: ${approveReceipt.status.toString()}`);
    console.log(`   View: https://hashscan.io/testnet/transaction/${approveResponse.transactionId.toString()}\n`);
  } catch (error) {
    console.error('❌ NFT approval failed:', error.message);
    console.log('   This might be expected if already approved or if you don\'t own the NFT\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: List NFT on Marketplace');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    console.log(`Listing NFT ${TEST_NFT_TOKEN_ID} serial ${TEST_NFT_SERIAL} for 100 TRUST...`);
    
    // Convert Token ID to Solidity address
    const nftTokenId = TokenId.fromString(TEST_NFT_TOKEN_ID);
    const nftSolidityAddress = nftTokenId.toSolidityAddress();
    
    const price = 100; // 100 TRUST
    const priceInSmallestUnit = price * 100000000; // Convert to smallest unit (8 decimals)
    const duration = 30 * 24 * 60 * 60; // 30 days in seconds
    
    console.log('   NFT Token ID:', TEST_NFT_TOKEN_ID);
    console.log('   NFT Solidity Address:', nftSolidityAddress);
    console.log('   Serial Number:', TEST_NFT_SERIAL);
    console.log('   Price:', price, 'TRUST');
    console.log('   Price (smallest unit):', priceInSmallestUnit);
    console.log('   Duration: 30 days');
    
    const listAssetTx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(MARKETPLACE_CONTRACT_ID))
      .setGas(300000)
      .setFunction(
        'listAsset',
        new ContractFunctionParameters()
          .addAddress(nftSolidityAddress)
          .addUint256(TEST_NFT_SERIAL)
          .addUint256(priceInSmallestUnit)
          .addUint256(duration)
      )
      .setMaxTransactionFee(new Hbar(5));

    console.log('\n📤 Submitting listAsset transaction...');
    const listResponse = await listAssetTx.execute(client);
    const listReceipt = await listResponse.getReceipt(client);
    
    console.log(`✅ NFT listed on marketplace!`);
    console.log(`   Transaction ID: ${listResponse.transactionId.toString()}`);
    console.log(`   Status: ${listReceipt.status.toString()}`);
    console.log(`   View: https://hashscan.io/testnet/transaction/${listResponse.transactionId.toString()}\n`);
    
    console.log('🎉 Asset is now listed with automatic royalty distribution!\n');
  } catch (error) {
    console.error('❌ Listing failed:', error.message);
    console.log('   Error details:', error);
    console.log('   Make sure you own the NFT and it\'s approved for the marketplace\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ TEST SUITE COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📋 Summary:');
  console.log('   1. ✅ Contract configuration verified');
  console.log('   2. ⚠️  Royalty setting tested (check output above)');
  console.log('   3. ⚠️  NFT approval tested (check output above)');
  console.log('   4. ⚠️  Listing tested (check output above)\n');

  console.log('💡 Next Steps:');
  console.log('   - If all tests passed: Frontend integration should work');
  console.log('   - If tests failed: Check error messages above');
  console.log('   - Verify you own the test NFT and have necessary approvals\n');

  client.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });

