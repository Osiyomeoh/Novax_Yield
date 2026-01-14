const hre = require('hardhat');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

/**
 * Script to verify all deployed contracts on Mantle Sepolia
 * 
 * Usage:
 *   npx hardhat run scripts/verify-all-contracts.js --network mantle_testnet
 * 
 * Prerequisites:
 *   1. Contracts must be deployed
 *   2. Contract addresses must be in deployments/mantle-sepolia-latest.json or provided
 * 
 * Note: Mantle Sepolia uses Blockscout explorer. Verification may require API key
 * or can be done manually through the explorer UI.
 */

async function main() {
  console.log('🔍 === VERIFYING ALL DEPLOYED CONTRACTS ===\n');

  const network = hre.network.name;
  console.log(`📡 Network: ${network}`);
  console.log('');

  // Contract addresses - try to load from deployment file first, then fallback to env
  let contracts = {};
  const fs = require('fs');
  const path = require('path');
  const deploymentFile = path.join(__dirname, '../deployments/mantle-sepolia-latest.json');
  
  if (fs.existsSync(deploymentFile)) {
    console.log('📋 Loading contract addresses from deployment file...');
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    contracts = deployment.contracts || {};
    console.log(`   Found ${Object.keys(contracts).length} contracts in deployment file\n`);
  } else {
    console.log('⚠️  Deployment file not found. Using environment variables...\n');
    // Fallback to environment variables
    contracts = {
      TrustToken: process.env.TRUST_TOKEN_ADDRESS,
      AssetNFT: process.env.ASSET_NFT_ADDRESS,
      CoreAssetFactory: process.env.CORE_ASSET_FACTORY_ADDRESS,
      VerificationRegistry: process.env.VERIFICATION_REGISTRY_ADDRESS,
      AMCManager: process.env.AMC_MANAGER_ADDRESS || process.env.VITE_AMC_MANAGER_ADDRESS,
      PoolManager: process.env.POOL_MANAGER_ADDRESS,
      TRUSTMarketplace: process.env.TRUST_MARKETPLACE_ADDRESS,
      TRUSTFaucet: process.env.TRUST_FAUCET_ADDRESS
    };
    // Remove undefined entries
    Object.keys(contracts).forEach(key => {
      if (!contracts[key]) delete contracts[key];
    });
  }

  if (Object.keys(contracts).length === 0) {
    console.error('❌ No contract addresses found!');
    console.error('   Please ensure contracts are deployed and addresses are available.');
    process.exit(1);
  }

  console.log('📦 Contracts to verify:');
  Object.entries(contracts).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`);
  });
  console.log('');

  // Contract constructor arguments mapping
  // These must match the arguments used during deployment
  const constructorArgs = {
    TrustToken: [], // No constructor args
    AssetNFT: [], // No constructor args
    CoreAssetFactory: [
      contracts.TrustToken, // trustToken address
      contracts.AssetNFT    // assetNFT address
    ],
    VerificationRegistry: [], // No constructor args
    AMCManager: [
      contracts.CoreAssetFactory // assetFactory address
    ],
    PoolManager: [
      contracts.TrustToken // trustToken address
    ],
    TRUSTMarketplace: [
      contracts.TrustToken, // trustToken address
      contracts.AssetNFT    // assetNFT address
    ],
    TRUSTFaucet: [
      contracts.TrustToken // trustToken address
    ]
  };

  // Verify each contract
  const results = {
    verified: [],
    failed: [],
    skipped: []
  };

  for (const [contractName, contractAddress] of Object.entries(contracts)) {
    if (!contractAddress) {
      console.log(`⚠️  Skipping ${contractName}: No address provided`);
      results.skipped.push(contractName);
      continue;
    }

    console.log(`\n🔍 Verifying ${contractName}...`);
    console.log(`   Address: ${contractAddress}`);
    
    const args = constructorArgs[contractName] || [];
    if (args.length > 0) {
      console.log(`   Constructor args: ${args.join(', ')}`);
    }

    try {
      await hre.run('verify:verify', {
        address: contractAddress,
        constructorArguments: args,
        contract: `contracts/contracts/${contractName}.sol:${contractName}` // Path to contract
      });
      
      console.log(`✅ ${contractName} verified successfully!`);
      results.verified.push(contractName);
      
      // Add explorer link
      const explorerUrl = network === 'mantle_testnet' 
        ? `https://explorer.sepolia.mantle.xyz/address/${contractAddress}`
        : `https://explorer.mantle.xyz/address/${contractAddress}`;
      console.log(`   Explorer: ${explorerUrl}`);
      
    } catch (error) {
      if (error.message.includes('Already Verified')) {
        console.log(`✅ ${contractName} already verified`);
        results.verified.push(contractName);
      } else if (error.message.includes('Contract source code already verified')) {
        console.log(`✅ ${contractName} already verified`);
        results.verified.push(contractName);
      } else {
        console.error(`❌ Failed to verify ${contractName}:`);
        console.error(`   ${error.message}`);
        results.failed.push({ name: contractName, error: error.message });
      }
    }
    
    // Small delay between verifications
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Verified: ${results.verified.length}`);
  results.verified.forEach(name => console.log(`   - ${name}`));
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(({ name, error }) => {
      console.log(`   - ${name}: ${error.substring(0, 100)}...`);
    });
  }
  
  if (results.skipped.length > 0) {
    console.log(`\n⚠️  Skipped: ${results.skipped.length}`);
    results.skipped.forEach(name => console.log(`   - ${name}`));
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (results.failed.length > 0) {
    console.log('💡 Tips for failed verifications:');
    console.log('   1. Check that constructor arguments are correct');
    console.log('   2. Ensure contract source code matches deployed bytecode');
    console.log('   3. Try verifying manually on the explorer');
    console.log('   4. Check network and API key configuration\n');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

