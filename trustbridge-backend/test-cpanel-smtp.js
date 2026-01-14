require('dotenv').config();
const nodemailer = require('nodemailer');

async function testCpanelSMTP() {
  console.log('🔍 Testing cPanel SMTP Connection...\n');

  // You can either use environment variables or hardcode for testing
  const smtpHost = process.env.CPANEL_SMTP_HOST || 'gradell.ng';
  const smtpPort = parseInt(process.env.CPANEL_SMTP_PORT || '465', 10);
  const smtpUser = process.env.CPANEL_SMTP_USER || 'gt@gradell.ng';
  const smtpPassword = process.env.CPANEL_SMTP_PASSWORD || 't1Al3w3D&dg0';
  const fromEmail = process.env.CPANEL_SMTP_FROM_EMAIL || 'gt@gradell.ng';

  console.log('Configuration:');
  console.log(`  SMTP Host: ${smtpHost}`);
  console.log(`  SMTP Port: ${smtpPort} (SSL: ${smtpPort === 465})`);
  console.log(`  SMTP User: ${smtpUser}`);
  console.log(`  SMTP Password: ${smtpPassword ? '***' + smtpPassword.substring(smtpPassword.length - 3) : 'NOT_SET'}`);
  console.log(`  From Email: ${fromEmail}`);
  console.log('');

  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.error('❌ cPanel SMTP credentials not set');
    return;
  }

  // Test 1: Create transporter
  console.log('📧 Test 1: Creating transporter with cPanel SMTP settings...');
  const isSecure = smtpPort === 465;
  
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: isSecure, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
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
      console.log('   1. Firewall blocking SMTP port 465/587');
      console.log('   2. Network restrictions on the hosting platform');
      console.log('   3. Incorrect SMTP host or port');
    } else if (error.code === 'EAUTH') {
      console.log('\n💡 Solution: Authentication failed. Check:');
      console.log('   1. SMTP username (full email address)');
      console.log('   2. SMTP password (email account password)');
      console.log('   3. Email account is active in cPanel');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Solution: Connection refused. Check:');
      console.log('   1. SMTP host is correct (gradell.ng)');
      console.log('   2. Port is correct (465 for SSL)');
      console.log('   3. Internet connectivity');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Solution: Host not found. Check:');
      console.log('   1. SMTP host DNS is correct');
      console.log('   2. Try using mail.gradell.ng or smtp.gradell.ng');
    }
    
    return;
  }

  // Test 3: Try sending a test email
  console.log('\n📧 Test 3: Sending test email...');
  try {
    const testEmail = {
      from: {
        name: 'TrustBridge Test',
        address: fromEmail,
      },
      to: smtpUser, // Send to self
      subject: 'TrustBridge cPanel SMTP Test',
      text: 'This is a test email from TrustBridge to verify cPanel SMTP is working.',
      html: '<p>This is a test email from TrustBridge to verify cPanel SMTP is working.</p>',
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
    console.log(`   To: ${smtpUser}`);
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
  console.log('\n📝 Environment Variables for Render:');
  console.log('   CPANEL_SMTP_HOST=gradell.ng');
  console.log('   CPANEL_SMTP_PORT=465');
  console.log('   CPANEL_SMTP_USER=gt@gradell.ng');
  console.log('   CPANEL_SMTP_PASSWORD=t1Al3w3D&dg0');
  console.log('   CPANEL_SMTP_FROM_EMAIL=gt@gradell.ng');
}

// Run the test
testCpanelSMTP().catch(console.error);

