import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

async function main() {
  console.log("🔍 Checking Admin Roles on Arbitrum Sepolia...\n");

  // Load deployment addresses
  const deploymentFile = path.join(__dirname, "../../deployments/novax-arbitrum-sepolia-421614.json");
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const contracts = deployment.contracts;

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const walletToCheck = process.env.WALLET_ADDRESS || deployer.address;

  console.log("Wallet to check:", walletToCheck);
  console.log("Deployer:", deployer.address);
  console.log("");

  // Get contract instances
  const NovaxPoolManager = await ethers.getContractFactory("NovaxPoolManager");
  const poolManager = NovaxPoolManager.attach(contracts.NovaxPoolManager);

  const NovaxReceivableFactory = await ethers.getContractFactory("NovaxReceivableFactory");
  const receivableFactory = NovaxReceivableFactory.attach(contracts.NovaxReceivableFactory);

  const NovaxRwaFactory = await ethers.getContractFactory("NovaxRwaFactory");
  const rwaFactory = NovaxRwaFactory.attach(contracts.NovaxRwaFactory);

  // Get role constants
  const ADMIN_ROLE = await poolManager.ADMIN_ROLE();
  const AMC_ROLE = await poolManager.AMC_ROLE();
  const DEFAULT_ADMIN_ROLE = await poolManager.DEFAULT_ADMIN_ROLE();

  console.log("📋 Role Hashes:");
  console.log(`  DEFAULT_ADMIN_ROLE: ${DEFAULT_ADMIN_ROLE}`);
  console.log(`  ADMIN_ROLE: ${ADMIN_ROLE}`);
  console.log(`  AMC_ROLE: ${AMC_ROLE}`);
  console.log("");

  // Check roles on Pool Manager
  console.log("🔐 Pool Manager Roles:");
  const hasDefaultAdminPM = await poolManager.hasRole(DEFAULT_ADMIN_ROLE, walletToCheck);
  const hasAdminRolePM = await poolManager.hasRole(ADMIN_ROLE, walletToCheck);
  const hasAmcRolePM = await poolManager.hasRole(AMC_ROLE, walletToCheck);
  console.log(`  DEFAULT_ADMIN_ROLE: ${hasDefaultAdminPM ? "✅" : "❌"}`);
  console.log(`  ADMIN_ROLE: ${hasAdminRolePM ? "✅" : "❌"}`);
  console.log(`  AMC_ROLE: ${hasAmcRolePM ? "✅" : "❌"}`);

  // Check roles on Receivable Factory
  console.log("\n🔐 Receivable Factory Roles:");
  const hasDefaultAdminRF = await receivableFactory.hasRole(DEFAULT_ADMIN_ROLE, walletToCheck);
  const hasAdminRoleRF = await receivableFactory.hasRole(ADMIN_ROLE, walletToCheck);
  const hasAmcRoleRF = await receivableFactory.hasRole(AMC_ROLE, walletToCheck);
  console.log(`  DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRF ? "✅" : "❌"}`);
  console.log(`  ADMIN_ROLE: ${hasAdminRoleRF ? "✅" : "❌"}`);
  console.log(`  AMC_ROLE: ${hasAmcRoleRF ? "✅" : "❌"}`);

  // Check roles on RWA Factory
  console.log("\n🔐 RWA Factory Roles:");
  const hasDefaultAdminRWA = await rwaFactory.hasRole(DEFAULT_ADMIN_ROLE, walletToCheck);
  const hasAdminRoleRWA = await rwaFactory.hasRole(ADMIN_ROLE, walletToCheck);
  const hasAmcRoleRWA = await rwaFactory.hasRole(AMC_ROLE, walletToCheck);
  console.log(`  DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRWA ? "✅" : "❌"}`);
  console.log(`  ADMIN_ROLE: ${hasAdminRoleRWA ? "✅" : "❌"}`);
  console.log(`  AMC_ROLE: ${hasAmcRoleRWA ? "✅" : "❌"}`);

  // Summary
  console.log("\n📊 Summary:");
  const hasAnyAdmin = hasDefaultAdminPM || hasAdminRolePM || hasDefaultAdminRF || hasAdminRoleRF || hasDefaultAdminRWA || hasAdminRoleRWA;
  const hasAnyAmc = hasAmcRolePM || hasAmcRoleRF || hasAmcRoleRWA;
  
  console.log(`  Has Admin Role: ${hasAnyAdmin ? "✅ YES" : "❌ NO"}`);
  console.log(`  Has AMC Role: ${hasAnyAmc ? "✅ YES" : "❌ NO"}`);
  
  if (!hasAnyAdmin && !hasAnyAmc) {
    console.log("\n⚠️  No admin roles found. You may need to:");
    console.log("  1. Grant roles using the deployer account");
    console.log("  2. Add the wallet to environment variables (ADMIN_WALLETS, AMC_ADMIN_WALLETS)");
  }

  // Check who has DEFAULT_ADMIN_ROLE (can grant roles)
  console.log("\n👑 Default Admins (can grant roles):");
  try {
    // Try to get admin count (if supported)
    const adminCount = await poolManager.getRoleMemberCount(DEFAULT_ADMIN_ROLE);
    console.log(`  Total DEFAULT_ADMIN_ROLE holders: ${adminCount}`);
    
    // Get first few admins
    for (let i = 0; i < Math.min(Number(adminCount), 5); i++) {
      try {
        const admin = await poolManager.getRoleMember(DEFAULT_ADMIN_ROLE, i);
        console.log(`    ${i + 1}. ${admin}`);
      } catch (e) {
        // Skip if getRoleMember not available
        break;
      }
    }
  } catch (error) {
    console.log("  (Could not enumerate admins)");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


