require('dotenv').config();
const axios = require('axios');

/**
 * Query ALL Assets from Hedera
 * Shows all NFTs created, regardless of listing status
 */

async function main() {
  console.log('🔍 Querying ALL Assets from Hedera Network...\n');

  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com';

  try {
    // Get all tokens owned by the operator account
    console.log(`📋 Fetching all tokens for account ${accountId}...\n`);
    
    const tokensResponse = await axios.get(
      `${mirrorNodeUrl}/api/v1/accounts/${accountId}/tokens?limit=100`
    );

    const tokens = tokensResponse.data.tokens || [];
    console.log(`Found ${tokens.length} tokens associated with account\n`);

    // Filter for NFTs (decimals = 0)
    const nfts = tokens.filter(t => t.decimals === '0');
    console.log(`Found ${nfts.length} NFTs\n`);

    // Get details for each NFT
    for (const nft of nfts) {
      const tokenId = nft.token_id;
      
      console.log(`═══════════════════════════════════════════════════════════`);
      console.log(`Token ID: ${tokenId}`);
      console.log(`Balance: ${nft.balance}`);
      
      try {
        // Get token details
        const tokenInfo = await axios.get(`${mirrorNodeUrl}/api/v1/tokens/${tokenId}`);
        console.log(`Name: ${tokenInfo.data.name}`);
        console.log(`Symbol: ${tokenInfo.data.symbol}`);
        console.log(`Type: ${tokenInfo.data.type}`);
        console.log(`Total Supply: ${tokenInfo.data.total_supply}`);
        
        // Get NFT serials
        if (tokenInfo.data.type === 'NON_FUNGIBLE_UNIQUE') {
          const nftsResponse = await axios.get(`${mirrorNodeUrl}/api/v1/tokens/${tokenId}/nfts?account.id=${accountId}`);
          const ownedNfts = nftsResponse.data.nfts || [];
          
          console.log(`NFTs Owned: ${ownedNfts.length}`);
          
          for (const nftData of ownedNfts) {
            console.log(`\n  Serial #${nftData.serial_number}:`);
            
            // Try to decode metadata
            if (nftData.metadata) {
              try {
                const metadataString = Buffer.from(nftData.metadata, 'base64').toString('utf-8');
                const metadata = JSON.parse(metadataString);
                console.log(`    Name: ${metadata.name || 'N/A'}`);
                console.log(`    Description: ${metadata.description || 'N/A'}`);
                console.log(`    Price: ${metadata.price || 'N/A'} ${metadata.currency || 'TRUST'}`);
              } catch {
                console.log(`    Metadata: ${Buffer.from(nftData.metadata, 'base64').toString('utf-8').substring(0, 50)}...`);
              }
            }
            
            console.log(`    Account: ${nftData.account_id}`);
            console.log(`    Created: ${nftData.created_timestamp}`);
          }
        }
      } catch (error) {
        console.log(`  ⚠️ Could not fetch details: ${error.message}`);
      }
      
      console.log('');
    }

    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`\n📊 SUMMARY:`);
    console.log(`Total Tokens: ${tokens.length}`);
    console.log(`Total NFTs: ${nfts.length}`);
    console.log(`\n✅ All NFTs owned by ${accountId} are shown above`);
    console.log(`\nTo see them in marketplace:`);
    console.log(`1. These NFTs need to be listed on marketplace contract`);
    console.log(`2. Use Profile page → List for Sale`);
    console.log(`3. Or connect with different account to list\n`);

  } catch (error) {
    console.error('❌ Error querying assets:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }

  process.exit(0);
}

main();

