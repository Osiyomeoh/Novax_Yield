import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Redeploy NovaxPoolManager with yield distribution fix
 * This fixes the ERC20InvalidReceiver error when distributing yield
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🔄 REDEPLOYING NovaxPoolManager with Yield Distribution Fix\n");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "XTZ\n");

  // Read existing deployment file
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const deploymentFile = path.join(__dirname, "../../deployments/novax-etherlink-127823.json");
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  console.log("📋 Using existing contracts from deployment file:");
  console.log("  USDC:", deployment.contracts.USDC);
  console.log("  NVX Token:", deployment.contracts.NVXToken);
  console.log("  Receivable Factory:", deployment.contracts.NovaxReceivableFactory);
  console.log("  RWA Factory:", deployment.contracts.NovaxRwaFactory);
  console.log("  Old Pool Manager:", deployment.contracts.NovaxPoolManager);
  console.log("  Platform Treasury:", deployment.configuration.platformTreasury);
  console.log("  AMC Address:", deployment.configuration.amcAddress);
  console.log("  Platform Fee:", deployment.configuration.platformFeeBps, "bps");
  console.log("  AMC Fee:", deployment.configuration.amcFeeBps, "bps\n");

  // Deploy new PoolManager
  console.log("📦 Deploying new NovaxPoolManager...");
  const NovaxPoolManager = await ethers.getContractFactory("NovaxPoolManager");
  const poolManager = await NovaxPoolManager.deploy(
    deployment.contracts.USDC,
    deployment.contracts.NVXToken,
    deployment.configuration.platformTreasury,
    deployment.configuration.amcAddress,
    BigInt(deployment.configuration.platformFeeBps),
    BigInt(deployment.configuration.amcFeeBps)
  );
  await poolManager.waitForDeployment();
  const poolManagerAddress = await poolManager.getAddress();
  console.log("✅ New PoolManager deployed to:", poolManagerAddress);

  // Configure new PoolManager
  console.log("\n⚙️  Configuring new PoolManager...");
  
  // Set RWA factory
  const setRwaTx = await poolManager.setRwaFactory(deployment.contracts.NovaxRwaFactory);
  await setRwaTx.wait();
  console.log("  ✅ Set RWA factory");

  // Set receivable factory
  const setRecTx = await poolManager.setReceivableFactory(deployment.contracts.NovaxReceivableFactory);
  await setRecTx.wait();
  console.log("  ✅ Set receivable factory");

  // Set NVX token
  const setNvxTx = await poolManager.setNvxToken(deployment.contracts.NVXToken);
  await setNvxTx.wait();
  console.log("  ✅ Set NVX token");

  // Grant AMC_ROLE to AMC address
  const AMC_ROLE = await poolManager.AMC_ROLE();
  const grantAmcTx = await poolManager.grantRole(AMC_ROLE, deployment.configuration.amcAddress);
  await grantAmcTx.wait();
  console.log("  ✅ Granted AMC_ROLE to AMC address");

  // Grant ADMIN_ROLE to deployer (for testing)
  const ADMIN_ROLE = await poolManager.ADMIN_ROLE();
  const grantAdminTx = await poolManager.grantRole(ADMIN_ROLE, deployer.address);
  await grantAdminTx.wait();
  console.log("  ✅ Granted ADMIN_ROLE to deployer");

  // Update deployment file
  const updatedDeployment = {
    ...deployment,
    contracts: {
      ...deployment.contracts,
      NovaxPoolManager: poolManagerAddress,
      OldNovaxPoolManager: deployment.contracts.NovaxPoolManager, // Keep old address for reference
    },
    timestamp: new Date().toISOString(),
    note: "Redeployed PoolManager with yield distribution fix (removed invalid NVX transfer to address(0))"
  };

  fs.writeFileSync(deploymentFile, JSON.stringify(updatedDeployment, null, 2));
  console.log("\n💾 Updated deployment file:", deploymentFile);

  console.log("\n" + "=".repeat(60));
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\n✅ New PoolManager:", poolManagerAddress);
  console.log("   Old PoolManager:", deployment.contracts.NovaxPoolManager);
  console.log("\n⚠️  IMPORTANT: Update all references to use new address!");
  console.log("   - Update frontend contracts.ts");
  console.log("   - Update test scripts");
  console.log("   - Update any other services");
  console.log("\n✅ Yield distribution should now work correctly!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

