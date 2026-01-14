const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy updated PoolManager with redeem functions
 * This script deploys a new PoolManager and updates the deployment file
 */

async function main() {
  console.log("🚀 === DEPLOYING UPDATED POOLMANAGER TO MANTLE SEPOLIA ===\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deployment Configuration:");
  console.log("============================");
  console.log("Deploying with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MNT");
  
  if (balance === 0n) {
    throw new Error("❌ Deployer account has no balance. Please fund your account with Mantle Sepolia MNT.");
  }

  // Load existing deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  const latestFile = path.join(deploymentsDir, "mantle-sepolia-latest.json");
  
  let existingDeployment = {};
  if (fs.existsSync(latestFile)) {
    existingDeployment = JSON.parse(fs.readFileSync(latestFile, "utf8"));
    console.log("\n📋 Existing contracts:");
    Object.entries(existingDeployment.contracts || {}).forEach(([name, address]) => {
      console.log(`   ${name}: ${address}`);
    });
  } else {
    throw new Error("❌ No existing deployment found. Please run deploy-clean-mantle.js first.");
  }

  const coreAssetFactoryAddress = existingDeployment.contracts.CoreAssetFactory;
  const trustTokenAddress = existingDeployment.contracts.TrustToken;

  if (!coreAssetFactoryAddress || !trustTokenAddress) {
    throw new Error("❌ Missing required contract addresses. Please check deployment file.");
  }

  console.log("\n📦 Deploying updated PoolManager...");
  console.log("   CoreAssetFactory:", coreAssetFactoryAddress);
  console.log("   TrustToken:", trustTokenAddress);

  try {
    // Deploy PoolManager
    const PoolManager = await ethers.getContractFactory("PoolManager");
    const poolManager = await PoolManager.deploy(
      coreAssetFactoryAddress,
      trustTokenAddress
    );
    await poolManager.waitForDeployment();
    const poolManagerAddress = await poolManager.getAddress();
    
    console.log("\n✅ PoolManager deployed to:", poolManagerAddress);

    // Update deployment info
    const updatedDeployment = {
      ...existingDeployment,
      contracts: {
        ...existingDeployment.contracts,
        PoolManager: poolManagerAddress
      },
      updatedAt: new Date().toISOString(),
      updateNote: "Updated PoolManager with redeem functions"
    };

    // Save updated deployment
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const deploymentFile = path.join(deploymentsDir, `mantle-sepolia-${timestamp}.json`);
    
    fs.writeFileSync(deploymentFile, JSON.stringify(updatedDeployment, null, 2));
    fs.writeFileSync(latestFile, JSON.stringify(updatedDeployment, null, 2));

    console.log("\n✅ ========================================");
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log("✅ ========================================");
    console.log("\n📋 Updated PoolManager Address:");
    console.log(`   PoolManager: ${poolManagerAddress}`);

    console.log("\n📝 Environment Variable for Frontend (.env):");
    console.log("VITE_POOL_MANAGER_ADDRESS=" + poolManagerAddress);

    console.log("\n📝 Environment Variable for Backend (.env):");
    console.log("POOL_MANAGER_ADDRESS=" + poolManagerAddress);

    console.log("\n💾 Deployment info saved to:");
    console.log(`   ${deploymentFile}`);
    console.log(`   ${latestFile}`);

    console.log("\n⚠️  IMPORTANT: You need to:");
    console.log("   1. Update frontend .env with new POOL_MANAGER_ADDRESS");
    console.log("   2. Update backend .env with new POOL_MANAGER_ADDRESS");
    console.log("   3. Copy new PoolManager ABI to frontend");
    console.log("   4. Grant AMC_ROLE to AMC addresses on new contract");

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

