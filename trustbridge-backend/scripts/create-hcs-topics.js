require('dotenv').config();
const {
  Client,
  TopicCreateTransaction,
  TopicInfoQuery,
  PrivateKey,
  AccountId,
  Hbar,
} = require('@hashgraph/sdk');
const fs = require('fs');

/**
 * Create HCS Topics for TrustBridge Marketplace
 * Creates immutable audit trail topics for:
 * 1. Marketplace events (listings, sales, etc.)
 * 2. Offer messages (buyer/seller communication)
 */

async function main() {
  console.log('🚀 Creating HCS Topics for TrustBridge Marketplace...\n');

  // Check for required environment variables
  const accountIdEnv = process.env.HEDERA_OPERATOR_ID || process.env.HEDERA_ACCOUNT_ID;
  const privateKeyEnv = process.env.HEDERA_OPERATOR_KEY || process.env.HEDERA_PRIVATE_KEY;

  if (!accountIdEnv || !privateKeyEnv) {
    console.error('❌ Missing required environment variables:');
    console.error('   HEDERA_ACCOUNT_ID:', process.env.HEDERA_ACCOUNT_ID ? '✅' : '❌');
    console.error('   HEDERA_PRIVATE_KEY:', process.env.HEDERA_PRIVATE_KEY ? '✅' : '❌');
    console.error('\nPlease check your .env file and ensure these values are set.');
    process.exit(1);
  }

  // Initialize Hedera client
  const operatorId = AccountId.fromString(accountIdEnv);
  const operatorKey = PrivateKey.fromStringECDSA(privateKeyEnv);

  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  client.setDefaultMaxTransactionFee(new Hbar(10));

  try {
    // ============ Create Marketplace Events Topic ============
    console.log('📋 Creating Marketplace Events Topic...');
    
    const marketplaceTx = new TopicCreateTransaction()
      .setTopicMemo('TrustBridge Marketplace Events - Immutable Audit Trail for all listings, sales, and offers')
      .setAdminKey(operatorKey)
      .setSubmitKey(operatorKey)
      .setMaxTransactionFee(new Hbar(5));

    const marketplaceResponse = await marketplaceTx.execute(client);
    const marketplaceReceipt = await marketplaceResponse.getReceipt(client);
    const marketplaceTopicId = marketplaceReceipt.topicId;

    console.log(`✅ Marketplace Events Topic Created: ${marketplaceTopicId.toString()}`);
    console.log(`   Transaction ID: ${marketplaceResponse.transactionId.toString()}`);

    // Query topic info
    const marketplaceInfo = await new TopicInfoQuery()
      .setTopicId(marketplaceTopicId)
      .execute(client);

    console.log(`   Memo: ${marketplaceInfo.topicMemo}`);
    console.log(`   Sequence Number: ${marketplaceInfo.sequenceNumber.toString()}`);
    console.log('');

    // ============ Create Offer Messages Topic ============
    console.log('💬 Creating Offer Messages Topic...');
    
    const offerTx = new TopicCreateTransaction()
      .setTopicMemo('TrustBridge Offer Messages - Decentralized buyer/seller communication')
      .setAdminKey(operatorKey)
      .setSubmitKey(operatorKey)
      .setMaxTransactionFee(new Hbar(5));

    const offerResponse = await offerTx.execute(client);
    const offerReceipt = await offerResponse.getReceipt(client);
    const offerTopicId = offerReceipt.topicId;

    console.log(`✅ Offer Messages Topic Created: ${offerTopicId.toString()}`);
    console.log(`   Transaction ID: ${offerResponse.transactionId.toString()}`);

    // Query topic info
    const offerInfo = await new TopicInfoQuery()
      .setTopicId(offerTopicId)
      .execute(client);

    console.log(`   Memo: ${offerInfo.topicMemo}`);
    console.log(`   Sequence Number: ${offerInfo.sequenceNumber.toString()}`);
    console.log('');

    // ============ Save Topic IDs ============
    console.log('💾 Saving topic IDs to .env...');

    const envPath = '.env';
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Add or update HCS topic IDs
    if (envContent.includes('HCS_MARKETPLACE_TOPIC_ID=')) {
      envContent = envContent.replace(
        /HCS_MARKETPLACE_TOPIC_ID=.*/,
        `HCS_MARKETPLACE_TOPIC_ID=${marketplaceTopicId.toString()}`
      );
    } else {
      envContent += `\n\n# HCS Topics\nHCS_MARKETPLACE_TOPIC_ID=${marketplaceTopicId.toString()}\n`;
    }

    if (envContent.includes('HCS_OFFER_TOPIC_ID=')) {
      envContent = envContent.replace(
        /HCS_OFFER_TOPIC_ID=.*/,
        `HCS_OFFER_TOPIC_ID=${offerTopicId.toString()}`
      );
    } else {
      envContent += `HCS_OFFER_TOPIC_ID=${offerTopicId.toString()}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Topic IDs saved to .env');

    // ============ Save to JSON ============
    const topicData = {
      marketplaceEventsTopic: {
        topicId: marketplaceTopicId.toString(),
        memo: marketplaceInfo.topicMemo,
        createdAt: new Date().toISOString(),
        transactionId: marketplaceResponse.transactionId.toString(),
      },
      offerMessagesTopic: {
        topicId: offerTopicId.toString(),
        memo: offerInfo.topicMemo,
        createdAt: new Date().toISOString(),
        transactionId: offerResponse.transactionId.toString(),
      },
    };

    fs.writeFileSync(
      'hcs-topics.json',
      JSON.stringify(topicData, null, 2)
    );
    console.log('✅ Topic data saved to hcs-topics.json\n');

    // ============ Summary ============
    console.log('🎉 HCS Topics Created Successfully!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 MARKETPLACE EVENTS TOPIC');
    console.log(`   Topic ID: ${marketplaceTopicId.toString()}`);
    console.log(`   Use for: Listings, sales, offers, price updates`);
    console.log('');
    console.log('💬 OFFER MESSAGES TOPIC');
    console.log(`   Topic ID: ${offerTopicId.toString()}`);
    console.log(`   Use for: Buyer/seller communication, negotiations`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📊 View topics on Hashscan:');
    console.log(`   Marketplace: https://hashscan.io/testnet/topic/${marketplaceTopicId.toString()}`);
    console.log(`   Offers: https://hashscan.io/testnet/topic/${offerTopicId.toString()}\n`);

    console.log('🔧 Next Steps:');
    console.log('1. Restart your backend to load new topic IDs');
    console.log('2. Test event submission with test-hcs-integration.js');
    console.log('3. Query events from Mirror Node');
    console.log('4. Integrate into frontend for real-time updates\n');

  } catch (error) {
    console.error('❌ Error creating HCS topics:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();

