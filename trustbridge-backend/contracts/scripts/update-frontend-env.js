const fs = require('fs');
const path = require('path');

/**
 * Script to update frontend .env file with latest contract addresses
 */

async function main() {
  console.log('🔄 === UPDATING FRONTEND .ENV FILE ===\n');

  // Read latest deployment
  const deploymentPath = path.join(__dirname, '../deployments/mantle-sepolia-latest.json');
  
  if (!fs.existsSync(deploymentPath)) {
    console.error('❌ Latest deployment file not found!');
    console.error(`   Expected: ${deploymentPath}`);
    console.error('\n   Please run deployment first:');
    console.error('   npx hardhat run scripts/deploy-clean-mantle.js --network mantle_testnet\n');
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  console.log('📋 Latest Deployment:', deployment.timestamp);
  console.log('   Network:', deployment.network);
  console.log('   Chain ID:', deployment.chainId);
  console.log('   Deployer:', deployment.deployer);
  console.log('');

  // Contract addresses from deployment
  const contracts = deployment.contracts;
  
  if (!contracts || Object.keys(contracts).length === 0) {
    console.error('❌ No contracts found in deployment file!');
    process.exit(1);
  }

  console.log('📦 Contracts to update:');
  Object.entries(contracts).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`);
  });
  console.log('');

  // Frontend environment variables mapping (using _CONTRACT_ADDRESS format for compatibility)
  const envMapping = {
    TrustToken: 'VITE_TRUST_TOKEN_CONTRACT_ADDRESS',
    AssetNFT: 'VITE_ASSET_NFT_CONTRACT_ADDRESS',
    CoreAssetFactory: 'VITE_CORE_ASSET_FACTORY_CONTRACT_ADDRESS',
    VerificationRegistry: 'VITE_VERIFICATION_REGISTRY_CONTRACT_ADDRESS',
    AMCManager: 'VITE_AMC_MANAGER_ADDRESS',
    PoolManager: 'VITE_POOL_MANAGER_CONTRACT_ADDRESS',
    TRUSTMarketplace: 'VITE_TRUST_MARKETPLACE_CONTRACT_ADDRESS',
    TRUSTFaucet: 'VITE_TRUST_FAUCET_CONTRACT_ADDRESS'
  };

  // Generate frontend .env content
  const frontendEnvLines = [];
  frontendEnvLines.push('# Contract Addresses - Updated from latest deployment');
  frontendEnvLines.push(`# Last updated: ${new Date().toISOString()}`);
  frontendEnvLines.push(`# Deployment: ${deployment.timestamp}`);
  frontendEnvLines.push(`# Network: ${deployment.network} (Chain ID: ${deployment.chainId})`);
  frontendEnvLines.push('');
  
  Object.entries(envMapping).forEach(([contractName, envVar]) => {
    const address = contracts[contractName];
    if (address) {
      frontendEnvLines.push(`${envVar}=${address}`);
    } else {
      frontendEnvLines.push(`# ${envVar}=<NOT_DEPLOYED_YET>`);
    }
  });

  // Also add network configuration
  frontendEnvLines.push('');
  frontendEnvLines.push('# Network Configuration');
  frontendEnvLines.push('VITE_MANTLE_TESTNET_RPC_URL=https://rpc.sepolia.mantle.xyz');
  frontendEnvLines.push('VITE_MANTLE_CHAIN_ID=5001');
  frontendEnvLines.push('VITE_MANTLE_NETWORK=testnet');

  const envContent = frontendEnvLines.join('\n') + '\n';

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📝 FRONTEND .env FILE CONTENT');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(envContent);

  // Try to write to frontend .env file (check both possible paths)
  const possibleFrontendPaths = [
    path.join(__dirname, '../../../trustbridge-frontend/.env'),
    path.join(__dirname, '../../trustbridge-frontend/.env'),
    path.join(__dirname, '../../../../trustbridge-frontend/.env')
  ];
  
  let frontendEnvPath = null;
  for (const possiblePath of possibleFrontendPaths) {
    const dir = path.dirname(possiblePath);
    if (fs.existsSync(dir)) {
      frontendEnvPath = possiblePath;
      break;
    }
  }
  
  if (!frontendEnvPath) {
    console.log('⚠️  Frontend directory not found. Showing addresses for manual copy:\n');
    console.log(envContent);
    process.exit(0);
  }

  try {
    // Check if .env exists, if not create it
    if (!fs.existsSync(frontendEnvPath)) {
      console.log(`⚠️  Frontend .env file not found at: ${frontendEnvPath}`);
      console.log('   Creating new .env file...\n');
    }

    // Backup existing .env if it exists
    if (fs.existsSync(frontendEnvPath)) {
      const backupPath = `${frontendEnvPath}.backup.${Date.now()}`;
      fs.copyFileSync(frontendEnvPath, backupPath);
      console.log(`✅ Backed up existing .env to: ${backupPath}\n`);
    }

    // Read existing .env to preserve other variables
    let existingEnv = {};
    if (fs.existsSync(frontendEnvPath)) {
      const existingContent = fs.readFileSync(frontendEnvPath, 'utf8');
      existingContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=');
          if (key && value) {
            existingEnv[key.trim()] = value.trim();
          }
        }
      });
    }

    // Merge with new contract addresses
    Object.entries(envMapping).forEach(([contractName, envVar]) => {
      const address = contracts[contractName];
      if (address) {
        existingEnv[envVar] = address;
      }
    });

    // Update network config
    existingEnv['VITE_MANTLE_TESTNET_RPC_URL'] = 'https://rpc.sepolia.mantle.xyz';
    existingEnv['VITE_MANTLE_CHAIN_ID'] = '5001';
    existingEnv['VITE_MANTLE_NETWORK'] = 'testnet';

    // Write merged .env file
    const mergedLines = ['# Contract Addresses - Auto-generated from deployment'];
    mergedLines.push(`# Last updated: ${new Date().toISOString()}`);
    mergedLines.push(`# Deployment: ${deployment.timestamp}`);
    mergedLines.push('');
    mergedLines.push('# Contract Addresses');
    Object.entries(envMapping).forEach(([contractName, envVar]) => {
      const address = contracts[contractName];
      if (address) {
        mergedLines.push(`${envVar}=${address}`);
      } else {
        mergedLines.push(`# ${envVar}=<NOT_DEPLOYED_YET>`);
      }
    });
    mergedLines.push('');
    mergedLines.push('# Network Configuration');
    mergedLines.push('VITE_MANTLE_TESTNET_RPC_URL=https://rpc.sepolia.mantle.xyz');
    mergedLines.push('VITE_MANTLE_CHAIN_ID=5001');
    mergedLines.push('VITE_MANTLE_NETWORK=testnet');
    
    // Add any other existing env vars (non-VITE_ contract addresses)
    const otherVars = Object.entries(existingEnv).filter(([key]) => {
      return !envMapping[Object.keys(envMapping).find(c => envMapping[c] === key)];
    });
    if (otherVars.length > 0) {
      mergedLines.push('');
      mergedLines.push('# Other Configuration');
      otherVars.forEach(([key, value]) => {
        if (!key.startsWith('VITE_MANTLE_')) {
          mergedLines.push(`${key}=${value}`);
        }
      });
    }

    fs.writeFileSync(frontendEnvPath, mergedLines.join('\n') + '\n', 'utf8');
    console.log(`✅ Frontend .env file updated: ${frontendEnvPath}\n`);

  } catch (error) {
    console.error(`⚠️  Could not write to frontend .env: ${error.message}`);
    console.error('\n   Please manually copy the addresses above to your frontend .env file.\n');
  }

  // Show summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ UPDATE COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📋 Next steps:');
  console.log('   1. Restart your frontend development server');
  console.log('   2. Verify contract addresses in the frontend\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

