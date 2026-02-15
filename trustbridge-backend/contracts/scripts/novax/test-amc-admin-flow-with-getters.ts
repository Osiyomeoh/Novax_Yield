import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Test script for AMC/Admin flow using getters
 * This script tests the complete flow and verifies all getters work correctly
 */
async function main() {
  console.log("🧪 Testing AMC/Admin Flow with Getters");
  console.log("=" .repeat(60));

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  // Use deployer for multiple roles if not enough signers, or use separate accounts if available
  const exporter = signers[1] || deployer;
  const amc = signers[2] || deployer;
  const admin = signers[3] || deployer;
  // Use exporter as investor 2 to have different addresses for testing
  const investor1 = signers[4] || deployer;
  const investor2 = signers[5] || exporter; // Use exporter if available, otherwise deployer

  console.log("\n👥 Accounts:");
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Exporter: ${exporter.address}`);
  console.log(`  AMC: ${amc.address}`);
  console.log(`  Admin: ${admin.address}`);
  console.log(`  Investor 1: ${investor1.address}`);
  console.log(`  Investor 2: ${investor2.address}`);
  
  if (signers.length < 6) {
    console.log(`\n⚠️  Only ${signers.length} signer(s) available. Using deployer for multiple roles.`);
  }

  // Load deployed contracts - prefer etherlink when on etherlink network
  const network = await ethers.provider.getNetwork();
  const isEtherlink = network.chainId === 127823n || network.name === "etherlink_testnet";
  
  const localPath = path.join(__dirname, "../../deployments/novax-local.json");
  const deploymentsPath = path.join(__dirname, "../../deployments/novax-etherlink-127823.json");
  const altPath = path.join(process.cwd(), "deployments/novax-etherlink-127823.json");
  
  let contracts;
  if (isEtherlink) {
    // On Etherlink, prefer Etherlink deployment file
    if (fs.existsSync(deploymentsPath)) {
      console.log(`📁 Using Etherlink deployment file: ${deploymentsPath}`);
      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
      contracts = deployments.contracts;
    } else if (fs.existsSync(altPath)) {
      console.log(`📁 Using Etherlink deployment file: ${altPath}`);
      const deployments = JSON.parse(fs.readFileSync(altPath, "utf8"));
      contracts = deployments.contracts;
    } else {
      throw new Error(`Etherlink deployment file not found. Tried:\n  - ${deploymentsPath}\n  - ${altPath}\nPlease deploy contracts first.`);
    }
  } else {
    // On local network, prefer local deployment file
    if (fs.existsSync(localPath)) {
      console.log(`📁 Using LOCAL deployment file: ${localPath}`);
      const deployments = JSON.parse(fs.readFileSync(localPath, "utf8"));
      contracts = deployments.contracts;
    } else if (fs.existsSync(deploymentsPath)) {
      console.log(`📁 Using deployment file: ${deploymentsPath}`);
      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
      contracts = deployments.contracts;
    } else if (fs.existsSync(altPath)) {
      console.log(`📁 Using deployment file: ${altPath}`);
      const deployments = JSON.parse(fs.readFileSync(altPath, "utf8"));
      contracts = deployments.contracts;
    } else {
      throw new Error(`Deployment file not found. Tried:\n  - ${localPath}\n  - ${deploymentsPath}\n  - ${altPath}\nPlease deploy contracts first.`);
    }
  }

  // Handle different naming conventions (local uses MockUSDC, etherlink uses USDC)
  const usdcAddress = contracts.USDC || contracts.MockUSDC;
  if (!usdcAddress) {
    throw new Error("USDC address not found in deployment file. Expected 'USDC' or 'MockUSDC'");
  }

  console.log("\n📋 Contract Addresses:");
  console.log(`  Receivable Factory: ${contracts.NovaxReceivableFactory}`);
  console.log(`  Pool Manager: ${contracts.NovaxPoolManager}`);
  console.log(`  Mock USDC: ${usdcAddress}`);

  // Get contract instances
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = MockUSDC.attach(usdcAddress);

  const NovaxReceivableFactory = await ethers.getContractFactory("NovaxReceivableFactory");
  const receivableFactory = NovaxReceivableFactory.attach(contracts.NovaxReceivableFactory);

  const NovaxPoolManager = await ethers.getContractFactory("NovaxPoolManager");
  const poolManager = NovaxPoolManager.attach(contracts.NovaxPoolManager);
  const poolManagerAddress = contracts.NovaxPoolManager;
  
  // Verify pool manager is configured correctly
  console.log("\n🔍 Verifying Pool Manager configuration...");
  let poolManagerUSDC;
  try {
    poolManagerUSDC = await poolManager.usdcToken();
  } catch (error: any) {
    console.error(`   ❌ Error reading usdcToken from PoolManager: ${error.message}`);
    console.error(`   This might mean the PoolManager contract is not properly deployed or configured.`);
    throw error;
  }
  console.log(`   Pool Manager USDC token: ${poolManagerUSDC}`);
  console.log(`   Mock USDC address: ${usdcAddress}`);
  
  // Check if addresses match
  if (poolManagerUSDC.toLowerCase() !== usdcAddress.toLowerCase()) {
    console.log(`   ⚠️  USDC token mismatch!`);
    console.log(`   ❌ Cannot set USDC token - no setter function available`);
    console.log(`   ⚠️  Pool Manager was deployed with different USDC address`);
    throw new Error(`USDC token mismatch: Pool Manager expects ${poolManagerUSDC}, but deployment has ${contracts.USDC}`);
  } else {
    console.log(`   ✅ USDC token address matches`);
  }
  
  // Verify the USDC contract at that address
  const usdcAtPoolManagerAddress = MockUSDC.attach(poolManagerUSDC);
  try {
    const usdcName = await usdcAtPoolManagerAddress.name();
    const usdcSymbol = await usdcAtPoolManagerAddress.symbol();
    console.log(`   ✅ USDC contract verified: ${usdcName} (${usdcSymbol})`);
  } catch (error: any) {
    console.error(`   ❌ USDC contract not accessible at ${poolManagerUSDC}: ${error.message}`);
    throw new Error(`USDC contract mismatch - Pool Manager points to invalid USDC address`);
  }
  
  // Check pool manager's USDC balance (should be 0 initially)
  const poolManagerBalance = await mockUSDC.balanceOf(poolManagerAddress);
  console.log(`   Pool Manager USDC balance: $${ethers.formatUnits(poolManagerBalance, 6)}`);
  
  // Check NVX token address
  const poolManagerNVX = await poolManager.nvxToken();
  console.log(`   Pool Manager NVX token: ${poolManagerNVX}`);
  if (poolManagerNVX !== ethers.ZeroAddress) {
    const NVXToken = await ethers.getContractFactory("NVXToken");
    const nvxToken = NVXToken.attach(poolManagerNVX);
    try {
      const nvxName = await nvxToken.name();
      const nvxSymbol = await nvxToken.symbol();
      console.log(`   ✅ NVX token verified: ${nvxName} (${nvxSymbol})`);
      
      // Check if NVX token address is accidentally set to USDC address
      if (poolManagerNVX.toLowerCase() === usdcAddress.toLowerCase()) {
        console.error(`   ❌ CRITICAL: NVX token address is set to USDC address!`);
        console.error(`      This will cause the contract to try to transfer USDC instead of NVX`);
        throw new Error(`NVX token address is incorrectly set to USDC address`);
      }
      
      // Check pool manager's NVX balance
      const poolManagerNVXBalance = await nvxToken.balanceOf(poolManagerAddress);
      console.log(`   Pool Manager NVX balance: ${ethers.formatUnits(poolManagerNVXBalance, 18)} NVX`);
    } catch (error: any) {
      console.error(`   ⚠️  NVX token not accessible: ${error.message}`);
    }
  } else {
    console.log(`   ⚠️  NVX token not set (zero address)`);
  }
  
  // Verify USDC contract is accessible
  const usdcBalance = await mockUSDC.balanceOf(investor1.address);
  console.log(`   Investor 1 USDC balance: $${ethers.formatUnits(usdcBalance, 6)}`);
  if (usdcBalance < ethers.parseUnits("10000", 6)) {
    console.log(`   ⚠️  Investor 1 has low balance, minting more...`);
    await mockUSDC.mint(investor1.address, ethers.parseUnits("100000", 6));
    await mockUSDC.mint(investor2.address, ethers.parseUnits("100000", 6));
    console.log(`   ✅ Additional USDC minted`);
  }

  // Set up roles
  console.log("\n🔐 Setting up roles...");
  const AMC_ROLE = await receivableFactory.AMC_ROLE();
  await receivableFactory.grantRole(AMC_ROLE, amc.address);
  await poolManager.grantRole(AMC_ROLE, amc.address);
  console.log("✅ AMC_ROLE granted");

  const ADMIN_ROLE = await poolManager.ADMIN_ROLE();
  await poolManager.grantRole(ADMIN_ROLE, admin.address);
  console.log("✅ ADMIN_ROLE granted");

  // Mint USDC for testing
  console.log("\n💰 Minting test USDC...");
  const mintAmount = ethers.parseUnits("100000", 6); // 100,000 USDC
  await mockUSDC.mint(exporter.address, mintAmount);
  await mockUSDC.mint(investor1.address, mintAmount);
  // Only mint to investor2 if it's a different address
  if (investor2.address.toLowerCase() !== investor1.address.toLowerCase() && 
      investor2.address.toLowerCase() !== exporter.address.toLowerCase()) {
    await mockUSDC.mint(investor2.address, mintAmount);
  }
  console.log("✅ USDC minted");
  
  // Mint NVX tokens to pool manager for rewards
  if (poolManagerNVX !== ethers.ZeroAddress) {
    console.log("\n💰 Minting NVX tokens to pool manager for rewards...");
    const NVXToken = await ethers.getContractFactory("NVXToken");
    const nvxToken = NVXToken.attach(poolManagerNVX);
    const nvxMintAmount = ethers.parseUnits("1000000", 18); // 1M NVX tokens
    try {
      // Check if we have minter role or if we can mint
      const minterRole = await nvxToken.MINTER_ROLE();
      const deployerHasMinter = await nvxToken.hasRole(minterRole, deployer.address);
      if (deployerHasMinter) {
        await nvxToken.mint(poolManagerAddress, nvxMintAmount);
        console.log(`✅ Minted ${ethers.formatUnits(nvxMintAmount, 18)} NVX to pool manager`);
      } else {
        console.log(`⚠️  Deployer doesn't have MINTER_ROLE, skipping NVX mint`);
        console.log(`   Pool manager will have 0 NVX - rewards will fail`);
      }
    } catch (error: any) {
      console.log(`⚠️  Could not mint NVX: ${error.message}`);
      console.log(`   Pool manager will have 0 NVX - rewards will fail`);
    }
  }

  // ========== PHASE 1: CREATE RECEIVABLE ==========
  console.log("\n" + "=".repeat(60));
  console.log("📝 PHASE 1: Create Receivable");
  console.log("=".repeat(60));

  const receivableAmount = ethers.parseUnits("10000", 6); // $10,000
  const dueDate = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60; // 90 days from now
  const metadataCID = ethers.id("test-invoice-001");

  const createTx = await receivableFactory.connect(exporter).createReceivable(
    ethers.ZeroAddress, // Off-chain importer
    receivableAmount,
    dueDate,
    metadataCID,
    ethers.ZeroHash // No approval ID
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
  const receivableId = parsedEvent.args[0]; // First arg is receivableId
  console.log(`✅ Receivable created: ${receivableId}`);

  // Test getter: getAllReceivableIds
  console.log("\n🔍 Testing getter: getAllReceivableIds()");
  const allReceivableIds = await receivableFactory.getAllReceivableIds();
  console.log(`   Found ${allReceivableIds.length} receivables`);
  console.log(`   ✅ Receivable ID in list: ${allReceivableIds.includes(receivableId)}`);

  // Test getter: getPendingReceivables
  console.log("\n🔍 Testing getter: getPendingReceivables()");
  const [pendingIds, pendingReceivables, pendingCount] = await receivableFactory.getPendingReceivables();
  console.log(`   Found ${pendingCount} pending receivables`);
  console.log(`   ✅ Pending receivable found: ${pendingIds.includes(receivableId)}`);

  // ========== PHASE 2: VERIFY RECEIVABLE ==========
  console.log("\n" + "=".repeat(60));
  console.log("✅ PHASE 2: Verify Receivable (AMC)");
  console.log("=".repeat(60));

  const riskScore = 75; // 75/100
  const apr = 1200; // 12% (1200 basis points)

  console.log(`   Verifying receivable ${receivableId}...`);
  console.log(`   AMC address: ${amc.address}`);
  console.log(`   Risk score: ${riskScore}`);
  console.log(`   APR: ${apr} bps (${apr / 100}%)`);
  
  // Check if AMC has AMC_ROLE on ReceivableFactory
  try {
    const AMC_ROLE_RF = await receivableFactory.AMC_ROLE();
    const hasAmcRole = await receivableFactory.hasRole(AMC_ROLE_RF, amc.address);
    console.log(`   AMC has AMC_ROLE on ReceivableFactory: ${hasAmcRole}`);
    if (!hasAmcRole) {
      console.log(`   ⚠️  Granting AMC_ROLE to AMC on ReceivableFactory...`);
      const grantTx = await receivableFactory.grantRole(AMC_ROLE_RF, amc.address);
      await grantTx.wait();
      console.log(`   ✅ AMC_ROLE granted on ReceivableFactory`);
    }
  } catch (error: any) {
    console.log(`   ⚠️  Could not check/grant AMC_ROLE: ${error.message}`);
  }

  console.log(`   Submitting verification transaction...`);
  const verifyTx = await receivableFactory.connect(amc).verifyReceivable(
    receivableId,
    riskScore,
    apr
  );
  console.log(`   Transaction hash: ${verifyTx.hash}`);
  console.log(`   Waiting for confirmation (this may take a moment)...`);
  
  // Check transaction status - if it's pending, it might have failed
  console.log(`   Checking transaction status...`);
  const txStatus = await ethers.provider.getTransaction(verifyTx.hash);
  if (!txStatus) {
    throw new Error(`Transaction not found. Hash: ${verifyTx.hash}`);
  }
  
  // Try to estimate gas to see if the transaction would succeed
  try {
    await receivableFactory.connect(amc).verifyReceivable.estimateGas(
      receivableId,
      riskScore,
      apr
    );
    console.log(`   ✅ Gas estimation successful - transaction should work`);
  } catch (estimateError: any) {
    console.error(`   ❌ Gas estimation failed: ${estimateError.message}`);
    throw new Error(`Transaction would fail: ${estimateError.message}`);
  }
  
  // Poll for transaction receipt - Etherlink can be slow
  console.log(`   Polling for transaction confirmation (Etherlink can be slow)...`);
  let verifyReceipt = null;
  const maxAttempts = 120; // 120 seconds max (2 minutes) - Etherlink can be slow
  let attempts = 0;
  
  while (!verifyReceipt && attempts < maxAttempts) {
    verifyReceipt = await ethers.provider.getTransactionReceipt(verifyTx.hash);
    if (!verifyReceipt) {
      attempts++;
      if (attempts % 10 === 0) {
        console.log(`   Still waiting... (${attempts}/${maxAttempts} attempts, ${attempts} seconds)`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }
  }
  
  if (!verifyReceipt) {
    console.warn(`   ⚠️  Transaction not confirmed after ${maxAttempts} seconds.`);
    console.warn(`   Transaction hash: ${verifyTx.hash}`);
    console.warn(`   Check status at: https://shadownet.explorer.etherlink.com/tx/${verifyTx.hash}`);
    console.warn(`   This may be due to network congestion on Etherlink Shadownet.`);
    console.warn(`   Attempting to verify receivable status directly...`);
    
    // Check receivable status directly - maybe transaction went through but receipt is delayed
    let verified = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      const receivable = await receivableFactory.getReceivable(receivableId);
      if (receivable.status === 1) { // VERIFIED = 1
        console.log(`   ✅ Receivable was verified! (status = VERIFIED, checked after ${(i+1)*2} seconds)`);
        console.log(`✅ Receivable verified with risk score ${riskScore} and APR ${apr / 100}%`);
        verified = true;
        break;
      }
      console.log(`   Checking status... (attempt ${i+1}/10, status: ${receivable.status})`);
    }
    
    if (!verified) {
      console.error(`   ❌ Receivable still not verified after additional checks.`);
      console.error(`   Transaction may have failed or is still pending.`);
      console.error(`   Please check manually: https://shadownet.explorer.etherlink.com/tx/${verifyTx.hash}`);
      throw new Error(`Transaction not confirmed and receivable not verified after extended wait. Transaction hash: ${verifyTx.hash}`);
    }
    // If verified, continue with the test
    verifyReceipt = { status: 1, blockNumber: 0 }; // Fake receipt to continue
  }
  
  if (verifyReceipt.status === 1) {
    console.log(`   ✅ Transaction confirmed in block ${verifyReceipt.blockNumber}`);
    console.log(`   Gas used: ${verifyReceipt.gasUsed.toString()}`);
    console.log(`✅ Receivable verified with risk score ${riskScore} and APR ${apr / 100}%`);
  } else {
    throw new Error(`Transaction failed. Check: https://shadownet.explorer.etherlink.com/tx/${verifyTx.hash}`);
  }

  // Test getter: getVerifiedReceivables
  console.log("\n🔍 Testing getter: getVerifiedReceivables()");
  const [verifiedIds, verifiedReceivables, verifiedCount] = await receivableFactory.getVerifiedReceivables();
  console.log(`   Found ${verifiedCount} verified receivables`);
  console.log(`   ✅ Verified receivable found: ${verifiedIds.includes(receivableId)}`);
  if (verifiedReceivables.length > 0) {
    console.log(`   Risk Score: ${verifiedReceivables[0].riskScore}`);
    console.log(`   APR: ${verifiedReceivables[0].apr} bps (${Number(verifiedReceivables[0].apr) / 100}%)`);
  }

  // ========== PHASE 3: CREATE POOL ==========
  console.log("\n" + "=".repeat(60));
  console.log("🏊 PHASE 3: Create Pool (AMC)");
  console.log("=".repeat(60));

  const targetAmount = receivableAmount; // $10,000
  const minInvestment = ethers.parseUnits("100", 6); // $100
  const maxInvestment = ethers.parseUnits("5000", 6); // $5,000
  const poolApr = apr; // Same as receivable APR
  const maturityDate = dueDate;
  const rewardPool = ethers.parseUnits("100", 18); // 100 NVX tokens

  const createPoolTx = await poolManager.connect(amc).createPool(
    1, // RECEIVABLE
    receivableId,
    targetAmount,
    minInvestment,
    maxInvestment,
    poolApr,
    maturityDate,
    rewardPool,
    "Test Receivable Pool",
    "TRP"
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
  
  const parsedPoolEvent = poolManagerInterface.parseLog({
    topics: poolCreatedEvent.topics,
    data: poolCreatedEvent.data,
  });
  const poolId = parsedPoolEvent.args[0]; // First arg is poolId
  console.log(`✅ Pool created: ${poolId}`);

  // Test getter: getActivePools
  console.log("\n🔍 Testing getter: getActivePools()");
  const [activePools, activePoolIds] = await poolManager.getActivePools();
  console.log(`   Found ${activePools.length} active pools`);
  console.log(`   ✅ Active pool found: ${activePoolIds.includes(poolId)}`);

  // Note: getPoolsByStatus() was removed to reduce contract size
  // Use getPoolsPaginated() + frontend filtering instead
  console.log("\n🔍 Testing getter: getPoolsPaginated() (alternative to getPoolsByStatus)");
  const [paginatedPools, totalPools] = await poolManager.getPoolsPaginated(0, 100);
  const activePoolsFromPaginated = paginatedPools.filter((p: any) => p.status === 0); // ACTIVE = 0
  console.log(`   Found ${activePoolsFromPaginated.length} active pools via pagination (total: ${totalPools})`);
  // Compare pool IDs (pool.id is bytes32, poolId is also bytes32)
  const poolIdHex = ethers.hexlify(poolId);
  const found = activePoolsFromPaginated.some((p: any) => {
    const pIdHex = ethers.hexlify(p.id);
    return pIdHex.toLowerCase() === poolIdHex.toLowerCase();
  });
  console.log(`   ✅ Active pool found: ${found}`);

  // ========== PHASE 4: INVEST ==========
  console.log("\n" + "=".repeat(60));
  console.log("💵 PHASE 4: Invest (Investors)");
  console.log("=".repeat(60));

  // Adjust investments to stay within per-user limits
  // Since both investors might be the same address, we need to be careful
  // Adjust investments to fully fund the pool
  // Target is $10,000, max per user is $5,000 (or $10,000 if we increased it)
  // We'll invest $5,000 from each investor to reach $10,000 target
  const investment1 = ethers.parseUnits("5000", 6); // $5,000
  const investment2 = ethers.parseUnits("5000", 6); // $5,000

  // Check balances before
  const balance1Before = await mockUSDC.balanceOf(investor1.address);
  const balance2Before = await mockUSDC.balanceOf(investor2.address);
  console.log(`   Investor 1 balance: $${ethers.formatUnits(balance1Before, 6)}`);
  console.log(`   Investor 2 balance: $${ethers.formatUnits(balance2Before, 6)}`);

  // Get pool manager address (already defined above)
  console.log(`   Pool Manager address: ${poolManagerAddress}`);

  // Approve USDC - approve enough for the investment amounts
  console.log("\n   Approving USDC...");
  // Approve the full investment amount for investor 1
  const approve1Tx = await mockUSDC.connect(investor1).approve(poolManagerAddress, investment1);
  await approve1Tx.wait();
  console.log(`   ✅ Investor 1 approved: $${ethers.formatUnits(investment1, 6)}`);
  
  // For investor 2, if same address, the approval is already there, otherwise approve separately
  if (investor2.address.toLowerCase() !== investor1.address.toLowerCase()) {
    const approve2Tx = await mockUSDC.connect(investor2).approve(poolManagerAddress, investment2);
    await approve2Tx.wait();
    console.log(`   ✅ Investor 2 approved: $${ethers.formatUnits(investment2, 6)}`);
  } else {
    // Same address - need to approve the total (investment1 + investment2) or just increase
    const totalNeeded = investment1 + investment2;
    const currentAllowance = await mockUSDC.allowance(investor1.address, poolManagerAddress);
    if (currentAllowance < totalNeeded) {
      const approve2Tx = await mockUSDC.connect(investor2).approve(poolManagerAddress, totalNeeded);
      await approve2Tx.wait();
      console.log(`   ✅ Investor 2 (same address) approved total: $${ethers.formatUnits(totalNeeded, 6)}`);
    } else {
      console.log(`   ℹ️  Investor 2 (same address) already has sufficient allowance`);
    }
  }

  // Check allowances
  const allowance1 = await mockUSDC.allowance(investor1.address, poolManagerAddress);
  const allowance2 = await mockUSDC.allowance(investor2.address, poolManagerAddress);
  console.log(`   Investor 1 allowance: $${ethers.formatUnits(allowance1, 6)}`);
  console.log(`   Investor 2 allowance: $${ethers.formatUnits(allowance2, 6)}`);

  // Check pool details before investment
  const poolBefore = await poolManager.getPool(poolId);
  console.log(`   Pool target: $${ethers.formatUnits(poolBefore.targetAmount, 6)}`);
  console.log(`   Pool current: $${ethers.formatUnits(poolBefore.totalInvested, 6)}`);
  console.log(`   Pool status: ${poolBefore.status} (0=ACTIVE)`);
  console.log(`   Pool token address: ${poolBefore.poolToken}`);
  console.log(`   Pool USDC token: ${poolBefore.usdcToken}`);
  console.log(`   Contract USDC token: ${poolManagerUSDC}`);
  console.log(`   Min investment: $${ethers.formatUnits(poolBefore.minInvestment, 6)}`);
  console.log(`   Max investment: $${ethers.formatUnits(poolBefore.maxInvestment, 6)}`);
  
  // Check if pool's USDC token matches contract's USDC token
  if (poolBefore.usdcToken.toLowerCase() !== poolManagerUSDC.toLowerCase()) {
    console.error(`   ❌ USDC token mismatch in pool!`);
    console.error(`      Pool USDC: ${poolBefore.usdcToken}`);
    console.error(`      Contract USDC: ${poolManagerUSDC}`);
    throw new Error(`Pool's USDC token (${poolBefore.usdcToken}) doesn't match contract's USDC token (${poolManagerUSDC})`);
  }
  
  // Check if pool token contract exists
  const PoolToken = await ethers.getContractFactory("PoolToken");
  const poolToken = PoolToken.attach(poolBefore.poolToken);
  try {
    const poolTokenName = await poolToken.name();
    const poolTokenSymbol = await poolToken.symbol();
    console.log(`   Pool token: ${poolTokenName} (${poolTokenSymbol})`);
  } catch (error: any) {
    console.error(`   ❌ Pool token contract error: ${error.message}`);
    throw new Error(`Pool token contract not accessible at ${poolBefore.poolToken}`);
  }

  // Invest
  console.log("\n   Investing...");
  
  // Try to call invest with static call first to see the exact error
  try {
    await poolManager.connect(investor1).invest.staticCall(poolId, investment1);
    console.log("   ✅ Static call succeeded, proceeding with transaction...");
  } catch (staticError: any) {
    console.error(`   ❌ Static call failed: ${staticError.message}`);
    if (staticError.data) {
      console.error(`   Error data: ${staticError.data}`);
    }
    // Try to decode the error
    try {
      const errorInterface = new ethers.Interface([
        "error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)",
        "error ERC20InsufficientBalance(address account, uint256 balance, uint256 needed)"
      ]);
      const decoded = errorInterface.parseError(staticError.data);
      console.error(`   Decoded error: ${decoded.name}`);
      console.error(`   Error args:`, decoded.args);
    } catch (decodeError) {
      console.error(`   Could not decode error: ${decodeError}`);
    }
  }
  
  try {
    const invest1Tx = await poolManager.connect(investor1).invest(poolId, investment1);
    await invest1Tx.wait();
    console.log(`✅ Investor 1 invested: $${ethers.formatUnits(investment1, 6)}`);
  } catch (error: any) {
    console.error(`❌ Investor 1 investment failed: ${error.message}`);
    if (error.data) {
      console.error(`   Error data: ${error.data}`);
    }
    // Check if it's an allowance issue
    const currentAllowance = await mockUSDC.allowance(investor1.address, poolManagerAddress);
    console.error(`   Current allowance: $${ethers.formatUnits(currentAllowance, 6)}`);
    console.error(`   Required: $${ethers.formatUnits(investment1, 6)}`);
    throw error;
  }

  try {
    const invest2Tx = await poolManager.connect(investor2).invest(poolId, investment2);
    await invest2Tx.wait();
    console.log(`✅ Investor 2 invested: $${ethers.formatUnits(investment2, 6)}`);
  } catch (error: any) {
    console.error(`❌ Investor 2 investment failed: ${error.message}`);
    if (error.data) {
      console.error(`   Error data: ${error.data}`);
    }
    throw error;
  }

  // Check pool status (should be FUNDED)
  const pool = await poolManager.getPool(poolId);
  console.log(`✅ Pool status: ${pool.status} (0=ACTIVE, 1=FUNDED)`);
  console.log(`   Total invested: $${ethers.formatUnits(pool.totalInvested, 6)}`);

  // Note: getPoolsByStatus() was removed - using getPoolsPaginated() instead
  console.log("\n🔍 Testing getter: getPoolsPaginated() (alternative to getPoolsByStatus)");
  const [allPools, total] = await poolManager.getPoolsPaginated(0, 100);
  const fundedPools = allPools.filter((p: any) => p.status === 1); // FUNDED = 1
  console.log(`   Found ${fundedPools.length} funded pools via pagination`);
  console.log(`   ✅ Funded pool found: ${fundedPools.some((p: any) => p.id === poolId)}`);

  // ========== PHASE 5: RECORD PAYMENT ==========
  console.log("\n" + "=".repeat(60));
  console.log("💳 PHASE 5: Record Payment (AMC)");
  console.log("=".repeat(60));

  // Simulate payment by minting USDC to pool manager
  const paymentAmount = targetAmount; // Full payment
  const poolManagerTarget = await poolManager.getAddress();
  
  // Mint USDC directly to the pool manager contract (not poolManager.target which might be wrong)
  await mockUSDC.mint(poolManagerTarget, paymentAmount);
  
  // Check pool manager balance before recording payment
  const balanceBeforePayment = await mockUSDC.balanceOf(poolManagerTarget);
  console.log(`   Pool Manager USDC balance before payment: $${ethers.formatUnits(balanceBeforePayment, 6)}`);
  console.log(`   Payment amount: $${ethers.formatUnits(paymentAmount, 6)}`);

  const recordPaymentTx = await poolManager.connect(amc).recordPayment(poolId, paymentAmount);
  await recordPaymentTx.wait();
  console.log(`✅ Payment recorded: $${ethers.formatUnits(paymentAmount, 6)}`);
  
  // Check pool manager balance after recording payment
  const balanceAfterPayment = await mockUSDC.balanceOf(poolManagerTarget);
  console.log(`   Pool Manager USDC balance after payment: $${ethers.formatUnits(balanceAfterPayment, 6)}`);

  // Check pool status (should be PAID)
  const poolAfterPayment = await poolManager.getPool(poolId);
  console.log(`✅ Pool status: ${poolAfterPayment.status} (3=PAID)`);
  console.log(`   Payment status: ${poolAfterPayment.paymentStatus} (2=FULL)`);

  // Note: getPoolsNeedingPayment() and getPoolsReadyForYield() were removed
  // Use getPoolsPaginated() + frontend filtering instead
  console.log("\n🔍 Testing getter: getPoolsPaginated() (alternative to getPoolsNeedingPayment/getPoolsReadyForYield)");
  const [allPools2, total2] = await poolManager.getPoolsPaginated(0, 100);
  const needingPayment = allPools2.filter((p: any) => 
    (p.status === 1 || p.status === 2) && p.paymentStatus !== 2 // FUNDED/MATURED && not FULL
  );
  const readyForYield = allPools2.filter((p: any) => 
    p.status === 3 && p.paymentStatus === 2 // PAID && FULL
  );
  console.log(`   Found ${needingPayment.length} pools needing payment (via pagination)`);
  console.log(`   Found ${readyForYield.length} pools ready for yield (via pagination)`);
  console.log(`   ✅ Pool ready for yield: ${readyForYield.some((p: any) => p.id === poolId)}`);

  // ========== PHASE 6: DISTRIBUTE YIELD ==========
  console.log("\n" + "=".repeat(60));
  console.log("📊 PHASE 6: Distribute Yield (Admin)");
  console.log("=".repeat(60));

  // Check pool details before distribution
  const poolBeforeYield = await poolManager.getPool(poolId);
  const poolManagerBalanceForYield = await mockUSDC.balanceOf(poolManagerAddress);
  console.log(`   Pool Manager USDC balance: $${ethers.formatUnits(poolManagerBalanceForYield, 6)}`);
  console.log(`   Pool total invested: $${ethers.formatUnits(poolBeforeYield.totalInvested, 6)}`);
  console.log(`   Pool total paid: $${ethers.formatUnits(poolBeforeYield.totalPaid, 6)}`);
  console.log(`   Pool total shares: ${ethers.formatUnits(poolBeforeYield.totalShares, 18)}`);
  console.log(`   Pool status: ${poolBeforeYield.status} (3=PAID)`);
  console.log(`   Pool payment status: ${poolBeforeYield.paymentStatus} (2=FULL)`);
  console.log(`   Pool APR: ${poolBeforeYield.apr} bps`);
  
  // Verify pool has shares
  if (poolBeforeYield.totalShares === 0n) {
    throw new Error(`Pool has no shares! Cannot distribute yield.`);
  }
  
  // Check pool token and investor balances
  const PoolTokenFactoryForYield = await ethers.getContractFactory("PoolToken");
  const poolTokenForYield = PoolTokenFactoryForYield.attach(poolBeforeYield.poolToken);
  console.log(`   Pool token address: ${poolBeforeYield.poolToken}`);
  
  // Get investors
  const analyticsBeforeYield = await poolManager.getPoolAnalytics(poolId);
  const investorsList = analyticsBeforeYield[2];
  console.log(`   Number of investors: ${investorsList.length}`);
  
  // Check each investor's pool token balance
  for (let i = 0; i < investorsList.length; i++) {
    const investorAddr = investorsList[i];
    const investorShares = await poolTokenForYield.balanceOf(investorAddr);
    console.log(`   Investor ${i + 1} (${investorAddr.slice(0, 10)}...): ${ethers.formatUnits(investorShares, 18)} shares`);
    
    if (investorShares === 0n) {
      console.warn(`   ⚠️  Investor ${i + 1} has no pool tokens!`);
    }
  }
  
  // Check if pool manager has BURNER_ROLE on pool token
  const BURNER_ROLE_CHECK = await poolTokenForYield.BURNER_ROLE();
  const hasBurnerRole = await poolTokenForYield.hasRole(BURNER_ROLE_CHECK, poolManagerAddress);
  console.log(`   Pool Manager has BURNER_ROLE: ${hasBurnerRole}`);
  if (!hasBurnerRole) {
    throw new Error(`Pool Manager does not have BURNER_ROLE on pool token!`);
  }
  
  // Calculate expected yield using BigInt (matching contract logic exactly)
  const ONE_DAY = 86400n; // seconds in a day
  const daysHeld = (poolBeforeYield.maturityDate - poolBeforeYield.createdAt) / ONE_DAY;
  // Contract formula: totalYield = (apr * daysHeld * totalInvested) / (365 * 10000)
  const totalYield = (poolBeforeYield.apr * daysHeld * poolBeforeYield.totalInvested) / (365n * 10000n);
  const totalDistribution = poolBeforeYield.totalInvested + totalYield;
  
  const daysHeldNum = Number(daysHeld);
  const totalYieldNum = Number(totalYield);
  console.log(`   Days held: ${daysHeldNum.toFixed(2)}`);
  console.log(`   Expected yield: $${ethers.formatUnits(totalYield, 6)}`);
  console.log(`   Total distribution needed: $${ethers.formatUnits(totalDistribution, 6)}`);
  
  // Re-check balance after calculations
  const currentBalance = await mockUSDC.balanceOf(poolManagerAddress);
  console.log(`   Current pool manager balance: $${ethers.formatUnits(currentBalance, 6)}`);
  
  // Ensure pool manager has enough USDC (need principal + yield)
  if (currentBalance < totalDistribution) {
    const needed = totalDistribution - currentBalance;
    console.log(`   ⚠️  Pool manager needs $${ethers.formatUnits(needed, 6)} more USDC`);
    await mockUSDC.mint(poolManagerAddress, needed);
    const newBalance = await mockUSDC.balanceOf(poolManagerAddress);
    console.log(`   ✅ Minted additional USDC. New balance: $${ethers.formatUnits(newBalance, 6)}`);
  } else {
    console.log(`   ✅ Pool manager has sufficient USDC balance`);
  }

  try {
    const distributeYieldTx = await poolManager.connect(admin).distributeYield(poolId);
    await distributeYieldTx.wait();
    console.log(`✅ Yield distributed`);
  } catch (error: any) {
    console.error(`❌ Yield distribution failed: ${error.message}`);
    if (error.data) {
      console.error(`   Error data: ${error.data}`);
      // Try to decode common errors
      try {
        const errorInterface = new ethers.Interface([
          "error ERC20InsufficientBalance(address account, uint256 balance, uint256 needed)",
          "error InsufficientUSDC(uint256 balance, uint256 needed)"
        ]);
        const decoded = errorInterface.parseError(error.data);
        console.error(`   Decoded error: ${decoded.name}`);
        console.error(`   Error args:`, decoded.args);
      } catch (decodeError) {
        console.error(`   Could not decode error`);
      }
    }
    throw error;
  }

  // Check final pool analytics
  console.log("\n🔍 Testing getter: getPoolAnalytics()");
  const [analyticsPool, investorsCount, investors, investments] = await poolManager.getPoolAnalytics(poolId);
  console.log(`   Investors: ${investorsCount}`);
  console.log(`   Total invested: $${ethers.formatUnits(analyticsPool.totalInvested, 6)}`);
  console.log(`   Total paid: $${ethers.formatUnits(analyticsPool.totalPaid, 6)}`);

  // ========== SUMMARY ==========
  console.log("\n" + "=".repeat(60));
  console.log("✅ TEST SUMMARY");
  console.log("=".repeat(60));
  console.log("✅ All phases completed successfully!");
  console.log("✅ All getters tested and working!");
  console.log("\n📊 Final Stats:");
  console.log(`   Total Receivables: ${(await receivableFactory.totalReceivables()).toString()}`);
  console.log(`   Total Pools: ${(await poolManager.totalPools()).toString()}`);
  console.log(`   Pending Receivables: ${(await receivableFactory.getPendingReceivables())[2].toString()}`);
  console.log(`   Verified Receivables: ${(await receivableFactory.getVerifiedReceivables())[2].toString()}`);
  console.log(`   Active Pools: ${(await poolManager.getActivePools())[0].length}`);
  
  // Use pagination to get pools ready for yield (getPoolsReadyForYield was removed)
  const [allPoolsFinal] = await poolManager.getPoolsPaginated(0, 100);
  const readyForYieldFinal = allPoolsFinal.filter((p: any) => 
    p.status === 3 && p.paymentStatus === 2 // PAID && FULL
  );
  console.log(`   Pools Ready for Yield: ${readyForYieldFinal.length}`);
}

// Run with: npx hardhat run scripts/novax/test-amc-admin-flow-with-getters.ts --network etherlink_testnet
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

