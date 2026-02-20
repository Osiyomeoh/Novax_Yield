import { ethers } from "hardhat";
import "dotenv/config";

/**
 * Deploy staking vault system to Arbitrum Sepolia
 * - NovaxStakingVault
 * - VaultCapacityManager
 * - Integrate with existing NovaxPoolManager
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🚀 Deploying Staking Vault System to Arbitrum Sepolia");
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Get existing contract addresses from environment or use defaults (Arbitrum Sepolia)
  const USDC_ADDRESS = process.env.ARBITRUM_SEPOLIA_USDC_ADDRESS || "0xD1A4AB603d489F6A6D74e7A5E853ad880cB7C24D"; // MockUSDC on Arbitrum Sepolia
  const NVX_TOKEN_ADDRESS = process.env.NVX_TOKEN_ADDRESS || "0x9fF0637bCEEb4263DcA3ECdc00380E7C5077C8ff"; // NVX Token on Arbitrum Sepolia
  const POOL_MANAGER_ADDRESS = process.env.NOVAX_POOL_MANAGER_ADDRESS || "0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5"; // Pool Manager on Arbitrum Sepolia

  console.log("\n📋 Existing Contracts:");
  console.log("  USDC:", USDC_ADDRESS);
  console.log("  NVX Token:", NVX_TOKEN_ADDRESS);
  console.log("  Pool Manager:", POOL_MANAGER_ADDRESS);

  if (!USDC_ADDRESS || USDC_ADDRESS === ethers.ZeroAddress) {
    throw new Error("USDC address is required. Set ARBITRUM_SEPOLIA_USDC_ADDRESS in .env");
  }

  if (!POOL_MANAGER_ADDRESS || POOL_MANAGER_ADDRESS === ethers.ZeroAddress) {
    throw new Error("Pool Manager address is required. Set NOVAX_POOL_MANAGER_ADDRESS in .env");
  }

  // ==================== DEPLOY STAKING VAULT ====================
  console.log("\n🚀 Deploying NovaxStakingVault...");
  
  const NovaxStakingVault = await ethers.getContractFactory("NovaxStakingVault");
  const stakingVault = await NovaxStakingVault.deploy(USDC_ADDRESS);
  await stakingVault.waitForDeployment();
  const stakingVaultAddress = await stakingVault.getAddress();
  
  console.log("✅ NovaxStakingVault deployed to:", stakingVaultAddress);

  // ==================== DEPLOY CAPACITY MANAGER ====================
  console.log("\n🚀 Deploying VaultCapacityManager...");
  
  const initialCapacity = ethers.parseUnits("1000000", 6); // $1M initial capacity
  
  console.log("  Deploying with params:");
  console.log("    stakingVault:", stakingVaultAddress);
  console.log("    poolManager:", POOL_MANAGER_ADDRESS);
  console.log("    nvxToken:", NVX_TOKEN_ADDRESS || ethers.ZeroAddress);
  console.log("    usdc:", USDC_ADDRESS);
  console.log("    initialCapacity:", ethers.formatUnits(initialCapacity, 6), "USDC");
  
  const VaultCapacityManager = await ethers.getContractFactory("VaultCapacityManager");
  const capacityManager = await VaultCapacityManager.deploy(
    stakingVaultAddress,
    POOL_MANAGER_ADDRESS,
    NVX_TOKEN_ADDRESS || ethers.ZeroAddress, // Use zero address if not deployed yet
    USDC_ADDRESS,
    initialCapacity
  );
  await capacityManager.waitForDeployment();
  const capacityManagerAddress = await capacityManager.getAddress();
  
  console.log("✅ VaultCapacityManager deployed to:", capacityManagerAddress);

  // ==================== CONFIGURE STAKING VAULT ====================
  console.log("\n⚙️  Configuring NovaxStakingVault...");
  
  // Set capacity manager
  console.log("  Setting capacity manager...");
  const setCapacityTx = await stakingVault.setVaultCapacityManager(capacityManagerAddress);
  await setCapacityTx.wait();
  console.log("  ✅ Set capacity manager");

  // Grant POOL_MANAGER_ROLE to PoolManager
  console.log("  Granting POOL_MANAGER_ROLE to PoolManager...");
  const POOL_MANAGER_ROLE = await stakingVault.POOL_MANAGER_ROLE();
  const grantRoleTx = await stakingVault.grantRole(POOL_MANAGER_ROLE, POOL_MANAGER_ADDRESS);
  await grantRoleTx.wait();
  console.log("  ✅ Granted POOL_MANAGER_ROLE to PoolManager");

  // Grant ADMIN_ROLE to deployer
  console.log("  Granting ADMIN_ROLE to deployer...");
  const ADMIN_ROLE = await stakingVault.ADMIN_ROLE();
  const grantAdminTx = await stakingVault.grantRole(ADMIN_ROLE, deployer.address);
  await grantAdminTx.wait();
  console.log("  ✅ Granted ADMIN_ROLE to deployer");

  // ==================== CONFIGURE POOL MANAGER ====================
  console.log("\n⚙️  Configuring NovaxPoolManager...");
  
  const poolManager = await ethers.getContractAt("NovaxPoolManager", POOL_MANAGER_ADDRESS);
  
  // Set staking vault
  console.log("  Setting staking vault in PoolManager...");
  const setVaultTx = await poolManager.setStakingVault(stakingVaultAddress);
  await setVaultTx.wait();
  console.log("  ✅ Set staking vault");

  // Set capacity manager
  console.log("  Setting capacity manager in PoolManager...");
  const setCapMgrTx = await poolManager.setVaultCapacityManager(capacityManagerAddress);
  await setCapMgrTx.wait();
  console.log("  ✅ Set capacity manager");

  // ==================== VERIFY INTEGRATION ====================
  console.log("\n🔍 Verifying Integration...");
  
  const vaultStatus = await stakingVault.getVaultStatus();
  console.log("  Vault Status:");
  console.log("    Total Staked:", ethers.formatUnits(vaultStatus[0], 6), "USDC");
  console.log("    Deployed:", ethers.formatUnits(vaultStatus[1], 6), "USDC");
  console.log("    Available:", ethers.formatUnits(vaultStatus[2], 6), "USDC");
  console.log("    Utilization:", Number(vaultStatus[3]) / 100, "%");

  const capacityStatus = await capacityManager.getVaultStatus();
  console.log("\n  Capacity Status:");
  console.log("    Capacity:", ethers.formatUnits(capacityStatus[0], 6), "USDC");
  console.log("    Staked:", ethers.formatUnits(capacityStatus[1], 6), "USDC");
  console.log("    Available:", ethers.formatUnits(capacityStatus[2], 6), "USDC");
  console.log("    Utilization:", Number(capacityStatus[3]) / 100, "%");
  console.log("    Waitlist:", ethers.formatUnits(capacityStatus[4], 6), "USDC");

  // ==================== SUMMARY ====================
  console.log("\n" + "=".repeat(60));
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\n✅ New Contracts Deployed:");
  console.log("  NovaxStakingVault:", stakingVaultAddress);
  console.log("  VaultCapacityManager:", capacityManagerAddress);
  
  console.log("\n✅ Integration Complete:");
  console.log("  PoolManager → StakingVault: ✅ Configured");
  console.log("  PoolManager → CapacityManager: ✅ Configured");
  console.log("  StakingVault → CapacityManager: ✅ Configured");
  
  console.log("\n📝 Environment Variables to Add:");
  console.log(`VITE_STAKING_VAULT_ADDRESS=${stakingVaultAddress}`);
  console.log(`VITE_VAULT_CAPACITY_MANAGER_ADDRESS=${capacityManagerAddress}`);
  
  console.log("\n💡 Next Steps:");
  console.log("  1. Update frontend .env with the addresses above");
  console.log("  2. Test staking flow: stake() → pool creation → auto-deploy");
  console.log("  3. Test capacity management: check canStake()");
  console.log("  4. Test payment flow: recordPayment() → distributeYield()");
  
  console.log("\n✅ Deployment Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


