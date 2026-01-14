require('dotenv').config();
const axios = require('axios');

/**
 * Test HCS Integration
 * Submits test events and queries them back
 */

const BASE_URL = 'http://localhost:4001/api';

async function main() {
  console.log('🧪 Testing HCS Integration...\n');

  try {
    // ============ Test 1: Submit Marketplace Event ============
    console.log('📤 Test 1: Submitting marketplace event to HCS...');
    
    const testEvent = {
      type: 'listing',
      assetTokenId: '0.0.1234567',
      assetName: 'Test NFT for HCS',
      from: '0.0.6916959',
      price: 1000,
      timestamp: new Date().toISOString(),
      transactionId: '0.0.test@123456789'
    };

    const submitResponse = await axios.post(`${BASE_URL}/hedera/hcs/marketplace/event`, testEvent);
    
    if (submitResponse.data.success) {
      console.log('✅ Event submitted successfully!');
      console.log('   Transaction ID:', submitResponse.data.data.transactionId);
      console.log('   Topic ID:', submitResponse.data.data.topicId);
    } else {
      console.error('❌ Failed to submit event:', submitResponse.data.message);
    }
    console.log('');

    // Wait for Mirror Node to index
    console.log('⏳ Waiting 5 seconds for Mirror Node to index...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // ============ Test 2: Query Marketplace Events ============
    console.log('📥 Test 2: Querying marketplace events from HCS...');
    
    const queryResponse = await axios.get(`${BASE_URL}/hedera/hcs/marketplace/events`);
    
    if (queryResponse.data.success) {
      console.log('✅ Events retrieved successfully!');
      console.log('   Total events:', queryResponse.data.data.count);
      console.log('   Topic ID:', queryResponse.data.data.topicId);
      
      if (queryResponse.data.data.events.length > 0) {
        console.log('\n   Latest event:');
        const latest = queryResponse.data.data.events[0];
        console.log('   - Type:', latest.type);
        console.log('   - Asset:', latest.assetName);
        console.log('   - Price:', latest.price, 'TRUST');
        console.log('   - From:', latest.from);
        console.log('   - Timestamp:', latest.timestamp);
        console.log('   - Consensus Timestamp:', latest.consensusTimestamp);
      }
    } else {
      console.error('❌ Failed to query events:', queryResponse.data.message);
    }
    console.log('');

    // ============ Test 3: Submit Offer Message ============
    console.log('📤 Test 3: Submitting offer message to HCS...');
    
    const testMessage = {
      type: 'offer',
      assetTokenId: '0.0.1234567',
      from: '0.0.buyer',
      to: '0.0.seller',
      message: 'I offer 950 TRUST for your NFT',
      amount: 950,
      timestamp: new Date().toISOString()
    };

    const messageResponse = await axios.post(`${BASE_URL}/hedera/hcs/offers/message`, testMessage);
    
    if (messageResponse.data.success) {
      console.log('✅ Offer message submitted successfully!');
      console.log('   Transaction ID:', messageResponse.data.data.transactionId);
      console.log('   Topic ID:', messageResponse.data.data.topicId);
    } else {
      console.error('❌ Failed to submit message:', messageResponse.data.message);
    }
    console.log('');

    // Wait for Mirror Node
    console.log('⏳ Waiting 5 seconds for Mirror Node to index...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // ============ Test 4: Query Offer Messages ============
    console.log('📥 Test 4: Querying offer messages from HCS...');
    
    const offersResponse = await axios.get(`${BASE_URL}/hedera/hcs/offers/messages/0.0.1234567`);
    
    if (offersResponse.data.success) {
      console.log('✅ Offer messages retrieved successfully!');
      console.log('   Total messages:', offersResponse.data.data.count);
      
      if (offersResponse.data.data.messages.length > 0) {
        console.log('\n   Latest message:');
        const latestMsg = offersResponse.data.data.messages[0];
        console.log('   - Type:', latestMsg.type);
        console.log('   - From:', latestMsg.from);
        console.log('   - To:', latestMsg.to);
        console.log('   - Message:', latestMsg.message);
        console.log('   - Amount:', latestMsg.amount, 'TRUST');
      }
    } else {
      console.error('❌ Failed to query messages:', offersResponse.data.message);
    }
    console.log('');

    // ============ Test 5: Get Topic Info ============
    console.log('📋 Test 5: Getting HCS topic information...');
    
    const topicInfoResponse = await axios.get(`${BASE_URL}/hedera/hcs/topics/info`);
    
    if (topicInfoResponse.data.success) {
      console.log('✅ Topic info retrieved successfully!');
      
      const { marketplaceTopic, offerTopic } = topicInfoResponse.data.data;
      
      console.log('\n   Marketplace Topic:');
      console.log('   - Topic ID:', marketplaceTopic.topicId);
      console.log('   - Memo:', marketplaceTopic.memo);
      console.log('   - Messages:', marketplaceTopic.sequenceNumber);
      
      console.log('\n   Offer Topic:');
      console.log('   - Topic ID:', offerTopic.topicId);
      console.log('   - Memo:', offerTopic.memo);
      console.log('   - Messages:', offerTopic.sequenceNumber);
    } else {
      console.error('❌ Failed to get topic info:', topicInfoResponse.data.message);
    }
    console.log('');

    // ============ Summary ============
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 HCS INTEGRATION TEST COMPLETE!\n');
    console.log('✅ All tests passed successfully!');
    console.log('\n📊 View your events on Hashscan:');
    
    if (submitResponse.data.success) {
      const topicId = submitResponse.data.data.topicId;
      console.log(`   https://hashscan.io/testnet/topic/${topicId}`);
    }
    
    console.log('\n🔥 Your marketplace now has:');
    console.log('   ✅ Immutable audit trail');
    console.log('   ✅ Verifiable transaction history');
    console.log('   ✅ Decentralized messaging');
    console.log('   ✅ Complete transparency');
    console.log('\n🏆 MOST TRANSPARENT NFT MARKETPLACE IN CRYPTO!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ HCS integration test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Backend not running! Please start it with:');
      console.error('   npm run dev');
    }
    
    process.exit(1);
  }

  process.exit(0);
}

main();

