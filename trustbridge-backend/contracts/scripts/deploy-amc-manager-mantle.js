const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 Deploying AMCManager to Mantle Sepolia...');
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer address:', deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('💰 Deployer balance:', ethers.formatEther(balance), 'MNT');
  
  if (balance === 0n) {
    throw new Error('❌ Deployer account has no balance. Please fund your account with Mantle Sepolia MNT.');
  }

  // CoreAssetFactory address (newly deployed with rejectAsset function)
  const CORE_ASSET_FACTORY_ADDRESS = '0x752463155c6c9E8f60BD35080204Bf4A89B28e5D';
  
  console.log('\n📋 Deployment Configuration:');
  console.log('============================');
  console.log('📍 CoreAssetFactory:', CORE_ASSET_FACTORY_ADDRESS);
  console.log('🌐 Network: Mantle Sepolia Testnet');
  console.log('Chain ID: 5003');
  
  // Deploy AMCManager
  console.log('\n📦 Deploying AMCManager...');
  const AMCManager = await ethers.getContractFactory('AMCManager');
  const amcManager = await AMCManager.deploy(CORE_ASSET_FACTORY_ADDRESS);
  
  await amcManager.waitForDeployment();
  const amcManagerAddress = await amcManager.getAddress();
  
  console.log('✅ AMCManager deployed to:', amcManagerAddress);
  
  // Link AMCManager to CoreAssetFactory
  console.log('\n🔗 Linking AMCManager to CoreAssetFactory...');
  try {
    const CoreAssetFactory = await ethers.getContractFactory('CoreAssetFactory');
    const coreAssetFactory = CoreAssetFactory.attach(CORE_ASSET_FACTORY_ADDRESS);
    
    // Check if already set
    const currentAMCManager = await coreAssetFactory.amcManager();
    if (currentAMCManager && currentAMCManager.toLowerCase() === amcManagerAddress.toLowerCase()) {
      console.log('✅ AMCManager already linked to CoreAssetFactory');
    } else {
      // Set AMCManager address on CoreAssetFactory
      console.log('   Setting AMCManager address on CoreAssetFactory...');
      const tx = await coreAssetFactory.setAMCManager(amcManagerAddress);
      await tx.wait();
      console.log('✅ AMCManager linked to CoreAssetFactory');
      console.log('   Transaction:', tx.hash);
    }
  } catch (error) {
    console.error('❌ Failed to link AMCManager:', error.message);
    throw error;
  }
  
  // Verify deployment
  console.log('\n🧪 Verifying deployment...');
  
  try {
    // Check AMC_ROLE
    const AMC_ROLE = await amcManager.AMC_ROLE();
    console.log('🔐 AMC_ROLE:', AMC_ROLE);
    
    // Check if deployer has AMC_ROLE (should be granted in constructor)
    const deployerHasAMCRole = await amcManager.hasRole(AMC_ROLE, deployer.address);
    console.log('✅ Deployer has AMC_ROLE:', deployerHasAMCRole);
    
    // Check assetFactory is correctly set
    const assetFactoryAddress = await amcManager.assetFactory();
    console.log('✅ AssetFactory address in AMCManager:', assetFactoryAddress);
    console.log('   Matches expected:', assetFactoryAddress.toLowerCase() === CORE_ASSET_FACTORY_ADDRESS.toLowerCase());
    
  } catch (error) {
    console.warn('⚠️ Error during verification:', error.message);
  }
  
  console.log('\n📋 Deployment Summary:');
  console.log('========================');
  console.log('Contract Address:', amcManagerAddress);
  console.log('Network: Mantle Sepolia Testnet');
  console.log('Chain ID: 5003');
  console.log('Deployer:', deployer.address);
  console.log('Linked to CoreAssetFactory:', CORE_ASSET_FACTORY_ADDRESS);
  
  // Save deployment info
  const deploymentInfo = {
    network: 'mantle_sepolia',
    chainId: 5003,
    contractName: 'AMCManager',
    address: amcManagerAddress,
    deployer: deployer.address,
    coreAssetFactory: CORE_ASSET_FACTORY_ADDRESS,
    timestamp: new Date().toISOString(),
    explorer: `https://explorer.sepolia.mantle.xyz/address/${amcManagerAddress}`,
    linked: true
  };
  
  console.log('\n💾 Deployment info:');
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log('\n📝 IMPORTANT: Update your .env files with the new contract address:');
  console.log(`AMC_MANAGER_ADDRESS=${amcManagerAddress}`);
  console.log(`VITE_AMC_MANAGER_ADDRESS=${amcManagerAddress}`);
}

main()
  .then(() => {
    console.log('\n🏁 Deployment completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });




