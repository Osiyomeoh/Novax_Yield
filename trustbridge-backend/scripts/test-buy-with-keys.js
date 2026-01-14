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

// Usage: node test-buy-with-keys.js <buyer_key> <seller_key> [nft_token] [nft_serial]
const BUYER_KEY = process.argv[2];
const SELLER_KEY = process.argv[3];
const NFT_TOKEN_ID = process.argv[4] || '0.0.7025544';
const NFT_SERIAL = process.argv[5] || '1';

const BUYER_ACCOUNT = '0.0.7028303';
const SELLER_ACCOUNT = '0.0.6923405';
const TRUST_TOKEN_ID = '0.0.6916977';
const MARKETPLACE_ACCOUNT = '0.0.6916959';

if (!BUYER_KEY || !SELLER_KEY) {
  console.log('Usage: node test-buy-with-keys.js <buyer_private_key> <seller_private_key> [nft_token] [nft_serial]');
  console.log('');
  console.log('Example:');
  console.log('  node test-buy-with-keys.js 0x1234... 0x5678... 0.0.7025544 1');
  process.exit(1);
}

async function testBuy() {
  console.log('=== NFT Buy Flow Test ===\n');
  console.log('Buyer:', BUYER_ACCOUNT);
  console.log('Seller:', SELLER_ACCOUNT);
  console.log('NFT Token:', NFT_TOKEN_ID, 'Serial:', NFT_SERIAL);
  console.log('TRUST Token:', TRUST_TOKEN_ID);
  console.log('');

  // Create seller client
  const sellerClient = Client.forTestnet();
  sellerClient.setOperator(
    AccountId.fromString(SELLER_ACCOUNT),
    PrivateKey.fromStringECDSA(SELLER_KEY)
  );

  try {
    // Step 1: Check current owner
    console.log('Step 1: Checking current NFT owner...');
    const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/tokens/${NFT_TOKEN_ID}/nfts/${NFT_SERIAL}`);
    const nftData = await response.json();
    console.log('  Current owner:', nftData.account_id);
    
    if (nftData.account_id !== SELLER_ACCOUNT) {
      console.log('  ❌ NFT is not owned by seller!');
      console.log('  The seller must own the NFT to test the buy flow.');
      process.exit(1);
    }
    console.log('  ✅ Seller owns the NFT\n');

    // Step 2: Seller approves buyer
    console.log('Step 2: Seller approving buyer as spender...');
    const approvalTx = new AccountAllowanceApproveTransaction()
      .approveTokenNftAllowance(
        new NftId(TokenId.fromString(NFT_TOKEN_ID), parseInt(NFT_SERIAL)),
        AccountId.fromString(SELLER_ACCOUNT),
        AccountId.fromString(BUYER_ACCOUNT)
      )
      .freezeWith(sellerClient);
    
    const approvalSign = await approvalTx.sign(PrivateKey.fromStringECDSA(SELLER_KEY));
    const approvalResponse = await approvalSign.execute(sellerClient);
    await approvalResponse.getReceipt(sellerClient);
    console.log('  ✅ Approval TX:', approvalResponse.transactionId.toString());
    console.log('');

    // Step 3: Create buyer client
    const buyerClient = Client.forTestnet();
    buyerClient.setOperator(
      AccountId.fromString(BUYER_ACCOUNT),
      PrivateKey.fromStringECDSA(BUYER_KEY)
    );

    // Step 4: Associate token
    console.log('Step 3: Buyer associating NFT token...');
    try {
      const associateTx = new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(BUYER_ACCOUNT))
        .setTokenIds([TokenId.fromString(NFT_TOKEN_ID)])
        .freezeWith(buyerClient);
      
      const associateSign = await associateTx.sign(PrivateKey.fromStringECDSA(BUYER_KEY));
      const associateResponse = await associateSign.execute(buyerClient);
      await associateResponse.getReceipt(buyerClient);
      console.log('  ✅ Association TX:', associateResponse.transactionId.toString());
    } catch (err) {
      if (err.message.includes('TOKEN_ALREADY_ASSOCIATED')) {
        console.log('  ✅ Token already associated');
      } else {
        throw err;
      }
    }
    console.log('');

    // Step 5: Transfer TRUST tokens
    console.log('Step 4: Transferring TRUST tokens...');
    const assetPrice = 10;
    const platformFee = Math.floor(assetPrice * 0.05);
    const sellerAmount = assetPrice - platformFee;
    
    console.log('  Price:', assetPrice, 'TRUST');
    console.log('  Seller gets:', sellerAmount, 'TRUST');
    console.log('  Platform fee:', platformFee, 'TRUST');
    
    const trustTx = new TransferTransaction()
      .addTokenTransfer(TRUST_TOKEN_ID, BUYER_ACCOUNT, -assetPrice)
      .addTokenTransfer(TRUST_TOKEN_ID, SELLER_ACCOUNT, sellerAmount)
      .addTokenTransfer(TRUST_TOKEN_ID, MARKETPLACE_ACCOUNT, platformFee)
      .setTransactionMemo('Buy NFT Test')
      .freezeWith(buyerClient);
    
    const trustSign = await trustTx.sign(PrivateKey.fromStringECDSA(BUYER_KEY));
    const trustResponse = await trustSign.execute(buyerClient);
    await trustResponse.getReceipt(buyerClient);
    console.log('  ✅ TRUST TX:', trustResponse.transactionId.toString());
    console.log('');

    // Step 6: Transfer NFT
    console.log('Step 5: Transferring NFT using allowance...');
    const nftTx = new TransferTransaction()
      .addApprovedNftTransfer(
        TokenId.fromString(NFT_TOKEN_ID),
        parseInt(NFT_SERIAL),
        AccountId.fromString(SELLER_ACCOUNT),
        AccountId.fromString(BUYER_ACCOUNT)
      )
      .setTransactionMemo('NFT Transfer Test')
      .freezeWith(buyerClient);
    
    const nftSign = await nftTx.sign(PrivateKey.fromStringECDSA(BUYER_KEY));
    const nftResponse = await nftSign.execute(buyerClient);
    await nftResponse.getReceipt(buyerClient);
    console.log('  ✅ NFT Transfer TX:', nftResponse.transactionId.toString());
    console.log('');

    // Step 7: Verify
    console.log('Step 6: Verifying new ownership...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    const verifyResponse = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/tokens/${NFT_TOKEN_ID}/nfts/${NFT_SERIAL}`);
    const verifyData = await verifyResponse.json();
    console.log('  New owner:', verifyData.account_id);
    
    if (verifyData.account_id === BUYER_ACCOUNT) {
      console.log('  ✅ NFT SUCCESSFULLY TRANSFERRED TO BUYER!\n');
      console.log('=== TEST PASSED ===');
      console.log('The buy flow works correctly!');
    } else {
      console.log('  ❌ Transfer failed, still owned by:', verifyData.account_id);
    }

    sellerClient.close();
    buyerClient.close();

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.status) {
      console.error('Status:', error.status.toString());
    }
    process.exit(1);
  }
}

testBuy();

