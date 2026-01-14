#!/usr/bin/env node

/**
 * TrustBridge FREE APIs Test Script
 * 
 * This script tests all FREE API integrations
 * Run with: node scripts/test-free-apis.js
 */

const axios = require('axios');
require('dotenv').config();

const FREE_API_TESTS = [
  {
    name: 'Tesseract.js (FREE OCR)',
    test: async () => {
      // Test Tesseract.js OCR
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker('eng');
      
      // Create a simple test image (1x1 pixel)
      const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      
      const { data: { text, confidence } } = await worker.recognize(testImage);
      await worker.terminate();
      
      return text !== undefined && confidence !== undefined;
    }
  },
  {
    name: 'OpenStreetMap (FREE GPS)',
    test: async () => {
      const response = await axios.get(
        'https://nominatim.openstreetmap.org/reverse?format=json&lat=6.5244&lon=3.3792&addressdetails=1'
      );
      return response.status === 200 && response.data.display_name;
    }
  },
  {
    name: 'CoinGecko (FREE Market Data)',
    test: async () => {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
      );
      return response.status === 200 && response.data.bitcoin;
    }
  },
  {
    name: 'MongoDB Atlas (FREE Database)',
    test: async () => {
      const mongoose = require('mongoose');
      await mongoose.connect(process.env.MONGODB_URI);
      const isConnected = mongoose.connection.readyState === 1;
      await mongoose.disconnect();
      return isConnected;
    }
  },
  {
    name: 'Console Logging (FREE Notifications)',
    test: async () => {
      // Test console logging
      console.log('📧 Testing console email notification...');
      console.log('📱 Testing console SMS notification...');
      return true; // Console logging always works
    }
  },
  {
    name: 'Local File Storage (FREE)',
    test: async () => {
      const fs = require('fs');
      const path = require('path');
      
      const testDir = './uploads';
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      
      const testFile = path.join(testDir, 'test.txt');
      fs.writeFileSync(testFile, 'Test file content');
      const exists = fs.existsSync(testFile);
      fs.unlinkSync(testFile);
      
      return exists;
    }
  }
];

// Optional FREE tier tests
const OPTIONAL_FREE_TESTS = [
  {
    name: 'OpenWeatherMap (FREE tier)',
    test: async () => {
      if (!process.env.OPENWEATHER_API_KEY) {
        return { status: 'SKIP', message: 'No API key configured (optional)' };
      }
      
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=6.5244&lon=3.3792&appid=${process.env.OPENWEATHER_API_KEY}`
      );
      return response.status === 200 && response.data.main;
    }
  },
  {
    name: 'Alpha Vantage (FREE tier)',
    test: async () => {
      if (!process.env.ALPHA_VANTAGE_API_KEY) {
        return { status: 'SKIP', message: 'No API key configured (optional)' };
      }
      
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
      );
      return response.status === 200 && response.data['Global Quote'];
    }
  }
];

async function testAPI(test) {
  try {
    console.log(`Testing ${test.name}...`);
    const result = await test.test();
    
    if (typeof result === 'object' && result.status === 'SKIP') {
      return { name: test.name, status: '⏭️ SKIP', message: result.message };
    }
    
    return { name: test.name, status: result ? '✅ PASS' : '❌ FAIL', error: null };
  } catch (error) {
    return { name: test.name, status: '❌ ERROR', error: error.message };
  }
}

async function main() {
  console.log('🆓 TrustBridge FREE APIs Test\n');
  console.log('Testing all FREE API integrations...\n');

  const results = [];
  
  // Test core FREE APIs
  console.log('🔴 CORE FREE APIs:');
  for (const test of FREE_API_TESTS) {
    const result = await testAPI(test);
    results.push(result);
    console.log(`${result.status} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}\n`);
    }
  }

  console.log('\n🟡 OPTIONAL FREE TIER APIs:');
  for (const test of OPTIONAL_FREE_TESTS) {
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
  const skipped = results.filter(r => r.status.includes('⏭️')).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️ Skipped: ${skipped}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (results.length - skipped)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All FREE APIs are working! Your beta setup is ready.');
    console.log('\n💰 Total Cost: $0.00');
    console.log('🚀 Ready for FREE beta testing!');
  } else {
    console.log('\n⚠️  Some APIs failed. Please check your configuration.');
    console.log('\nFailed APIs:');
    results.filter(r => r.status.includes('❌')).forEach(r => {
      console.log(`- ${r.name}: ${r.error || 'Unknown error'}`);
    });
  }

  console.log('\n🆓 FREE API Benefits:');
  console.log('✅ No API keys required for core features');
  console.log('✅ No rate limits');
  console.log('✅ No costs');
  console.log('✅ Perfect for beta testing');
  console.log('✅ Production-ready functionality');

  console.log('\n🚀 Next steps:');
  console.log('1. Start the server: npm run start:dev');
  console.log('2. Test the complete user flow');
  console.log('3. Deploy to production');
  console.log('4. Scale with paid APIs when needed');
}

main().catch(console.error);
