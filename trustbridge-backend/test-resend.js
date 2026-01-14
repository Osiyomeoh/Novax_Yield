require('dotenv').config();
const { Resend } = require('resend');

async function testResend() {
  console.log('🔍 Testing Resend Email Service...\n');

  const resendApiKey = process.env.RESEND_API_KEY;
  // Use tbafrica.xyz domain (must be verified in Resend dashboard)
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@tbafrica.xyz';
  const testEmail = process.env.TEST_EMAIL || 'devcasta1@gmail.com';

  console.log('Configuration:');
  console.log(`  Resend API Key: ${resendApiKey ? resendApiKey.substring(0, 10) + '...' + resendApiKey.substring(resendApiKey.length - 4) : 'NOT_SET'}`);
  console.log(`  From Email: ${fromEmail}`);
  console.log(`  Test Email: ${testEmail}`);
  console.log('');

  if (!resendApiKey || resendApiKey === 'your-resend-api-key') {
    console.error('❌ RESEND_API_KEY not set in environment variables');
    console.log('\nPlease set:');
    console.log('  RESEND_API_KEY=your-resend-api-key');
    console.log('  RESEND_FROM_EMAIL=noreply@yourdomain.com (optional)');
    console.log('  TEST_EMAIL=your-email@example.com (optional)');
    return;
  }

  try {
    // Test 1: Initialize Resend client
    console.log('📧 Test 1: Initializing Resend client...');
    const resend = new Resend(resendApiKey);
    console.log('✅ Resend client initialized successfully\n');

    // Test 2: Send test email
    console.log('📧 Test 2: Sending test email...');
    const emailData = {
      from: fromEmail,
      to: testEmail,
      subject: 'TrustBridge Resend Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #059669;">TrustBridge Email Test</h1>
          <p>This is a test email from TrustBridge to verify Resend integration is working correctly.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #047857; margin-top: 0;">Test Details</h2>
            <p><strong>Service:</strong> Resend API</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><strong>Status:</strong> ✅ Working</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            If you received this email, Resend is successfully configured and working!
          </p>
        </div>
      `,
      text: `
TrustBridge Email Test

This is a test email from TrustBridge to verify Resend integration is working correctly.

Test Details:
- Service: Resend API
- Timestamp: ${new Date().toISOString()}
- Status: ✅ Working

If you received this email, Resend is successfully configured and working!
      `,
    };

    const startTime = Date.now();
    const { data, error } = await resend.emails.send(emailData);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    if (error) {
      console.error('❌ Failed to send test email:');
      console.error(`   Error: ${JSON.stringify(error, null, 2)}`);
      return;
    }

    console.log('✅ Test email sent successfully!');
    console.log(`   Email ID: ${data?.id || 'N/A'}`);
    console.log(`   Response time: ${duration} seconds`);
    console.log(`   To: ${testEmail}`);
    console.log(`   From: ${fromEmail}`);
    console.log('\n📬 Check your inbox (and spam folder) for the test email!');

  } catch (error) {
    console.error('❌ Resend test failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    
    if (error.response) {
      console.error(`   Response: ${JSON.stringify(error.response.data || error.response, null, 2)}`);
    }
  }

  console.log('\n✅ Test completed!');
}

// Run the test
testResend().catch(console.error);

