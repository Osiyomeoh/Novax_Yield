const { ethers } = require('hardhat');

async function main() {
  console.log('🔐 Granting AMC_ROLE to admin wallets on AMCManager...');
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer address:', deployer.address);
  
  // AMCManager contract address (Mantle Sepolia)
  const AMC_MANAGER_ADDRESS = '0x94FBbA3EB7799e9eb037d63cDfea60Ab3985e048';
  
  // Admin wallet addresses (update these with your actual admin wallets)
  // These should match the addresses in your backend .env file
  const ADMIN_WALLETS = [
    '0x00224492F572944500AB4eb91E413cfA34770c60', // Super Admin
    // Add more admin wallet addresses here
  ];
  
  console.log('\n📋 Configuration:');
  console.log('AMCManager:', AMC_MANAGER_ADDRESS);
  console.log('Admin wallets to grant AMC_ROLE:', ADMIN_WALLETS.length);
  
  const AMCManager = await ethers.getContractFactory('AMCManager');
  const amcManager = AMCManager.attach(AMC_MANAGER_ADDRESS);
  
  // Get AMC_ROLE hash
  const AMC_ROLE = await amcManager.AMC_ROLE();
  console.log('🔐 AMC_ROLE:', AMC_ROLE);
  
  // Grant AMC_ROLE to each admin wallet
  for (const adminWallet of ADMIN_WALLETS) {
    try {
      // Check if already has role
      const hasRole = await amcManager.hasRole(AMC_ROLE, adminWallet);
      if (hasRole) {
        console.log(`✅ ${adminWallet} already has AMC_ROLE on AMCManager`);
        continue;
      }
      
      // Grant role (requires DEFAULT_ADMIN_ROLE)
      console.log(`🔐 Granting AMC_ROLE to ${adminWallet} on AMCManager...`);
      const tx = await amcManager.grantRole(AMC_ROLE, adminWallet);
      await tx.wait();
      console.log(`✅ AMC_ROLE granted to ${adminWallet} on AMCManager`);
      console.log(`   Transaction: ${tx.hash}`);
    } catch (error) {
      console.error(`❌ Failed to grant AMC_ROLE to ${adminWallet}:`, error.message);
      if (error.message.includes('AccessControl')) {
        console.error(`   ⚠️  You need DEFAULT_ADMIN_ROLE to grant AMC_ROLE.`);
        console.error(`   ⚠️  The deployer (${deployer.address}) should have this role.`);
      }
    }
  }
  
  console.log('\n✅ AMC_ROLE grant process completed!');
  console.log('\n📝 Note: Make sure AMC_ROLE is also granted on CoreAssetFactory contract.');
  console.log('   Run: npx hardhat run scripts/grant-amc-role-mantle.js --network mantle_testnet');
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


