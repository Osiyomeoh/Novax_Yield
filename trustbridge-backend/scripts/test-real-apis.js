#!/usr/bin/env node

/**
 * TrustBridge Real APIs Test Script
 * 
 * This script tests all real API integrations to ensure they're working
 * Run with: node scripts/test-real-apis.js
 */

const axios = require('axios');
require('dotenv').config();

const API_TESTS = [
  {
    name: 'Google Vision API (OCR)',
    test: async () => {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_API_KEY}`,
        {
          requests: [{
            image: {
              content: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64')
            },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
          }]
        }
      );
      return response.status === 200;
    }
  },
  {
    name: 'Google Geocoding API (GPS)',
    test: async () => {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=6.5244,3.3792&key=${process.env.GOOGLE_API_KEY}`
      );
      return response.status === 200 && response.data.results.length > 0;
    }
  },
  {
    name: 'OpenWeatherMap API (Weather)',
    test: async () => {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=6.5244&lon=3.3792&appid=${process.env.OPENWEATHER_API_KEY}`
      );
      return response.status === 200 && response.data.main;
    }
  },
  {
    name: 'Alpha Vantage API (Market Data)',
    test: async () => {
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
      );
      return response.status === 200 && response.data['Global Quote'];
    }
  },
  {
    name: 'SendGrid API (Email)',
    test: async () => {
      const response = await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [{ to: [{ email: 'test@example.com' }] }],
          from: { email: process.env.SENDGRID_FROM_EMAIL },
          subject: 'Test Email',
          content: [{ type: 'text/plain', value: 'This is a test email' }]
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.status === 202;
    }
  },
  {
    name: 'Africa\'s Talking API (SMS)',
    test: async () => {
      const response = await axios.post(
        'https://api.africastalking.com/version1/messaging',
        {
          username: process.env.AT_USERNAME,
          to: '+2348031234567',
          message: 'Test SMS from TrustBridge',
          from: process.env.AT_SENDER_ID
        },
        {
          headers: {
            'apiKey': process.env.AT_API_KEY,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      return response.status === 201;
    }
  },
  {
    name: 'Stripe API (Payments)',
    test: async () => {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 1000,
        currency: 'usd',
        metadata: { test: 'true' }
      });
      return paymentIntent.id && paymentIntent.status === 'requires_payment_method';
    }
  },
  {
    name: 'MongoDB Atlas (Database)',
    test: async () => {
      const mongoose = require('mongoose');
      await mongoose.connect(process.env.MONGODB_URI);
      const isConnected = mongoose.connection.readyState === 1;
      await mongoose.disconnect();
      return isConnected;
    }
  }
];

async function testAPI(test) {
  try {
    console.log(`Testing ${test.name}...`);
    const result = await test.test();
    return { name: test.name, status: result ? '✅ PASS' : '❌ FAIL', error: null };
  } catch (error) {
    return { name: test.name, status: '❌ ERROR', error: error.message };
  }
}

async function main() {
  console.log('🧪 TrustBridge Real APIs Test\n');
  console.log('Testing all API integrations...\n');

  const results = [];
  
  for (const test of API_TESTS) {
    const result = await testAPI(test);
    results.push(result);
    console.log(`${result.status} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}\n`);
    }
  }

  console.log('\n📊 Test Summary:');
  const passed = results.filter(r => r.status.includes('✅')).length;
  const failed = results.filter(r => r.status.includes('❌')).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / results.length) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All APIs are working! Your beta setup is ready.');
  } else {
    console.log('\n⚠️  Some APIs failed. Please check your configuration.');
    console.log('\nFailed APIs:');
    results.filter(r => r.status.includes('❌')).forEach(r => {
      console.log(`- ${r.name}: ${r.error || 'Unknown error'}`);
    });
  }

  console.log('\n🚀 Next steps:');
  console.log('1. Fix any failed API configurations');
  console.log('2. Start the server: npm run start:dev');
  console.log('3. Test the complete user flow');
  console.log('4. Deploy to production');
}

main().catch(console.error);
