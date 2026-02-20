import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

async function main() {
  console.log("🧪 Testing Novax contracts on Arbitrum Sepolia...\n");

  // Load deployment addresses
  const deploymentFile = path.join(__dirname, "../../deployments/novax-arbitrum-sepolia-421614.json");
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const contracts = deployment.contracts;

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  // Use deployer for all roles if only one signer available
  const exporter = signers[1] || deployer;
  const investor = signers[2] || deployer;
  
  console.log("Deployer:", deployer.address);
  console.log("Exporter:", exporter.address, exporter === deployer ? "(using deployer)" : "");
  console.log("Investor:", investor.address, investor === deployer ? "(using deployer)" : "");
  console.log("");
  
  if (signers.length === 1) {
    console.log("⚠️  Note: Using deployer for all roles (only one signer available)\n");
  }

  // Get contract instances
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = MockUSDC.attach(contracts.USDC);

  const NVXToken = await ethers.getContractFactory("NVXToken");
  const nvxToken = NVXToken.attach(contracts.NVXToken);

  const NovaxReceivableFactory = await ethers.getContractFactory("NovaxReceivableFactory");
  const receivableFactory = NovaxReceivableFactory.attach(contracts.NovaxReceivableFactory);

  const NovaxPoolManager = await ethers.getContractFactory("NovaxPoolManager");
  const poolManager = NovaxPoolManager.attach(contracts.NovaxPoolManager);

  const NovaxRwaFactory = await ethers.getContractFactory("NovaxRwaFactory");
  const rwaFactory = NovaxRwaFactory.attach(contracts.NovaxRwaFactory);

  // ============================================
  // TEST 1: Mint USDC for testing
  // ============================================
  console.log("📝 TEST 1: Minting USDC for testing...");
  try {
    const mintAmount = ethers.parseUnits("100000", 6); // 100,000 USDC
    const mintTx = await usdc.mint(exporter.address, mintAmount);
    await mintTx.wait();
    const exporterBalance = await usdc.balanceOf(exporter.address);
    console.log(`✅ Minted ${ethers.formatUnits(exporterBalance, 6)} USDC to exporter`);

    const mintTx2 = await usdc.mint(investor.address, mintAmount);
    await mintTx2.wait();
    const investorBalance = await usdc.balanceOf(investor.address);
    console.log(`✅ Minted ${ethers.formatUnits(investorBalance, 6)} USDC to investor\n`);
  } catch (error: any) {
    console.error("❌ USDC minting failed:", error.message);
    throw error;
  }

  // ============================================
  // TEST 2: Create Receivable
  // ============================================
  console.log("📝 TEST 2: Creating receivable...");
  let receivableId: string;
  try {
    const amountUSD = ethers.parseUnits("10000", 6); // $10,000
    const dueDate = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60; // 90 days from now
    const metadataCID = ethers.id("test-receivable-1"); // Mock IPFS CID
    const importer = ethers.ZeroAddress; // Off-chain importer

    const createTx = await receivableFactory.connect(exporter).createReceivable(
      importer,
      amountUSD,
      dueDate,
      metadataCID,
      ethers.ZeroHash // No importer approval ID
    );
    const receipt = await createTx.wait();

    // Parse event
    const event = receipt?.logs.find((log: any) => {
      try {
        const parsed = receivableFactory.interface.parseLog({ topics: log.topics, data: log.data });
        return parsed?.name === "ReceivableCreated";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = receivableFactory.interface.parseLog({ topics: event.topics, data: event.data });
      receivableId = parsed?.args[0];
      console.log(`✅ Receivable created: ${receivableId}`);
    } else {
      throw new Error("ReceivableCreated event not found");
    }
  } catch (error: any) {
    console.error("❌ Receivable creation failed:", error.message);
    throw error;
  }

  // ============================================
  // TEST 3: Verify Receivable (as AMC)
  // ============================================
  console.log("\n📝 TEST 3: Verifying receivable (as AMC)...");
  try {
    // Grant AMC_ROLE to deployer if not already granted
    const AMC_ROLE = await receivableFactory.AMC_ROLE();
    const hasRole = await receivableFactory.hasRole(AMC_ROLE, deployer.address);
    if (!hasRole) {
      console.log("   Granting AMC_ROLE to deployer...");
      const grantTx = await receivableFactory.grantRole(AMC_ROLE, deployer.address);
      await grantTx.wait();
    }

    const riskScore = 75;
    const apr = 1200; // 12% in basis points
    const verifyTx = await receivableFactory.connect(deployer).verifyReceivable(
      receivableId,
      riskScore,
      apr
    );
    await verifyTx.wait();

    // Check receivable status
    const receivable = await receivableFactory.receivables(receivableId);
    console.log(`✅ Receivable verified`);
    console.log(`   Status: ${receivable.status} (1 = VERIFIED)`);
    console.log(`   Risk Score: ${receivable.riskScore}`);
    console.log(`   APR: ${receivable.apr} bps (${Number(receivable.apr) / 100}%)`);
  } catch (error: any) {
    console.error("❌ Receivable verification failed:", error.message);
    throw error;
  }

  // ============================================
  // TEST 4: Create Pool
  // ============================================
  console.log("\n📝 TEST 4: Creating investment pool...");
  let poolId: string;
  try {
    const poolType = 1; // RECEIVABLE = 1 (RWA = 0)
    const targetAmount = ethers.parseUnits("10000", 6); // $10,000
    const minInvestment = ethers.parseUnits("100", 6); // $100
    const maxInvestment = ethers.parseUnits("10000", 6); // $10,000
    const apr = 1200; // 12% in basis points
    const maturityDate = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60; // 90 days
    const rewardPool = 0n; // No reward pool
    const poolTokenName = "Test Pool Token";
    const poolTokenSymbol = "TPT";

    // Grant AMC_ROLE to deployer for pool creation
    const AMC_ROLE = await poolManager.AMC_ROLE();
    const hasRole = await poolManager.hasRole(AMC_ROLE, deployer.address);
    if (!hasRole) {
      console.log("   Granting AMC_ROLE to deployer for pool creation...");
      const grantTx = await poolManager.grantRole(AMC_ROLE, deployer.address);
      await grantTx.wait();
    }

    const createPoolTx = await poolManager.connect(deployer).createPool(
      poolType,
      receivableId, // assetId for receivable-backed pool
      targetAmount,
      minInvestment,
      maxInvestment,
      apr,
      maturityDate,
      rewardPool,
      poolTokenName,
      poolTokenSymbol
    );
    const receipt = await createPoolTx.wait();

    // Parse event
    const event = receipt?.logs.find((log: any) => {
      try {
        const parsed = poolManager.interface.parseLog({ topics: log.topics, data: log.data });
        return parsed?.name === "PoolCreated";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = poolManager.interface.parseLog({ topics: event.topics, data: event.data });
      poolId = parsed?.args[0];
      console.log(`✅ Pool created: ${poolId}`);

      // Get pool info
      const poolInfo = await poolManager.pools(poolId);
      console.log(`   Target Amount: ${ethers.formatUnits(poolInfo.targetAmount, 6)} USDC`);
      console.log(`   Status: ${poolInfo.status} (1 = ACTIVE)`);
    } else {
      throw new Error("PoolCreated event not found");
    }
  } catch (error: any) {
    console.error("❌ Pool creation failed:", error.message);
    throw error;
  }

  // ============================================
  // TEST 5: Invest in Pool
  // ============================================
  console.log("\n📝 TEST 5: Investing in pool...");
  try {
    const investmentAmount = ethers.parseUnits("1000", 6); // $1,000

    // Approve USDC spending
    const approveTx = await usdc.connect(investor).approve(poolManager.target, investmentAmount);
    await approveTx.wait();
    console.log("   USDC approved for pool manager");

    // Invest
    const investTx = await poolManager.connect(investor).invest(poolId, investmentAmount);
    const receipt = await investTx.wait();
    console.log("✅ Investment successful");

    // Check pool token balance
    const poolInfo = await poolManager.pools(poolId);
    const poolTokenAddress = poolInfo.poolToken;
    const PoolToken = await ethers.getContractFactory("PoolToken");
    const poolToken = PoolToken.attach(poolTokenAddress);
    const investorBalance = await poolToken.balanceOf(investor.address);
    console.log(`   Investor pool token balance: ${ethers.formatEther(investorBalance)} tokens`);
    console.log(`   Pool total invested: ${ethers.formatUnits(poolInfo.totalInvested, 6)} USDC`);
  } catch (error: any) {
    console.error("❌ Investment failed:", error.message);
    throw error;
  }

  // ============================================
  // TEST 6: Check Pool Status
  // ============================================
  console.log("\n📝 TEST 6: Checking pool status...");
  try {
    const poolInfo = await poolManager.pools(poolId);
    console.log("✅ Pool Status:");
    console.log(`   Status: ${poolInfo.status} (1 = ACTIVE, 2 = FUNDED)`);
    console.log(`   Total Invested: ${ethers.formatUnits(poolInfo.totalInvested, 6)} USDC`);
    console.log(`   Target Amount: ${ethers.formatUnits(poolInfo.targetAmount, 6)} USDC`);
    console.log(`   Funding Progress: ${(Number(poolInfo.totalInvested) / Number(poolInfo.targetAmount) * 100).toFixed(2)}%`);
  } catch (error: any) {
    console.error("❌ Pool status check failed:", error.message);
    throw error;
  }

  // ============================================
  // TEST 7: Get All Receivables
  // ============================================
  console.log("\n📝 TEST 7: Getting all receivables...");
  try {
    const allReceivables = await receivableFactory.getAllReceivableIds();
    console.log(`✅ Total receivables: ${allReceivables.length}`);
    console.log(`   Receivables: ${allReceivables.map((id: string) => id.slice(0, 10) + "...").join(", ")}`);
  } catch (error: any) {
    console.error("❌ Get all receivables failed:", error.message);
    throw error;
  }

  // ============================================
  // TEST 8: Get All Pools
  // ============================================
  console.log("\n📝 TEST 8: Getting all pools...");
  try {
    const pools = await poolManager.getPoolsPaginated(0, 10);
    console.log(`✅ Total pools: ${pools.length}`);
    pools.forEach((pool: any, index: number) => {
      const poolId = pool.id || pool[0] || "unknown";
      const status = pool.status || pool[1] || "unknown";
      const poolIdStr = typeof poolId === 'string' ? poolId.slice(0, 10) + "..." : String(poolId).slice(0, 10) + "...";
      console.log(`   Pool ${index + 1}: ${poolIdStr} (Status: ${status})`);
    });
  } catch (error: any) {
    console.error("❌ Get all pools failed:", error.message);
    throw error;
  }

  console.log("\n✅ All tests passed!");
  console.log("\n📋 Summary:");
  console.log("===========");
  console.log(`✅ USDC minted and distributed`);
  console.log(`✅ Receivable created: ${receivableId}`);
  console.log(`✅ Receivable verified`);
  console.log(`✅ Pool created: ${poolId}`);
  console.log(`✅ Investment made`);
  console.log(`✅ All contract interactions working correctly`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });

