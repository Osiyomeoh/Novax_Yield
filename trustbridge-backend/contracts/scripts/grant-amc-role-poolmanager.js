const { ethers } = require('hardhat');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

/**
 * Grant AMC_ROLE on PoolManager contract
 * 
 * Usage:
 *   npx hardhat run scripts/grant-amc-role-poolmanager.js --network mantle_testnet
 */

async function main() {
  console.log('🔐 === GRANTING AMC_ROLE ON POOLMANAGER ===\n');
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer address:', deployer.address);
  console.log('   Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');
  
  // Load contract addresses
  const fs = require('fs');
  const path = require('path');
  const deploymentFile = path.join(__dirname, '../deployments/mantle-sepolia-latest.json');
  
  let POOL_MANAGER_ADDRESS;
  if (fs.existsSync(deploymentFile)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    POOL_MANAGER_ADDRESS = deployment.contracts.PoolManager;
  } else {
    POOL_MANAGER_ADDRESS = process.env.POOL_MANAGER_ADDRESS || '0x56535279704A7936621b84FFD5e9Cc1eD3c4093a';
  }
  
  // Admin wallet addresses to grant AMC_ROLE
  // Update these with your actual admin/AMC wallet addresses
  const ADMIN_WALLETS = [
    deployer.address, // Deployer (may already have role from constructor)
    // Add more admin wallet addresses here
    // '0x...',
  ];
  
  // Or get from environment variable
  const envAdminWallet = process.env.AMC_ADMIN_WALLET;
  if (envAdminWallet && !ADMIN_WALLETS.includes(envAdminWallet)) {
    ADMIN_WALLETS.push(envAdminWallet);
  }
  
  console.log('📋 Configuration:');
  console.log('   PoolManager:', POOL_MANAGER_ADDRESS);
  console.log('   Admin wallets to grant AMC_ROLE:', ADMIN_WALLETS.length);
  ADMIN_WALLETS.forEach((addr, i) => {
    console.log(`   ${i + 1}. ${addr}`);
  });
  console.log('');
  
  const PoolManager = await ethers.getContractFactory('PoolManager');
  const poolManager = PoolManager.attach(POOL_MANAGER_ADDRESS);
  
  // Get AMC_ROLE hash
  const AMC_ROLE = await poolManager.AMC_ROLE();
  console.log('🔐 AMC_ROLE:', AMC_ROLE);
  
  // Check if deployer has DEFAULT_ADMIN_ROLE
  const DEFAULT_ADMIN_ROLE = await poolManager.DEFAULT_ADMIN_ROLE();
  const hasAdminRole = await poolManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  console.log('   Deployer has DEFAULT_ADMIN_ROLE:', hasAdminRole ? '✅ YES' : '❌ NO');
  console.log('');
  
  if (!hasAdminRole) {
    console.error('❌ Deployer does not have DEFAULT_ADMIN_ROLE');
    console.error('   Cannot grant AMC_ROLE without admin privileges.');
    console.error('   Please use an account with DEFAULT_ADMIN_ROLE to grant AMC_ROLE.');
    process.exit(1);
  }
  
  // Grant AMC_ROLE to each admin wallet
  let grantedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  
  for (const adminWallet of ADMIN_WALLETS) {
    try {
      // Check if already has role
      const hasRole = await poolManager.hasRole(AMC_ROLE, adminWallet);
      if (hasRole) {
        console.log(`✅ ${adminWallet} already has AMC_ROLE`);
        skippedCount++;
        continue;
      }
      
      // Grant role
      console.log(`🔐 Granting AMC_ROLE to ${adminWallet}...`);
      const tx = await poolManager.grantRole(AMC_ROLE, adminWallet);
      await tx.wait();
      console.log(`   ✅ AMC_ROLE granted successfully!`);
      console.log(`   Transaction: ${tx.hash}`);
      grantedCount++;
      
      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Failed to grant AMC_ROLE to ${adminWallet}:`, error.message);
      failedCount++;
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Granted: ${grantedCount}`);
  console.log(`⏭️  Skipped (already has role): ${skippedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (grantedCount > 0 || skippedCount > 0) {
    console.log('✅ AMC_ROLE grant process completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Test pool creation:');
    console.log('      npx hardhat run scripts/test-pool-creation.js --network mantle_testnet');
    console.log('   2. Create pools from your application using wallets with AMC_ROLE');
  }
}

main()
  .then(() => {
    console.log('🏁 Process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Process failed:', error);
    process.exit(1);
  });

