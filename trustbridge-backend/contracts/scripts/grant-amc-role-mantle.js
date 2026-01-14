const { ethers } = require('hardhat');

async function main() {
  console.log('🔐 Granting AMC_ROLE to admin wallets on CoreAssetFactory...');
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer address:', deployer.address);
  
  // New CoreAssetFactory address (with rejectAsset function)
  const CORE_ASSET_FACTORY_ADDRESS = '0xfF1Eb31Bb1e7C45e49B1b7B08d4ddF3fe7EFB867';
  
  // Admin wallet addresses (update these with your actual admin wallets)
  // These should match the addresses in your backend .env file
  const ADMIN_WALLETS = [
    '0x00224492F572944500AB4eb91E413cfA34770c60', // Deployer (already has role from constructor)
    // Add more admin wallet addresses here
  ];
  
  console.log('\n📋 Configuration:');
  console.log('CoreAssetFactory:', CORE_ASSET_FACTORY_ADDRESS);
  console.log('Admin wallets to grant AMC_ROLE:', ADMIN_WALLETS.length);
  
  const CoreAssetFactory = await ethers.getContractFactory('CoreAssetFactory');
  const coreAssetFactory = CoreAssetFactory.attach(CORE_ASSET_FACTORY_ADDRESS);
  
  // Get AMC_ROLE hash
  const AMC_ROLE = await coreAssetFactory.AMC_ROLE();
  console.log('🔐 AMC_ROLE:', AMC_ROLE);
  
  // Grant AMC_ROLE to each admin wallet
  for (const adminWallet of ADMIN_WALLETS) {
    try {
      // Check if already has role
      const hasRole = await coreAssetFactory.hasRole(AMC_ROLE, adminWallet);
      if (hasRole) {
        console.log(`✅ ${adminWallet} already has AMC_ROLE`);
        continue;
      }
      
      // Grant role
      console.log(`🔐 Granting AMC_ROLE to ${adminWallet}...`);
      const tx = await coreAssetFactory.grantRole(AMC_ROLE, adminWallet);
      await tx.wait();
      console.log(`✅ AMC_ROLE granted to ${adminWallet}`);
      console.log(`   Transaction: ${tx.hash}`);
    } catch (error) {
      console.error(`❌ Failed to grant AMC_ROLE to ${adminWallet}:`, error.message);
    }
  }
  
  console.log('\n✅ AMC_ROLE grant process completed!');
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




