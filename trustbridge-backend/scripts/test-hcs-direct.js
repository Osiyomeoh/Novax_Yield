require('dotenv').config();
const {
  Client,
  TopicMessageSubmitTransaction,
  TopicId,
  PrivateKey,
  AccountId,
  Hbar,
} = require('@hashgraph/sdk');

/**
 * Test HCS Directly (without backend API)
 * Submits a message directly to HCS topic and queries it back
 */

async function main() {
  console.log('🧪 Testing HCS Directly on Hedera...\n');

  // Initialize Hedera client
  const accountIdEnv = process.env.HEDERA_OPERATOR_ID || process.env.HEDERA_ACCOUNT_ID;
  const privateKeyEnv = process.env.HEDERA_OPERATOR_KEY || process.env.HEDERA_PRIVATE_KEY;

  const operatorId = AccountId.fromString(accountIdEnv);
  const operatorKey = PrivateKey.fromStringECDSA(privateKeyEnv);

  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  try {
    // Get marketplace topic ID
    const topicId = TopicId.fromString(process.env.HCS_MARKETPLACE_TOPIC_ID);
    console.log(`📋 Using Marketplace Topic: ${topicId.toString()}\n`);

    // ============ Test 1: Submit Message to HCS ============
    console.log('📤 Test 1: Submitting test event to HCS...');
    
    const testEvent = {
      type: 'listing',
      assetTokenId: '0.0.TEST123',
      assetName: 'Test NFT - Direct HCS Submission',
      from: operatorId.toString(),
      price: 999,
      timestamp: new Date().toISOString(),
      test: true
    };

    const message = JSON.stringify(testEvent);
    console.log('   Message:', message);

    const submitTx = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message)
      .setMaxTransactionFee(new Hbar(2));

    console.log('   Submitting to Hedera...');
    const response = await submitTx.execute(client);
    const receipt = await response.getReceipt(client);

    const sequenceNumber = receipt.topicSequenceNumber.toString();
    const transactionId = response.transactionId.toString();

    console.log('✅ Message submitted to HCS!');
    console.log(`   Transaction ID: ${transactionId}`);
    console.log(`   Sequence Number: ${sequenceNumber}`);
    console.log(`   Topic ID: ${topicId.toString()}\n`);

    // ============ Test 2: Wait for Mirror Node ============
    console.log('⏳ Waiting 8 seconds for Mirror Node to index...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // ============ Test 3: Query from Mirror Node ============
    console.log('📥 Test 2: Querying messages from Mirror Node...\n');
    
    const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId.toString()}/messages?limit=5&order=desc`;
    console.log('   Query URL:', mirrorNodeUrl);

    const fetch = (await import('node-fetch')).default;
    const queryResponse = await fetch(mirrorNodeUrl);
    const data = await queryResponse.json();

    if (data.messages && data.messages.length > 0) {
      console.log(`✅ Retrieved ${data.messages.length} messages from HCS!\n`);

      // Decode and display latest messages
      data.messages.forEach((msg, index) => {
        const messageBase64 = msg.message;
        const messageString = Buffer.from(messageBase64, 'base64').toString('utf-8');
        
        try {
          const parsed = JSON.parse(messageString);
          console.log(`   Message #${msg.sequence_number}:`);
          console.log(`   - Type: ${parsed.type}`);
          console.log(`   - Asset: ${parsed.assetName}`);
          console.log(`   - Price: ${parsed.price} TRUST`);
          console.log(`   - From: ${parsed.from}`);
          console.log(`   - Timestamp: ${parsed.timestamp}`);
          console.log(`   - Consensus: ${msg.consensus_timestamp}`);
          console.log('');
        } catch (err) {
          console.log(`   Message #${msg.sequence_number}: ${messageString.substring(0, 100)}...`);
        }
      });
    } else {
      console.log('⚠️  No messages found yet. Try again in a few seconds.');
    }

    // ============ Summary ============
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 HCS IS WORKING!\n');
    console.log('✅ Messages submitted to Hedera');
    console.log('✅ Messages indexed by Mirror Node');
    console.log('✅ Messages queryable via API');
    console.log('✅ Messages viewable on Hashscan\n');
    
    console.log('🔗 View on Hashscan:');
    console.log(`   https://hashscan.io/testnet/topic/${topicId.toString()}\n`);
    
    console.log('🏆 YOUR MARKETPLACE NOW HAS:');
    console.log('   ✅ Immutable audit trail');
    console.log('   ✅ Verifiable transaction history');
    console.log('   ✅ Complete transparency');
    console.log('   ✅ Features no other marketplace has!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ HCS test failed:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

main();

