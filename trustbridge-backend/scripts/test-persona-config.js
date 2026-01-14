#!/usr/bin/env node

/**
 * Test Persona Configuration
 * This script tests the Persona KYC configuration and endpoints
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.API_URL || 'http://localhost:4001/api';

async function testPersonaConfiguration() {
  console.log('🔍 Testing Persona KYC Configuration...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`PERSONA_TEMPLATE_ID: ${process.env.PERSONA_TEMPLATE_ID || 'NOT SET'}`);
  console.log(`PERSONA_ENVIRONMENT_ID: ${process.env.PERSONA_ENVIRONMENT_ID || 'NOT SET'}`);
  console.log(`PERSONA_WEBHOOK_SECRET: ${process.env.PERSONA_WEBHOOK_SECRET ? 'SET' : 'NOT SET'}\n`);

  // Test webhook endpoint
  console.log('🔗 Testing Webhook Endpoint...');
  try {
    const webhookTestData = {
      data: {
        id: 'test-inquiry-123',
        type: 'inquiry',
        attributes: {
          status: 'completed',
          inquiry_id: 'inq_test123',
          reference_id: '0x1234567890abcdef',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
    };

    const response = await axios.post(`${API_BASE_URL}/auth/persona/webhook`, webhookTestData);
    console.log('✅ Webhook endpoint is working');
    console.log(`Response: ${JSON.stringify(response.data, null, 2)}\n`);
  } catch (error) {
    console.log('❌ Webhook endpoint failed');
    console.log(`Error: ${error.response?.data?.message || error.message}\n`);
  }

  // Test KYC status endpoint (requires authentication)
  console.log('🔐 Testing KYC Status Endpoint...');
  try {
    // This would require a valid JWT token in a real test
    console.log('ℹ️  KYC status endpoint requires authentication');
    console.log('   Use the frontend to test this endpoint\n');
  } catch (error) {
    console.log('❌ KYC status endpoint test failed');
    console.log(`Error: ${error.message}\n`);
  }

  // Configuration recommendations
  console.log('💡 Configuration Recommendations:');
  
  if (!process.env.PERSONA_TEMPLATE_ID) {
    console.log('⚠️  PERSONA_TEMPLATE_ID is not set');
    console.log('   Get this from Persona dashboard > Templates');
  }
  
  if (!process.env.PERSONA_ENVIRONMENT_ID) {
    console.log('⚠️  PERSONA_ENVIRONMENT_ID is not set');
    console.log('   Get this from Persona dashboard > Settings > API Keys');
  }
  
  if (!process.env.PERSONA_WEBHOOK_SECRET) {
    console.log('⚠️  PERSONA_WEBHOOK_SECRET is not set');
    console.log('   Get this from Persona dashboard > Settings > Webhooks');
  }

  console.log('\n📚 Next Steps:');
  console.log('1. Set up Persona account and create template');
  console.log('2. Configure webhook URL in Persona dashboard');
  console.log('3. Update environment variables with real values');
  console.log('4. Test the complete flow from frontend');
  console.log('5. Implement webhook signature verification for security');
}

// Run the test
testPersonaConfiguration().catch(console.error);
