const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Clean deployment script - Only deploys required contracts for TrustBridge flow
 * Required contracts:
 * 1. TrustToken (ERC-20)
 * 2. AssetNFT (ERC-721)
 * 3. CoreAssetFactory
 * 4. VerificationRegistry
 * 5. AMCManager
 * 6. PoolManager
 * 7. TRUSTMarketplace
 * 8. TRUSTFaucet
 */

async function main() {
  console.log("🚀 === CLEAN TRUSTBRIDGE DEPLOYMENT TO MANTLE SEPOLIA ===\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deployment Configuration:");
  console.log("============================");
  console.log("Deploying with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MNT");
  
  if (balance === 0n) {
    throw new Error("❌ Deployer account has no balance. Please fund your account with Mantle Sepolia MNT.");
  }

  const deploymentInfo = {
    network: "mantle_sepolia",
    chainId: 5001, // Mantle Sepolia Testnet chain ID
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {},
    setup: []
  };

  try {
    // ========================================
    // 1. Deploy TrustToken (ERC-20)
    // ========================================
    console.log("\n📦 [1/8] Deploying TrustToken...");
    const TrustToken = await ethers.getContractFactory("TrustToken");
    const trustToken = await TrustToken.deploy();
    await trustToken.waitForDeployment();
    const trustTokenAddress = await trustToken.getAddress();
    deploymentInfo.contracts.TrustToken = trustTokenAddress;
    console.log("✅ TrustToken deployed to:", trustTokenAddress);

    // ========================================
    // 2. Deploy AssetNFT (ERC-721)
    // ========================================
    console.log("\n📦 [2/8] Deploying AssetNFT...");
    const AssetNFT = await ethers.getContractFactory("AssetNFT");
    const assetNFT = await AssetNFT.deploy();
    await assetNFT.waitForDeployment();
    const assetNFTAddress = await assetNFT.getAddress();
    deploymentInfo.contracts.AssetNFT = assetNFTAddress;
    console.log("✅ AssetNFT deployed to:", assetNFTAddress);

    // ========================================
    // 3. Deploy CoreAssetFactory
    // ========================================
    console.log("\n📦 [3/8] Deploying CoreAssetFactory...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Delay for nonce
    const CoreAssetFactory = await ethers.getContractFactory("CoreAssetFactory");
    const coreAssetFactory = await CoreAssetFactory.deploy(
      trustTokenAddress,
      assetNFTAddress,
      deployer.address // fee recipient
    );
    await coreAssetFactory.waitForDeployment();
    const coreAssetFactoryAddress = await coreAssetFactory.getAddress();
    deploymentInfo.contracts.CoreAssetFactory = coreAssetFactoryAddress;
    console.log("✅ CoreAssetFactory deployed to:", coreAssetFactoryAddress);

    // ========================================
    // 4. Deploy VerificationRegistry
    // ========================================
    console.log("\n📦 [4/8] Deploying VerificationRegistry...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Delay for nonce
    const VerificationRegistry = await ethers.getContractFactory("VerificationRegistry");
    const verificationRegistry = await VerificationRegistry.deploy();
    await verificationRegistry.waitForDeployment();
    const verificationRegistryAddress = await verificationRegistry.getAddress();
    deploymentInfo.contracts.VerificationRegistry = verificationRegistryAddress;
    console.log("✅ VerificationRegistry deployed to:", verificationRegistryAddress);

    // ========================================
    // 5. Deploy AMCManager
    // ========================================
    console.log("\n📦 [5/8] Deploying AMCManager...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Delay for nonce
    const AMCManager = await ethers.getContractFactory("AMCManager");
    const amcManager = await AMCManager.deploy(coreAssetFactoryAddress);
    await amcManager.waitForDeployment();
    const amcManagerAddress = await amcManager.getAddress();
    deploymentInfo.contracts.AMCManager = amcManagerAddress;
    console.log("✅ AMCManager deployed to:", amcManagerAddress);

    // Link AMCManager to CoreAssetFactory
    console.log("   Linking AMCManager to CoreAssetFactory...");
    try {
      const setAMCTx = await coreAssetFactory.setAMCManager(amcManagerAddress);
      await setAMCTx.wait();
      deploymentInfo.setup.push("Linked AMCManager to CoreAssetFactory");
      console.log("   ✅ AMCManager linked to CoreAssetFactory");
    } catch (error) {
      console.log("   ⚠️  Failed to link AMCManager:", error.message);
    }

    // ========================================
    // 6. Deploy PoolManager
    // ========================================
    console.log("\n📦 [6/8] Deploying PoolManager...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Delay for nonce
    const PoolManager = await ethers.getContractFactory("PoolManager");
    const poolManager = await PoolManager.deploy(
      coreAssetFactoryAddress,
      trustTokenAddress
    );
    await poolManager.waitForDeployment();
    const poolManagerAddress = await poolManager.getAddress();
    deploymentInfo.contracts.PoolManager = poolManagerAddress;
    console.log("✅ PoolManager deployed to:", poolManagerAddress);

    // ========================================
    // 7. Deploy TRUSTMarketplace
    // ========================================
    console.log("\n📦 [7/8] Deploying TRUSTMarketplace...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Delay for nonce
    const TRUSTMarketplace = await ethers.getContractFactory("TRUSTMarketplace");
    const trustMarketplace = await TRUSTMarketplace.deploy(
      assetNFTAddress,
      trustTokenAddress,
      deployer.address // fee recipient
    );
    await trustMarketplace.waitForDeployment();
    const trustMarketplaceAddress = await trustMarketplace.getAddress();
    deploymentInfo.contracts.TRUSTMarketplace = trustMarketplaceAddress;
    console.log("✅ TRUSTMarketplace deployed to:", trustMarketplaceAddress);

    // ========================================
    // 8. Deploy TRUSTFaucet
    // ========================================
    console.log("\n📦 [8/8] Deploying TRUSTFaucet...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Delay for nonce
    const TRUSTFaucet = await ethers.getContractFactory("TRUSTFaucet");
    const trustFaucet = await TRUSTFaucet.deploy(trustTokenAddress);
    await trustFaucet.waitForDeployment();
    const trustFaucetAddress = await trustFaucet.getAddress();
    deploymentInfo.contracts.TRUSTFaucet = trustFaucetAddress;
    console.log("✅ TRUSTFaucet deployed to:", trustFaucetAddress);

    // ========================================
    // Setup: Grant MINTER_ROLE to AssetNFT
    // ========================================
    console.log("\n🔧 Setting up roles...");
    
    // Grant MINTER_ROLE on AssetNFT to CoreAssetFactory
    const MINTER_ROLE = await assetNFT.MINTER_ROLE();
    const hasMinterRole = await assetNFT.hasRole(MINTER_ROLE, coreAssetFactoryAddress);
    if (!hasMinterRole) {
      console.log("   Granting MINTER_ROLE on AssetNFT to CoreAssetFactory...");
      const grantMinterTx = await assetNFT.grantRole(MINTER_ROLE, coreAssetFactoryAddress);
      await grantMinterTx.wait();
      deploymentInfo.setup.push("Granted MINTER_ROLE on AssetNFT to CoreAssetFactory");
      console.log("   ✅ MINTER_ROLE granted");
    } else {
      console.log("   ✅ CoreAssetFactory already has MINTER_ROLE on AssetNFT");
    }

    // Grant MINTER_ROLE on TrustToken to TRUSTFaucet
    const TRUST_TOKEN_MINTER_ROLE = await trustToken.MINTER_ROLE();
    const trustFaucetHasMinter = await trustToken.hasRole(TRUST_TOKEN_MINTER_ROLE, trustFaucetAddress);
    if (!trustFaucetHasMinter) {
      console.log("   Granting MINTER_ROLE on TrustToken to TRUSTFaucet...");
      const grantFaucetTx = await trustToken.grantRole(TRUST_TOKEN_MINTER_ROLE, trustFaucetAddress);
      await grantFaucetTx.wait();
      deploymentInfo.setup.push("Granted MINTER_ROLE on TrustToken to TRUSTFaucet");
      console.log("   ✅ MINTER_ROLE granted");
    } else {
      console.log("   ✅ TRUSTFaucet already has MINTER_ROLE on TrustToken");
    }

    // ========================================
    // Save deployment info
    // ========================================
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const deploymentFile = path.join(deploymentsDir, `mantle-sepolia-${timestamp}.json`);
    const latestFile = path.join(deploymentsDir, "mantle-sepolia-latest.json");

    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n✅ ========================================");
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log("✅ ========================================");
    console.log("\n📋 Deployed Contracts:");
    Object.entries(deploymentInfo.contracts).forEach(([name, address]) => {
      console.log(`   ${name}: ${address}`);
    });

    console.log("\n📝 Environment Variables for Frontend (.env):");
    console.log("VITE_TRUST_TOKEN_ADDRESS=" + deploymentInfo.contracts.TrustToken);
    console.log("VITE_ASSET_NFT_ADDRESS=" + deploymentInfo.contracts.AssetNFT);
    console.log("VITE_CORE_ASSET_FACTORY_ADDRESS=" + deploymentInfo.contracts.CoreAssetFactory);
    console.log("VITE_VERIFICATION_REGISTRY_ADDRESS=" + deploymentInfo.contracts.VerificationRegistry);
    console.log("VITE_AMC_MANAGER_ADDRESS=" + deploymentInfo.contracts.AMCManager);
    console.log("VITE_POOL_MANAGER_ADDRESS=" + deploymentInfo.contracts.PoolManager);
    console.log("VITE_TRUST_MARKETPLACE_ADDRESS=" + deploymentInfo.contracts.TRUSTMarketplace);
    console.log("VITE_TRUST_FAUCET_ADDRESS=" + deploymentInfo.contracts.TRUSTFaucet);

    console.log("\n📝 Environment Variables for Backend (.env):");
    console.log("TRUST_TOKEN_ADDRESS=" + deploymentInfo.contracts.TrustToken);
    console.log("ASSET_NFT_ADDRESS=" + deploymentInfo.contracts.AssetNFT);
    console.log("CORE_ASSET_FACTORY_ADDRESS=" + deploymentInfo.contracts.CoreAssetFactory);
    console.log("VERIFICATION_REGISTRY_ADDRESS=" + deploymentInfo.contracts.VerificationRegistry);
    console.log("AMC_MANAGER_ADDRESS=" + deploymentInfo.contracts.AMCManager);
    console.log("POOL_MANAGER_ADDRESS=" + deploymentInfo.contracts.PoolManager);
    console.log("TRUST_MARKETPLACE_ADDRESS=" + deploymentInfo.contracts.TRUSTMarketplace);
    console.log("TRUST_FAUCET_ADDRESS=" + deploymentInfo.contracts.TRUSTFaucet);

    console.log("\n💾 Deployment info saved to:");
    console.log(`   ${deploymentFile}`);
    console.log(`   ${latestFile}`);

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

