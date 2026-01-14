require('dotenv').config();
const nodemailer = require('nodemailer');

async function testGmailConnection() {
  console.log('🔍 Testing Gmail SMTP Connection...\n');

  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  console.log('Configuration:');
  console.log(`  GMAIL_USER: ${gmailUser ? gmailUser.substring(0, 3) + '***' : 'NOT_SET'}`);
  console.log(`  GMAIL_APP_PASSWORD: ${gmailPassword ? '***' + gmailPassword.substring(gmailPassword.length - 3) : 'NOT_SET'}`);
  console.log('');

  if (!gmailUser || !gmailPassword) {
    console.error('❌ Gmail credentials not set in environment variables');
    console.log('\nPlease set:');
    console.log('  GMAIL_USER=your-email@gmail.com');
    console.log('  GMAIL_APP_PASSWORD=your-16-char-app-password');
    return;
  }

  // Test 1: Basic configuration with timeouts
  console.log('📧 Test 1: Creating transporter with timeout settings...');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPassword,
    },
    connectionTimeout: 5000, // 5 seconds
    greetingTimeout: 5000,
    socketTimeout: 10000,
    debug: true,
    logger: true,
  });

  // Test 2: Verify connection
  console.log('\n📧 Test 2: Verifying connection...');
  try {
    const verifyResult = await Promise.race([
      transporter.verify(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Verification timeout after 10 seconds')), 10000)
      )
    ]);
    console.log('✅ Connection verified successfully!');
  } catch (error) {
    console.error('❌ Connection verification failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    console.error(`   Command: ${error.command || 'N/A'}`);
    
    if (error.response) {
      console.error(`   Response: ${error.response}`);
    }
    if (error.responseCode) {
      console.error(`   Response Code: ${error.responseCode}`);
    }
    
    // Check for specific error types
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.log('\n💡 Solution: Connection is timing out. This could be due to:');
      console.log('   1. Firewall blocking SMTP port 587/465');
      console.log('   2. Network restrictions on the hosting platform');
      console.log('   3. Gmail blocking the connection from this IP');
    } else if (error.code === 'EAUTH') {
      console.log('\n💡 Solution: Authentication failed. Check:');
      console.log('   1. GMAIL_USER is correct');
      console.log('   2. GMAIL_APP_PASSWORD is a valid App Password (not regular password)');
      console.log('   3. 2-Step Verification is enabled on the Gmail account');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Solution: Connection refused. Check:');
      console.log('   1. Internet connectivity');
      console.log('   2. Firewall settings');
      console.log('   3. Gmail SMTP servers are accessible');
    }
    
    return;
  }

  // Test 3: Try sending a test email
  console.log('\n📧 Test 3: Sending test email...');
  try {
    const testEmail = {
      from: {
        name: 'TrustBridge Test',
        address: gmailUser,
      },
      to: gmailUser, // Send to self
      subject: 'TrustBridge Gmail Test',
      text: 'This is a test email from TrustBridge to verify Gmail SMTP is working.',
      html: '<p>This is a test email from TrustBridge to verify Gmail SMTP is working.</p>',
    };

    const sendResult = await Promise.race([
      transporter.sendMail(testEmail),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Send timeout after 15 seconds')), 15000)
      )
    ]);

    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${sendResult.messageId}`);
    console.log(`   Response: ${sendResult.response}`);
  } catch (error) {
    console.error('❌ Failed to send test email:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    
    if (error.command) {
      console.error(`   Command: ${error.command}`);
    }
    if (error.response) {
      console.error(`   Response: ${error.response}`);
    }
  }

  console.log('\n✅ Test completed!');
}

// Run the test
testGmailConnection().catch(console.error);
