import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

async function main() {
  console.log("🧪 Testing Receivable Creation - Frontend Simulation\n");

  // Load deployment addresses
  const deploymentFile = path.join(__dirname, "../../deployments/novax-arbitrum-sepolia-421614.json");
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const contracts = deployment.contracts;

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const exporter = deployer; // Using deployer as exporter

  console.log("👤 Accounts:");
  console.log(`  Exporter: ${exporter.address}`);
  console.log("");

  // Get contract instances
  const NovaxReceivableFactory = await ethers.getContractFactory("NovaxReceivableFactory");
  const receivableFactory = NovaxReceivableFactory.attach(contracts.NovaxReceivableFactory);

  console.log("📋 Contract Address:");
  console.log(`  Receivable Factory: ${contracts.NovaxReceivableFactory}`);
  console.log("");

  // Simulate frontend parameters
  const importerAddress = exporter.address; // Same as frontend (using exporter address as importer)
  const amountUSD = ethers.parseUnits("1987", 6); // 1987 USDC (matches frontend: 1987000000 = 1987 USDC)
  
  // Frontend date: 2026-02-28 -> UTC timestamp
  const dueDateStr = "2026-02-28";
  const [year, month, day] = dueDateStr.split('-').map(Number);
  const dueDateObj = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  const dueDateTimestamp = Math.floor(dueDateObj.getTime() / 1000);
  
  // Metadata CID (simulate what frontend sends)
  const metadataCID = "test-metadata-cid-" + Date.now();
  const metadataCIDBytes32 = ethers.id(metadataCID);
  const importerApprovalId = ethers.ZeroHash;

  console.log("📊 Frontend Simulation Parameters:");
  console.log(`  Importer: ${importerAddress}`);
  console.log(`  Amount: ${ethers.formatUnits(amountUSD, 6)} USDC (${amountUSD.toString()} in 6 decimals)`);
  console.log(`  Due Date String: ${dueDateStr}`);
  console.log(`  Due Date Object: ${dueDateObj.toISOString()}`);
  console.log(`  Due Date Timestamp: ${dueDateTimestamp}`);
  console.log(`  Due Date as Date: ${new Date(dueDateTimestamp * 1000).toISOString()}`);
  console.log(`  Metadata CID: ${metadataCID}`);
  console.log(`  Metadata CID (bytes32): ${metadataCIDBytes32}`);
  console.log(`  Importer Approval ID: ${importerApprovalId}`);
  console.log("");

  // Get current block timestamp
  const currentBlock = await ethers.provider.getBlock('latest');
  const currentTimestamp = currentBlock?.timestamp || 0;
  console.log("⏰ Current Block Info:");
  console.log(`  Block Number: ${currentBlock?.number}`);
  console.log(`  Block Timestamp: ${currentTimestamp}`);
  console.log(`  Block Timestamp as Date: ${new Date(currentTimestamp * 1000).toISOString()}`);
  console.log(`  Difference: ${dueDateTimestamp - currentTimestamp} seconds`);
  console.log(`  Difference in days: ${(dueDateTimestamp - currentTimestamp) / (24 * 60 * 60)} days`);
  console.log("");

  // Check contract state
  console.log("🔍 Checking Contract State:");
  try {
    const isPaused = await receivableFactory.paused();
    console.log(`  Contract Paused: ${isPaused ? "❌ YES" : "✅ NO"}`);
    if (isPaused) {
      console.log("  ⚠️  Contract is paused - this will cause the transaction to fail!");
    }
  } catch (error) {
    console.log("  ⚠️  Could not check pause status");
  }

  try {
    const totalReceivables = await receivableFactory.totalReceivables();
    console.log(`  Total Receivables: ${totalReceivables}`);
  } catch (error) {
    console.log("  ⚠️  Could not get total receivables");
  }
  console.log("");

  // Validate parameters before calling
  console.log("✅ Pre-flight Validation:");
  if (amountUSD <= 0n) {
    console.log("  ❌ Amount must be greater than 0");
    process.exit(1);
  } else {
    console.log("  ✅ Amount > 0");
  }

  if (dueDateTimestamp <= currentTimestamp) {
    console.log(`  ❌ Due date (${dueDateTimestamp}) must be > current timestamp (${currentTimestamp})`);
    console.log(`     Difference: ${dueDateTimestamp - currentTimestamp} seconds`);
    process.exit(1);
  } else {
    console.log(`  ✅ Due date (${dueDateTimestamp}) > current timestamp (${currentTimestamp})`);
    console.log(`     Difference: ${dueDateTimestamp - currentTimestamp} seconds (${(dueDateTimestamp - currentTimestamp) / (24 * 60 * 60)} days)`);
  }

  if (metadataCIDBytes32 === ethers.ZeroHash) {
    console.log("  ❌ Metadata CID cannot be zero");
    process.exit(1);
  } else {
    console.log("  ✅ Metadata CID is not zero");
  }
  console.log("");

  // Try static call first (simulate transaction)
  console.log("🧪 Testing with static call (simulation)...");
  try {
    const result = await receivableFactory.createReceivable.staticCall(
      importerAddress,
      amountUSD,
      dueDateTimestamp,
      metadataCIDBytes32,
      importerApprovalId
    );
    console.log("  ✅ Static call succeeded!");
    console.log(`  Would create receivable ID: ${result}`);
  } catch (error: any) {
    console.log("  ❌ Static call failed!");
    console.log(`  Error: ${error.message || error.reason || JSON.stringify(error)}`);
    if (error.data) {
      console.log(`  Error data: ${error.data}`);
    }
    if (error.reason) {
      console.log(`  Revert reason: ${error.reason}`);
    }
    // Try to decode the error
    try {
      const decoded = receivableFactory.interface.parseError(error.data);
      console.log(`  Decoded error: ${decoded?.name} - ${decoded?.args}`);
    } catch (decodeError) {
      // Could not decode
    }
    process.exit(1);
  }
  console.log("");

  // Actually create the receivable
  console.log("📝 Creating receivable on-chain...");
  try {
    const tx = await receivableFactory.createReceivable(
      importerAddress,
      amountUSD,
      dueDateTimestamp,
      metadataCIDBytes32,
      importerApprovalId
    );
    console.log(`  Transaction hash: ${tx.hash}`);
    console.log("  Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log(`  ✅ Transaction confirmed in block ${receipt?.blockNumber}`);

    // Parse event
    const eventLog = receipt?.logs.find((log: any) => {
      try {
        const parsed = receivableFactory.interface.parseLog({ topics: log.topics, data: log.data });
        return parsed?.name === "ReceivableCreated";
      } catch {
        return false;
      }
    });

    if (eventLog) {
      const parsedEvent = receivableFactory.interface.parseLog({
        topics: eventLog.topics,
        data: eventLog.data,
      });
      const receivableId = parsedEvent?.args[0];
      console.log(`  ✅ Receivable created successfully!`);
      console.log(`  Receivable ID: ${receivableId}`);
    } else {
      console.log("  ⚠️  ReceivableCreated event not found");
    }
  } catch (error: any) {
    console.log("  ❌ Transaction failed!");
    console.log(`  Error: ${error.message || error.reason || JSON.stringify(error)}`);
    if (error.data) {
      console.log(`  Error data: ${error.data}`);
    }
    if (error.reason) {
      console.log(`  Revert reason: ${error.reason}`);
    }
    process.exit(1);
  }

  console.log("\n✅ Test completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


