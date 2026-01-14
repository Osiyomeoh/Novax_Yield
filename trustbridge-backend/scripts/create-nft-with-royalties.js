require('dotenv').config();
const {
  Client,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  PrivateKey,
  AccountId,
  Hbar,
  CustomRoyaltyFee,
  CustomFixedFee,
  TokenId,
} = require('@hashgraph/sdk');

/**
 * Create NFT with HTS Native Royalties
 * Uses Hedera Token Service custom fees for automatic royalty distribution
 * This is MORE EFFICIENT than smart contract royalties!
 */

async function main() {
  console.log('🎨 Creating NFT with HTS Native Royalties...\n');

  // Initialize Hedera client
  const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_OPERATOR_KEY);

  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  client.setDefaultMaxTransactionFee(new Hbar(20));

  try {
    // Get creator account (for this example, using operator)
    const creatorId = operatorId;
    
    // Get TRUST token ID
    const trustTokenId = TokenId.fromString(process.env.TRUST_TOKEN_ID);
    console.log(`💎 TRUST Token ID: ${trustTokenId.toString()}`);

    // ============ Step 1: Create NFT with Custom Royalty Fee ============
    console.log('\n📋 Step 1: Creating NFT with 5% royalty fee...');
    
    // Create royalty fee (5% paid to creator on all secondary sales)
    const royaltyFee = new CustomRoyaltyFee()
      .setFeeCollectorAccountId(creatorId) // Creator receives royalties
      .setNumerator(5) // 5%
      .setDenominator(100) // Out of 100
      .setFallbackFee(
        // Fallback fee if royalty token not available
        new CustomFixedFee()
          .setHbarAmount(new Hbar(5)) // 5 HBAR fallback
      );

    console.log(`   Creator (Royalty Recipient): ${creatorId.toString()}`);
    console.log(`   Royalty Percentage: 5%`);
    console.log(`   Fallback Fee: 5 HBAR`);

    // Create NFT collection
    const nftCreateTx = new TokenCreateTransaction()
      .setTokenName('TrustBridge Digital Asset with Royalties')
      .setTokenSymbol('TBDA')
      .setTokenType(TokenType.NonFungibleUnique)
      .setDecimals(0)
      .setInitialSupply(0)
      .setTreasuryAccountId(operatorId)
      .setSupplyType(TokenSupplyType.Infinite)
      .setSupplyKey(operatorKey)
      .setAdminKey(operatorKey)
      .setCustomFees([royaltyFee]) // ⭐ NATIVE ROYALTIES!
      .setMaxTransactionFee(new Hbar(20));

    console.log('   Submitting transaction...');
    const nftCreateResponse = await nftCreateTx.execute(client);
    const nftCreateReceipt = await nftCreateResponse.getReceipt(client);
    const nftTokenId = nftCreateReceipt.tokenId;

    console.log(`\n✅ NFT Collection Created: ${nftTokenId.toString()}`);
    console.log(`   Transaction ID: ${nftCreateResponse.transactionId.toString()}`);
    console.log(`   Hashscan: https://hashscan.io/testnet/token/${nftTokenId.toString()}`);

    // ============ Step 2: Mint NFT ============
    console.log('\n📋 Step 2: Minting NFT with metadata...');

    const metadata = JSON.stringify({
      name: 'Sample Digital Art with Royalties',
      description: 'This NFT has 5% native royalties built into the token',
      image: 'https://via.placeholder.com/500',
      price: '500',
      currency: 'TRUST',
      creator: creatorId.toString(),
      royaltyPercentage: '5',
      createdAt: new Date().toISOString()
    });

    const mintTx = new TokenMintTransaction()
      .setTokenId(nftTokenId)
      .addMetadata(Buffer.from(metadata))
      .setMaxTransactionFee(new Hbar(10));

    const mintResponse = await mintTx.execute(client);
    const mintReceipt = await mintResponse.getReceipt(client);
    const serialNumber = mintReceipt.serials[0];

    console.log(`✅ NFT Minted:`);
    console.log(`   Serial Number: ${serialNumber.toString()}`);
    console.log(`   Transaction ID: ${mintResponse.transactionId.toString()}`);
    console.log(`   Hashscan: https://hashscan.io/testnet/token/${nftTokenId.toString()}/${serialNumber.toString()}`);

    // ============ Summary ============
    console.log('\n🎉 NFT with Native Royalties Created Successfully!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 NFT DETAILS');
    console.log(`   Token ID: ${nftTokenId.toString()}`);
    console.log(`   Serial Number: ${serialNumber.toString()}`);
    console.log(`   Creator: ${creatorId.toString()}`);
    console.log('');
    console.log('💰 ROYALTY CONFIGURATION');
    console.log(`   Percentage: 5%`);
    console.log(`   Recipient: ${creatorId.toString()}`);
    console.log(`   Fallback: 5 HBAR`);
    console.log('');
    console.log('🔥 HOW IT WORKS:');
    console.log('   - Creator gets 5% on EVERY secondary sale');
    console.log('   - Royalty is AUTOMATIC (built into token)');
    console.log('   - No smart contract needed');
    console.log('   - MORE EFFICIENT than contract royalties');
    console.log('   - Cannot be bypassed!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('🧪 Test the Royalty:');
    console.log('1. Transfer the NFT to another account');
    console.log('2. New owner lists and sells it');
    console.log('3. Creator AUTOMATICALLY receives 5% royalty!');
    console.log('4. Check creator balance to verify\n');

  } catch (error) {
    console.error('❌ Error creating NFT with royalties:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();

