const fs = require('fs');
const path = require('path');

/**
 * Script to sync contract addresses from latest deployment to frontend and backend .env files
 */

async function main() {
  console.log('🔄 === SYNCING CONTRACT ADDRESSES ===\n');

  // Read latest deployment
  const deploymentPath = path.join(__dirname, '../deployments/mantle-sepolia-latest.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  console.log('📋 Latest Deployment:', deployment.timestamp);
  console.log('   Network:', deployment.network);
  console.log('   Chain ID:', deployment.chainId);
  console.log('   Deployer:', deployment.deployer);
  console.log('\n📦 Contracts:');
  Object.entries(deployment.contracts).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`);
  });
  console.log('');

  // Check if AMCManager exists (it might not be in the main deployment)
  if (!deployment.contracts.AMCManager) {
    console.log('⚠️  AMCManager not found in latest deployment file.');
    console.log('   You may need to deploy it separately or check other deployment files.\n');
  }

  // Frontend environment variables mapping
  const frontendEnvMap = {
    TrustToken: 'VITE_TRUST_TOKEN_ADDRESS',
    AssetNFT: 'VITE_ASSET_NFT_ADDRESS',
    CoreAssetFactory: 'VITE_CORE_ASSET_FACTORY_ADDRESS',
    TRUSTAssetFactory: 'VITE_TRUST_ASSET_FACTORY_ADDRESS',
    PoolManager: 'VITE_POOL_MANAGER_ADDRESS',
    VerificationRegistry: 'VITE_VERIFICATION_REGISTRY_ADDRESS',
    TRUSTMarketplace: 'VITE_TRUST_MARKETPLACE_ADDRESS',
    TRUSTFaucet: 'VITE_TRUST_FAUCET_ADDRESS',
    TrustTokenExchange: 'VITE_TRUST_TOKEN_EXCHANGE_ADDRESS',
    AMCManager: 'VITE_AMC_MANAGER_ADDRESS'
  };

  // Backend environment variables mapping
  const backendEnvMap = {
    TrustToken: 'TRUST_TOKEN_ADDRESS',
    AssetNFT: 'ASSET_NFT_ADDRESS',
    CoreAssetFactory: 'CORE_ASSET_FACTORY_ADDRESS',
    TRUSTAssetFactory: 'TRUST_ASSET_FACTORY_ADDRESS',
    PoolManager: 'POOL_MANAGER_ADDRESS',
    VerificationRegistry: 'VERIFICATION_REGISTRY_ADDRESS',
    TRUSTMarketplace: 'TRUST_MARKETPLACE_ADDRESS',
    TRUSTFaucet: 'TRUST_FAUCET_ADDRESS',
    TrustTokenExchange: 'TRUST_TOKEN_EXCHANGE_ADDRESS',
    AMCManager: 'AMC_MANAGER_ADDRESS'
  };

  // Generate frontend .env content
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📝 FRONTEND .env FILE CONTENT');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const frontendEnvLines = [];
  frontendEnvLines.push('# Contract Addresses - Auto-generated from latest deployment');
  frontendEnvLines.push(`# Last updated: ${new Date().toISOString()}`);
  frontendEnvLines.push(`# Deployment: ${deployment.timestamp}`);
  frontendEnvLines.push('');
  
  Object.entries(frontendEnvMap).forEach(([contractName, envVar]) => {
    const address = deployment.contracts[contractName];
    if (address) {
      frontendEnvLines.push(`${envVar}=${address}`);
    } else {
      frontendEnvLines.push(`# ${envVar}=<NOT_IN_DEPLOYMENT>`);
    }
  });

  console.log(frontendEnvLines.join('\n'));
  console.log('');

  // Generate backend .env content
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📝 BACKEND .env FILE CONTENT');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const backendEnvLines = [];
  backendEnvLines.push('# Contract Addresses - Auto-generated from latest deployment');
  backendEnvLines.push(`# Last updated: ${new Date().toISOString()}`);
  backendEnvLines.push(`# Deployment: ${deployment.timestamp}`);
  backendEnvLines.push('');
  
  Object.entries(backendEnvMap).forEach(([contractName, envVar]) => {
    const address = deployment.contracts[contractName];
    if (address) {
      backendEnvLines.push(`${envVar}=${address}`);
    } else {
      backendEnvLines.push(`# ${envVar}=<NOT_IN_DEPLOYMENT>`);
    }
  });

  console.log(backendEnvLines.join('\n'));
  console.log('');

  // Check for missing contracts
  const missingContracts = Object.keys(frontendEnvMap).filter(
    name => !deployment.contracts[name]
  );

  if (missingContracts.length > 0) {
    console.log('⚠️  WARNING: Missing contracts in deployment:');
    missingContracts.forEach(name => {
      console.log(`   - ${name} (needed for ${frontendEnvMap[name]})`);
    });
    console.log('');
    console.log('   These contracts may need to be deployed separately.');
    console.log('   Check:');
    console.log('   - scripts/deploy-amc-manager-mantle.js (for AMCManager)');
    console.log('   - Other deployment scripts');
    console.log('');
  }

  // Save to files (optional - will create .env.sync files)
  const frontendEnvPath = path.join(__dirname, '../../trustbridge-frontend/.env.sync');
  const backendEnvPath = path.join(__dirname, '../../.env.sync');

  try {
    fs.writeFileSync(frontendEnvPath, frontendEnvLines.join('\n') + '\n', 'utf8');
    console.log(`✅ Frontend addresses saved to: ${frontendEnvPath}`);
  } catch (error) {
    console.log(`⚠️  Could not write frontend .env.sync: ${error.message}`);
  }

  try {
    fs.writeFileSync(backendEnvPath, backendEnvLines.join('\n') + '\n', 'utf8');
    console.log(`✅ Backend addresses saved to: ${backendEnvPath}`);
  } catch (error) {
    console.log(`⚠️  Could not write backend .env.sync: ${error.message}`);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 NEXT STEPS:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('1. Copy the addresses above to your .env files:');
  console.log('   - Frontend: trustbridge-frontend/.env');
  console.log('   - Backend: trustbridge-backend/.env');
  console.log('');
  console.log('2. If AMCManager is missing, deploy it:');
  console.log('   cd trustbridge-backend/contracts');
  console.log('   npx hardhat run scripts/deploy-amc-manager-mantle.js --network mantle_testnet');
  console.log('');
  console.log('3. Restart your frontend and backend servers after updating .env files.');
  console.log('');
}

main()
  .then(() => {
    console.log('✅ Sync complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

