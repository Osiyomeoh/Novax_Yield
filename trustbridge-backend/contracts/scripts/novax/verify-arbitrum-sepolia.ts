import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

async function main() {
  console.log("🔍 Verifying contracts on Arbitrum Sepolia...\n");

  // Check for Arbiscan API key
  if (!process.env.ARBISCAN_API_KEY && !process.env.ETHERSCAN_API_KEY) {
    console.error("❌ Error: ARBISCAN_API_KEY or ETHERSCAN_API_KEY not set in .env");
    console.error("   Get your API key from: https://arbiscan.io/apis");
    process.exit(1);
  }

  // Load deployment addresses
  const deploymentFile = path.join(__dirname, "../../deployments/novax-arbitrum-sepolia-421614.json");
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const contracts = deployment.contracts;
  const config = deployment.configuration;

  console.log("📋 Contracts to verify:");
  console.log("====================\n");

  // Verify MockUSDC
  if (contracts.USDC) {
    console.log("1️⃣  Verifying MockUSDC...");
    try {
      await run("verify:verify", {
        address: contracts.USDC,
        constructorArguments: [],
        network: "arbitrumSepolia",
      });
      console.log("   ✅ MockUSDC verified\n");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("   ⚠️  MockUSDC already verified\n");
      } else {
        console.log(`   ❌ MockUSDC verification failed: ${error.message}\n`);
      }
    }
  }

  // Verify NVX Token
  if (contracts.NVXToken) {
    console.log("2️⃣  Verifying NVX Token...");
    try {
      await run("verify:verify", {
        address: contracts.NVXToken,
        constructorArguments: [],
        network: "arbitrumSepolia",
      });
      console.log("   ✅ NVX Token verified\n");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("   ⚠️  NVX Token already verified\n");
      } else {
        console.log(`   ❌ NVX Token verification failed: ${error.message}\n`);
      }
    }
  }

  // Verify RWA Factory
  if (contracts.NovaxRwaFactory) {
    console.log("3️⃣  Verifying RWA Factory...");
    try {
      await run("verify:verify", {
        address: contracts.NovaxRwaFactory,
        constructorArguments: [],
        network: "arbitrumSepolia",
      });
      console.log("   ✅ RWA Factory verified\n");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("   ⚠️  RWA Factory already verified\n");
      } else {
        console.log(`   ❌ RWA Factory verification failed: ${error.message}\n`);
      }
    }
  }

  // Verify Receivable Factory
  if (contracts.NovaxReceivableFactory) {
    console.log("4️⃣  Verifying Receivable Factory...");
    try {
      await run("verify:verify", {
        address: contracts.NovaxReceivableFactory,
        constructorArguments: [],
        network: "arbitrumSepolia",
      });
      console.log("   ✅ Receivable Factory verified\n");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("   ⚠️  Receivable Factory already verified\n");
      } else {
        console.log(`   ❌ Receivable Factory verification failed: ${error.message}\n`);
      }
    }
  }

  // Verify Exporter Registry
  if (contracts.NovaxExporterRegistry) {
    console.log("5️⃣  Verifying Exporter Registry...");
    try {
      await run("verify:verify", {
        address: contracts.NovaxExporterRegistry,
        constructorArguments: [],
        network: "arbitrumSepolia",
      });
      console.log("   ✅ Exporter Registry verified\n");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("   ⚠️  Exporter Registry already verified\n");
      } else {
        console.log(`   ❌ Exporter Registry verification failed: ${error.message}\n`);
      }
    }
  }

  // Verify Pool Manager (has constructor arguments)
  if (contracts.NovaxPoolManager) {
    console.log("6️⃣  Verifying Pool Manager...");
    try {
      await run("verify:verify", {
        address: contracts.NovaxPoolManager,
        constructorArguments: [
          contracts.USDC,
          contracts.NVXToken,
          config.platformTreasury,
          config.amcAddress,
          config.platformFeeBps,
          config.amcFeeBps,
        ],
        network: "arbitrumSepolia",
      });
      console.log("   ✅ Pool Manager verified\n");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("   ⚠️  Pool Manager already verified\n");
      } else {
        console.log(`   ❌ Pool Manager verification failed: ${error.message}\n`);
      }
    }
  }

  // Verify Price Manager
  if (contracts.NovaxPriceManager) {
    console.log("7️⃣  Verifying Price Manager...");
    try {
      const chainlink = deployment.chainlink;
      await run("verify:verify", {
        address: contracts.NovaxPriceManager,
        constructorArguments: [
          chainlink.ETH_USD,
          chainlink.BTC_USD,
          chainlink.USDC_USD,
          chainlink.LINK_USD,
        ],
        network: "arbitrumSepolia",
      });
      console.log("   ✅ Price Manager verified\n");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("   ⚠️  Price Manager already verified\n");
      } else {
        console.log(`   ❌ Price Manager verification failed: ${error.message}\n`);
      }
    }
  }

  // Verify Fallback Library
  if (contracts.NovaxFallbackLibrary) {
    console.log("8️⃣  Verifying Fallback Library...");
    try {
      await run("verify:verify", {
        address: contracts.NovaxFallbackLibrary,
        constructorArguments: [],
        network: "arbitrumSepolia",
      });
      console.log("   ✅ Fallback Library verified\n");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("   ⚠️  Fallback Library already verified\n");
      } else {
        console.log(`   ❌ Fallback Library verification failed: ${error.message}\n`);
      }
    }
  }

  console.log("✅ Verification complete!");
  console.log("\n🔗 View contracts on Arbiscan:");
  console.log(`   https://sepolia.arbiscan.io/address/${contracts.NovaxPoolManager}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

