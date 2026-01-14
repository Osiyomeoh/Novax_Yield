#!/usr/bin/env node

/**
 * Test Didit API Connection
 * This script tests the Didit API connection and webhook setup
 */

const axios = require('axios');
require('dotenv').config();

const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
const DIDIT_WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID;
const DIDIT_WEBHOOK_SECRET = process.env.DIDIT_WEBHOOK_SECRET;

async function testDiditConnection() {
  console.log('🔍 Testing Didit API Connection...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`DIDIT_API_KEY: ${DIDIT_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`DIDIT_WORKFLOW_ID: ${DIDIT_WORKFLOW_ID || 'NOT SET'}`);
  console.log(`DIDIT_WEBHOOK_SECRET: ${DIDIT_WEBHOOK_SECRET ? 'SET' : 'NOT SET'}\n`);

  if (!DIDIT_API_KEY) {
    console.log('❌ DIDIT_API_KEY is not set. Please add it to your .env file.');
    return;
  }

  if (!DIDIT_WORKFLOW_ID) {
    console.log('❌ DIDIT_WORKFLOW_ID is not set. Please add it to your .env file.');
    return;
  }

  // Test API connection by creating a test session
  console.log('🔗 Testing API Connection...');
  try {
    const response = await axios.post('https://verification.didit.me/v2/session/', {
      workflow_id: DIDIT_WORKFLOW_ID,
      vendor_data: JSON.stringify({
        walletAddress: '0x1234567890abcdef',
        email: 'test@example.com',
        name: 'Test User'
      }),
      callback: 'http://localhost:4001/api/auth/didit/callback'
    }, {
      headers: {
        'x-api-key': DIDIT_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ API Connection successful!');
    console.log(`Session ID: ${response.data.session_id}`);
    console.log(`Verification URL: ${response.data.verification_url}\n`);

    // Test webhook endpoint
    console.log('🔗 Testing Webhook Endpoint...');
    try {
      const webhookTestData = {
        session_id: response.data.session_id,
        status: 'completed',
        vendor_data: JSON.stringify({
          walletAddress: '0x1234567890abcdef'
        }),
        workflow_id: DIDIT_WORKFLOW_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create proper webhook signature
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', DIDIT_WEBHOOK_SECRET)
        .update(JSON.stringify(webhookTestData))
        .digest('hex');

      const webhookResponse = await axios.post('http://localhost:4001/api/auth/didit/webhook', webhookTestData, {
        headers: {
          'x-didit-signature': signature,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Webhook endpoint is working!');
      console.log(`Response: ${JSON.stringify(webhookResponse.data, null, 2)}\n`);
    } catch (webhookError) {
      console.log('❌ Webhook endpoint test failed');
      console.log(`Error: ${webhookError.response?.data?.message || webhookError.message}\n`);
    }

  } catch (error) {
    console.log('❌ API Connection failed');
    console.log(`Error: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      console.log(`Details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }

  console.log('📚 Next Steps:');
  console.log('1. Open http://localhost:3001 in your browser');
  console.log('2. Connect your wallet');
  console.log('3. Navigate to dashboard');
  console.log('4. Click "Start KYC" button');
  console.log('5. Complete the Didit verification process');
  console.log('6. Check if webhook updates the user status');
}

// Run the test
testDiditConnection().catch(console.error);
