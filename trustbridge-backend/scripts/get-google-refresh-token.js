const { google } = require('googleapis');
const readline = require('readline');

// Replace with your actual credentials from Google Cloud Console
const CLIENT_ID = 'your-google-client-id';
const CLIENT_SECRET = 'your-google-client-secret';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Scopes for Google Drive and other APIs
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/vision',
  'https://www.googleapis.com/auth/geocoding'
];

async function getRefreshToken() {
  try {
    // Generate the URL for authorization
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('🔗 Authorize this app by visiting this url:', authUrl);
    console.log('\n📋 After authorization, you will be redirected to a URL like:');
    console.log('http://localhost:3000/oauth2callback?code=4/0AX4XfWh...');
    console.log('\n📝 Copy the "code" parameter from the URL and paste it below:');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Enter the authorization code: ', async (code) => {
      try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        console.log('\n✅ Success! Your tokens:');
        console.log('Access Token:', tokens.access_token);
        console.log('Refresh Token:', tokens.refresh_token);
        console.log('\n📝 Add these to your .env file:');
        console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log(`GOOGLE_DRIVE_ACCESS_TOKEN=${tokens.access_token}`);

        // Test the connection
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        const response = await drive.files.list({
          pageSize: 1,
          fields: 'files(id, name)',
        });

        console.log('\n🧪 Testing Google Drive connection...');
        console.log('✅ Connected successfully!');
        console.log('📁 Found', response.data.files.length, 'files in your Drive');

        rl.close();
      } catch (error) {
        console.error('❌ Error getting tokens:', error.message);
        rl.close();
      }
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Instructions
console.log('🚀 Google Drive API Setup');
console.log('========================');
console.log('1. Go to Google Cloud Console: https://console.cloud.google.com');
console.log('2. Create a new project or select existing one');
console.log('3. Enable Google Drive API');
console.log('4. Create OAuth 2.0 credentials');
console.log('5. Add http://localhost:3000/oauth2callback as redirect URI');
console.log('6. Download the JSON file and update CLIENT_ID and CLIENT_SECRET above');
console.log('7. Run this script: node scripts/get-google-refresh-token.js');
console.log('');

getRefreshToken();
