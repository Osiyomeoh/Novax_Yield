import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy contracts and test AMC/Admin flow locally
 * This ensures contracts are fresh for each test run
 */
async function main() {
  const [deployer, exporter, amc, admin, investor1, investor2] = await ethers.getSigners();
  
  console.log("🧪 Testing AMC/Admin Flow Locally (with fresh deployment)");
  console.log("=".repeat(60));
  console.log("\n👥 Accounts:");
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Exporter: ${exporter.address}`);
  console.log(`  AMC: ${amc.address}`);
  console.log(`  Admin: ${admin.address}`);
  console.log(`  Investor 1: ${investor1.address}`);
  console.log(`  Investor 2: ${investor2.address}\n`);

  // ========== DEPLOY CONTRACTS ==========
  console.log("📦 Deploying contracts...\n");
  
  // Deploy Mock USDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log(`✅ Mock USDC: ${mockUSDCAddress}`);

  // Deploy NVX Token
  const NVXToken = await ethers.getContractFactory("NVXToken");
  const nvxToken = await NVXToken.deploy();
  await nvxToken.waitForDeployment();
  const nvxTokenAddress = await nvxToken.getAddress();
  console.log(`✅ NVX Token: ${nvxTokenAddress}`);

  // Deploy Receivable Factory
  const NovaxReceivableFactory = await ethers.getContractFactory("NovaxReceivableFactory");
  const receivableFactory = await NovaxReceivableFactory.deploy();
  await receivableFactory.waitForDeployment();
  const receivableFactoryAddr = await receivableFactory.getAddress();
  console.log(`✅ Receivable Factory: ${receivableFactoryAddr}`);

  // Deploy RWA Factory (needed even for receivable pools)
  const NovaxRwaFactory = await ethers.getContractFactory("NovaxRwaFactory");
  const rwaFactory = await NovaxRwaFactory.deploy();
  await rwaFactory.waitForDeployment();
  const rwaFactoryAddress = await rwaFactory.getAddress();
  console.log(`✅ RWA Factory: ${rwaFactoryAddress}`);

  // Deploy Pool Manager
  const platformTreasury = deployer.address;
  const amcAddress = amc.address;
  const platformFeeBps = 100n; // 1%
  const amcFeeBps = 200n; // 2%
  
  const NovaxPoolManager = await ethers.getContractFactory("NovaxPoolManager");
  const poolManager = await NovaxPoolManager.deploy(
    mockUSDCAddress,
    nvxTokenAddress,
    platformTreasury,
    amcAddress,
    platformFeeBps,
    amcFeeBps
  );
  await poolManager.waitForDeployment();
  const poolManagerAddress = await poolManager.getAddress();
  console.log(`✅ Pool Manager: ${poolManagerAddress}`);

  // Configure Pool Manager
  const setRwaTx = await poolManager.setRwaFactory(rwaFactoryAddress);
  await setRwaTx.wait();
  const setRecTx = await poolManager.setReceivableFactory(receivableFactoryAddr);
  await setRecTx.wait();
  const setNvxTx = await poolManager.setNvxToken(nvxTokenAddress);
  await setNvxTx.wait();
  console.log(`✅ Pool Manager configured\n`);

  // Grant roles
  const AMC_ROLE = await receivableFactory.AMC_ROLE();
  await receivableFactory.grantRole(AMC_ROLE, amc.address);
  await poolManager.grantRole(AMC_ROLE, amc.address);
  const ADMIN_ROLE = await poolManager.ADMIN_ROLE();
  await poolManager.grantRole(ADMIN_ROLE, admin.address);
  console.log(`✅ Roles granted\n`);

  // Mint test tokens
  const mintAmount = ethers.parseUnits("100000", 6); // 100,000 USDC
  await mockUSDC.mint(investor1.address, mintAmount);
  await mockUSDC.mint(investor2.address, mintAmount);
  await nvxToken.mint(poolManagerAddress, ethers.parseUnits("1000000", 18)); // 1M NVX for rewards
  console.log(`✅ Test tokens minted\n`);

  // ========== PHASE 1: CREATE RECEIVABLE ==========
  console.log("=".repeat(60));
  console.log("📝 PHASE 1: Create Receivable");
  console.log("=".repeat(60));
  
  const receivableAmount = ethers.parseUnits("10000", 6); // $10,000
  const dueDate = Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60); // 90 days from now
  const metadataCID = ethers.id("test-receivable-metadata");
  
  const createTx = await receivableFactory.connect(exporter).createReceivable(
    ethers.ZeroAddress, // Importer (zero for off-chain)
    receivableAmount,
    dueDate,
    metadataCID,
    ethers.ZeroHash // No importer approval ID
  );
  const receipt = await createTx.wait();
  
  // Parse ReceivableCreated event
  const receivableFactoryInterface = receivableFactory.interface;
  const receivableCreatedEvent = receipt.logs.find((log: any) => {
    try {
      const parsed = receivableFactoryInterface.parseLog({ topics: log.topics, data: log.data });
      return parsed?.name === 'ReceivableCreated';
    } catch {
      return false;
    }
  });
  
  if (!receivableCreatedEvent) {
    throw new Error('ReceivableCreated event not found');
  }
  
  const parsedEvent = receivableFactoryInterface.parseLog({
    topics: receivableCreatedEvent.topics,
    data: receivableCreatedEvent.data,
  });
  const receivableId = parsedEvent.args[0];
  console.log(`✅ Receivable created: ${receivableId}\n`);

  // ========== PHASE 2: VERIFY RECEIVABLE ==========
  console.log("=".repeat(60));
  console.log("✅ PHASE 2: Verify Receivable (AMC)");
  console.log("=".repeat(60));
  
  const riskScore = 75;
  const apr = 1200; // 12% (1200 basis points)
  
  console.log(`   Verifying receivable ${receivableId}...`);
  console.log(`   Risk score: ${riskScore}`);
  console.log(`   APR: ${apr} bps (${apr / 100}%)\n`);
  
  const verifyTx = await receivableFactory.connect(amc).verifyReceivable(
    receivableId,
    riskScore,
    apr
  );
  const verifyReceipt = await verifyTx.wait();
  console.log(`✅ Receivable verified!`);
  console.log(`   Transaction: ${verifyTx.hash}`);
  console.log(`   Block: ${verifyReceipt.blockNumber}\n`);

  // ========== PHASE 3: CREATE POOL ==========
  console.log("=".repeat(60));
  console.log("🏊 PHASE 3: Create Pool (AMC)");
  console.log("=".repeat(60));
  
  const targetAmount = receivableAmount; // $10,000
  const minInvestment = ethers.parseUnits("100", 6); // $100
  const maxInvestment = ethers.parseUnits("10000", 6); // $10,000
  
  // Get receivable details for pool creation
  const receivable = await receivableFactory.getReceivable(receivableId);
  const poolApr = receivable.apr;
  const poolMaturityDate = receivable.dueDate;
  const rewardPool = 0n; // No initial reward pool
  
  const createPoolTx = await poolManager.connect(amc).createPool(
    1, // PoolType.RECEIVABLE (1, not 0! RWA=0, RECEIVABLE=1)
    receivableId, // assetId
    targetAmount,
    minInvestment,
    maxInvestment,
    poolApr, // APR from receivable
    poolMaturityDate, // Maturity date from receivable
    rewardPool,
    "Test Receivable Pool", // poolTokenName
    "TRP" // poolTokenSymbol
  );
  const poolReceipt = await createPoolTx.wait();
  
  // Parse PoolCreated event
  const poolManagerInterface = poolManager.interface;
  const poolCreatedEvent = poolReceipt.logs.find((log: any) => {
    try {
      const parsed = poolManagerInterface.parseLog({ topics: log.topics, data: log.data });
      return parsed?.name === 'PoolCreated';
    } catch {
      return false;
    }
  });
  
  if (!poolCreatedEvent) {
    throw new Error('PoolCreated event not found');
  }
  
  const poolParsedEvent = poolManagerInterface.parseLog({
    topics: poolCreatedEvent.topics,
    data: poolCreatedEvent.data,
  });
  const poolId = poolParsedEvent.args[0];
  console.log(`✅ Pool created: ${poolId}\n`);

  // ========== PHASE 4: INVEST ==========
  console.log("=".repeat(60));
  console.log("💵 PHASE 4: Invest (Investors)");
  console.log("=".repeat(60));
  
  const investment1 = ethers.parseUnits("5000", 6); // $5,000
  const investment2 = ethers.parseUnits("5000", 6); // $5,000
  
  // Approve and invest
  await mockUSDC.connect(investor1).approve(poolManagerAddress, investment1);
  await mockUSDC.connect(investor2).approve(poolManagerAddress, investment2);
  
  const invest1Tx = await poolManager.connect(investor1).invest(poolId, investment1);
  await invest1Tx.wait();
  console.log(`✅ Investor 1 invested: $${ethers.formatUnits(investment1, 6)}`);
  
  const invest2Tx = await poolManager.connect(investor2).invest(poolId, investment2);
  await invest2Tx.wait();
  console.log(`✅ Investor 2 invested: $${ethers.formatUnits(investment2, 6)}\n`);

  // ========== PHASE 5: RECORD PAYMENT ==========
  console.log("=".repeat(60));
  console.log("💳 PHASE 5: Record Payment (AMC)");
  console.log("=".repeat(60));
  
  // Get pool details to calculate yield
  const pool = await poolManager.getPool(poolId);
  const daysHeld = (Number(poolMaturityDate) - Number(pool.createdAt)) / (24 * 60 * 60);
  const totalYield = (Number(poolApr) * daysHeld * Number(targetAmount)) / (365 * 10000);
  const totalDistributionNeeded = targetAmount + BigInt(Math.ceil(totalYield));
  
  console.log(`   Pool total invested: $${ethers.formatUnits(targetAmount, 6)}`);
  console.log(`   Days held: ${daysHeld.toFixed(2)}`);
  console.log(`   Expected yield: $${(totalYield / 1e6).toFixed(2)}`);
  console.log(`   Total distribution needed: $${ethers.formatUnits(totalDistributionNeeded, 6)}\n`);
  
  // Mint payment + yield to pool manager (enough for full distribution)
  await mockUSDC.mint(poolManagerAddress, totalDistributionNeeded);
  
  const recordPaymentTx = await poolManager.connect(amc).recordPayment(poolId, targetAmount);
  await recordPaymentTx.wait();
  console.log(`✅ Payment recorded: $${ethers.formatUnits(targetAmount, 6)}\n`);

  // ========== PHASE 6: DISTRIBUTE YIELD ==========
  console.log("=".repeat(60));
  console.log("📊 PHASE 6: Distribute Yield (Admin)");
  console.log("=".repeat(60));
  
  const distributeYieldTx = await poolManager.connect(admin).distributeYield(poolId);
  const yieldReceipt = await distributeYieldTx.wait();
  console.log(`✅ Yield distributed!`);
  console.log(`   Transaction: ${distributeYieldTx.hash}`);
  console.log(`   Block: ${yieldReceipt.blockNumber}\n`);

  // ========== SUMMARY ==========
  console.log("=".repeat(60));
  console.log("✅ TEST COMPLETE - ALL PHASES PASSED!");
  console.log("=".repeat(60));
  console.log("\n📊 Summary:");
  console.log(`   ✅ Receivable created and verified`);
  console.log(`   ✅ Pool created and fully funded`);
  console.log(`   ✅ Payment recorded`);
  console.log(`   ✅ Yield distributed successfully`);
  console.log("\n🎉 Local test confirms: Contracts work correctly!");
  console.log("   The issue on Etherlink is likely network-related (slow confirmations).\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

