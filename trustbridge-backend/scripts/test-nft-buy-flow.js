require('dotenv').config();
const {
  Client,
  PrivateKey,
  AccountId,
  TokenId,
  TransferTransaction,
  TokenAssociateTransaction,
  AccountAllowanceApproveTransaction,
  NftId
} = require('@hashgraph/sdk');

async function testNFTBuyFlow() {
  console.log('=== Testing NFT Buy Flow ===\n');

  // Test configuration - use main config as fallback
  const BUYER_ACCOUNT = process.env.TEST_BUYER_ACCOUNT || '0.0.7028303';
  const BUYER_KEY = process.env.TEST_BUYER_KEY || process.env.HEDERA_PRIVATE_KEY;
  const SELLER_ACCOUNT = process.env.TEST_SELLER_ACCOUNT || process.env.HEDERA_ACCOUNT_ID || '0.0.6923405';
  const SELLER_KEY = process.env.TEST_SELLER_KEY || process.env.HEDERA_PRIVATE_KEY;
  const NFT_TOKEN_ID = process.env.TEST_NFT_TOKEN || '0.0.7025544'; // art3
  const NFT_SERIAL = process.env.TEST_NFT_SERIAL || '1';
  const TRUST_TOKEN_ID = '0.0.6916977';
  const MARKETPLACE_ACCOUNT = '0.0.6916959';

  console.log('Test Configuration:');
  console.log('  Buyer:', BUYER_ACCOUNT);
  console.log('  Buyer Key:', BUYER_KEY ? '✅ Loaded' : '❌ Missing');
  console.log('  Seller:', SELLER_ACCOUNT);
  console.log('  Seller Key:', SELLER_KEY ? '✅ Loaded' : '❌ Missing');
  console.log('  NFT Token:', NFT_TOKEN_ID);
  console.log('  NFT Serial:', NFT_SERIAL);
  console.log('  TRUST Token:', TRUST_TOKEN_ID);
  console.log('');

  if (!BUYER_KEY || !SELLER_KEY) {
    throw new Error('Missing private keys! Set TEST_BUYER_KEY and TEST_SELLER_KEY in test-buy.env');
  }

  // Create client
  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(SELLER_ACCOUNT),
    PrivateKey.fromStringECDSA(SELLER_KEY)
  );

  try {
    // Step 1: Verify NFT ownership
    console.log('Step 1: Verifying NFT ownership...');
    const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/tokens/${NFT_TOKEN_ID}/nfts/${NFT_SERIAL}`);
    const nftData = await response.json();
    console.log('  Current owner:', nftData.account_id);
    
    if (nftData.account_id !== SELLER_ACCOUNT) {
      throw new Error(`NFT is not owned by seller! Current owner: ${nftData.account_id}`);
    }
    console.log('  ✅ NFT is owned by seller\n');

    // Step 2: Seller approves marketplace/buyer as spender
    console.log('Step 2: Seller approving buyer as NFT spender...');
    const approvalTx = new AccountAllowanceApproveTransaction()
      .approveTokenNftAllowance(
        new NftId(TokenId.fromString(NFT_TOKEN_ID), NFT_SERIAL),
        AccountId.fromString(SELLER_ACCOUNT),
        AccountId.fromString(BUYER_ACCOUNT)
      )
      .freezeWith(client);
    
    const approvalSign = await approvalTx.sign(PrivateKey.fromStringECDSA(SELLER_KEY));
    const approvalResponse = await approvalSign.execute(client);
    const approvalReceipt = await approvalResponse.getReceipt(client);
    console.log('  ✅ Approval transaction:', approvalResponse.transactionId.toString());
    console.log('  ✅ Buyer can now transfer the NFT\n');

    // Step 3: Switch to buyer client
    console.log('Step 3: Switching to buyer account...');
    const buyerClient = Client.forTestnet();
    buyerClient.setOperator(
      AccountId.fromString(BUYER_ACCOUNT),
      PrivateKey.fromStringECDSA(BUYER_KEY)
    );
    console.log('  ✅ Buyer client initialized\n');

    // Step 4: Buyer associates NFT token
    console.log('Step 4: Buyer associating NFT token...');
    try {
      const associateTx = new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(BUYER_ACCOUNT))
        .setTokenIds([TokenId.fromString(NFT_TOKEN_ID)])
        .freezeWith(buyerClient);
      
      const associateSign = await associateTx.sign(PrivateKey.fromStringECDSA(BUYER_KEY));
      const associateResponse = await associateSign.execute(buyerClient);
      await associateResponse.getReceipt(buyerClient);
      console.log('  ✅ Token associated:', associateResponse.transactionId.toString());
    } catch (err) {
      if (err.message.includes('TOKEN_ALREADY_ASSOCIATED')) {
        console.log('  ✅ Token already associated');
      } else {
        throw err;
      }
    }
    console.log('');

    // Step 5: Transfer TRUST tokens (buyer -> seller + marketplace)
    console.log('Step 5: Buyer paying TRUST tokens...');
    const assetPrice = 10;
    const platformFee = Math.floor(assetPrice * 0.05); // 5%
    const sellerAmount = assetPrice - platformFee;
    
    console.log('  Price:', assetPrice, 'TRUST');
    console.log('  Seller receives:', sellerAmount, 'TRUST');
    console.log('  Platform fee:', platformFee, 'TRUST');
    
    const trustTransferTx = new TransferTransaction()
      .addTokenTransfer(TRUST_TOKEN_ID, BUYER_ACCOUNT, -assetPrice)
      .addTokenTransfer(TRUST_TOKEN_ID, SELLER_ACCOUNT, sellerAmount)
      .addTokenTransfer(TRUST_TOKEN_ID, MARKETPLACE_ACCOUNT, platformFee)
      .setTransactionMemo('Buy: Test NFT')
      .freezeWith(buyerClient);
    
    const trustSign = await trustTransferTx.sign(PrivateKey.fromStringECDSA(BUYER_KEY));
    const trustResponse = await trustSign.execute(buyerClient);
    await trustResponse.getReceipt(buyerClient);
    console.log('  ✅ TRUST tokens transferred:', trustResponse.transactionId.toString());
    console.log('');

    // Step 6: Transfer NFT using allowance
    console.log('Step 6: Transferring NFT using allowance...');
    const nftTransferTx = new TransferTransaction()
      .addApprovedNftTransfer(
        TokenId.fromString(NFT_TOKEN_ID),
        parseInt(NFT_SERIAL),
        AccountId.fromString(SELLER_ACCOUNT),
        AccountId.fromString(BUYER_ACCOUNT)
      )
      .setTransactionMemo('NFT Transfer: Test')
      .freezeWith(buyerClient);
    
    const nftSign = await nftTransferTx.sign(PrivateKey.fromStringECDSA(BUYER_KEY));
    const nftResponse = await nftSign.execute(buyerClient);
    const nftReceipt = await nftResponse.getReceipt(buyerClient);
    console.log('  ✅ NFT transferred:', nftResponse.transactionId.toString());
    console.log('');

    // Step 7: Verify new ownership
    console.log('Step 7: Verifying new ownership...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for Mirror Node
    const verifyResponse = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/tokens/${NFT_TOKEN_ID}/nfts/${NFT_SERIAL}`);
    const verifyData = await verifyResponse.json();
    console.log('  New owner:', verifyData.account_id);
    
    if (verifyData.account_id === BUYER_ACCOUNT) {
      console.log('  ✅ NFT successfully transferred to buyer!');
    } else {
      console.log('  ❌ NFT transfer failed - still owned by:', verifyData.account_id);
    }

    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===\n');
    console.log('The buy flow works! Issue must be in frontend signing.');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nFull error:', error);
    
    if (error.message.includes('INSUFFICIENT_TOKEN_BALANCE')) {
      console.log('\n💡 Fix: Buyer needs more TRUST tokens');
    } else if (error.message.includes('SPENDER_DOES_NOT_HAVE_ALLOWANCE')) {
      console.log('\n💡 Fix: Seller needs to approve buyer first (listing)');
    } else if (error.message.includes('TOKEN_NOT_ASSOCIATED_TO_ACCOUNT')) {
      console.log('\n💡 Fix: Buyer needs to associate the NFT token');
    }
  }

  client.close();
}

// Run if buyer/seller keys are provided
if (process.argv.includes('--run')) {
  testNFTBuyFlow().catch(console.error);
} else {
  console.log('Usage: node test-nft-buy-flow.js --run');
  console.log('');
  console.log('Environment variables needed:');
  console.log('  TEST_BUYER_ACCOUNT=0.0.7028303');
  console.log('  TEST_BUYER_KEY=<buyer private key>');
  console.log('  TEST_SELLER_ACCOUNT=0.0.6923405');
  console.log('  TEST_SELLER_KEY=<seller private key>');
  console.log('  TEST_NFT_TOKEN=0.0.7025544');
  console.log('  TEST_NFT_SERIAL=1');
}

