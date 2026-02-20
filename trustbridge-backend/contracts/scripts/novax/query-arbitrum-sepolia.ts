import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

/**
 * Query Arbitrum Sepolia contract data using Arbiscan API
 * 
 * API Documentation: https://docs.arbiscan.io/
 * For Arbitrum Sepolia, use: https://api-sepolia.arbiscan.io/api
 */

const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY || process.env.ETHERSCAN_API_KEY;
const ARBISCAN_API_URL = "https://api-sepolia.arbiscan.io/api"; // Arbitrum Sepolia
const CHAIN_ID = 421614; // Arbitrum Sepolia

interface ContractInfo {
  name: string;
  address: string;
}

async function queryContract(contract: ContractInfo) {
  console.log(`\n📋 Querying ${contract.name}...`);
  console.log(`   Address: ${contract.address}`);
  console.log(`   Explorer: https://sepolia.arbiscan.io/address/${contract.address}`);

  try {
    // Get contract ABI
    const abiResponse = await axios.get(ARBISCAN_API_URL, {
      params: {
        module: "contract",
        action: "getabi",
        address: contract.address,
        apikey: ARBISCAN_API_KEY,
      },
    });

    if (abiResponse.data.status === "1") {
      console.log(`   ✅ Contract verified - ABI available`);
    } else {
      console.log(`   ⚠️  Contract not verified: ${abiResponse.data.result}`);
    }

    // Get contract source code
    const sourceResponse = await axios.get(ARBISCAN_API_URL, {
      params: {
        module: "contract",
        action: "getsourcecode",
        address: contract.address,
        apikey: ARBISCAN_API_KEY,
      },
    });

    if (sourceResponse.data.status === "1" && sourceResponse.data.result[0].SourceCode) {
      console.log(`   ✅ Source code available`);
      const contractName = sourceResponse.data.result[0].ContractName;
      const compilerVersion = sourceResponse.data.result[0].CompilerVersion;
      console.log(`   Contract Name: ${contractName}`);
      console.log(`   Compiler: ${compilerVersion}`);
    }

    // Get contract creation transaction
    const txResponse = await axios.get(ARBISCAN_API_URL, {
      params: {
        module: "contract",
        action: "getcontractcreation",
        contractaddresses: contract.address,
        apikey: ARBISCAN_API_KEY,
      },
    });

    if (txResponse.data.status === "1" && txResponse.data.result.length > 0) {
      const creationTx = txResponse.data.result[0];
      console.log(`   ✅ Creation Transaction: ${creationTx.txHash}`);
      console.log(`   Creator: ${creationTx.contractCreator}`);
    }

    // Get transaction count (nonce)
    const txCountResponse = await axios.get(ARBISCAN_API_URL, {
      params: {
        module: "proxy",
        action: "eth_getTransactionCount",
        address: contract.address,
        tag: "latest",
        apikey: ARBISCAN_API_KEY,
      },
    });

    if (txCountResponse.data.result) {
      const txCount = parseInt(txCountResponse.data.result, 16);
      console.log(`   Transaction Count: ${txCount}`);
    }

    // Get balance
    const balanceResponse = await axios.get(ARBISCAN_API_URL, {
      params: {
        module: "account",
        action: "balance",
        address: contract.address,
        tag: "latest",
        apikey: ARBISCAN_API_KEY,
      },
    });

    if (balanceResponse.data.status === "1") {
      const balance = BigInt(balanceResponse.data.result);
      console.log(`   Balance: ${balance.toString()} wei (${Number(balance) / 1e18} ETH)`);
    }

  } catch (error: any) {
    console.error(`   ❌ Error querying contract: ${error.message}`);
  }
}

async function queryTransactions(contract: ContractInfo, limit: number = 10) {
  console.log(`\n📜 Recent Transactions for ${contract.name}...`);

  try {
    const response = await axios.get(ARBISCAN_API_URL, {
      params: {
        module: "account",
        action: "txlist",
        address: contract.address,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: limit,
        sort: "desc",
        apikey: ARBISCAN_API_KEY,
      },
    });

    if (response.data.status === "1" && response.data.result.length > 0) {
      console.log(`   Found ${response.data.result.length} transactions:`);
      response.data.result.slice(0, limit).forEach((tx: any, index: number) => {
        console.log(`   ${index + 1}. ${tx.hash}`);
        console.log(`      From: ${tx.from}`);
        console.log(`      To: ${tx.to}`);
        console.log(`      Value: ${ethers.formatEther(tx.value)} ETH`);
        console.log(`      Block: ${tx.blockNumber}`);
        console.log(`      Time: ${new Date(parseInt(tx.timeStamp) * 1000).toLocaleString()}`);
      });
    } else {
      console.log(`   No transactions found`);
    }
  } catch (error: any) {
    console.error(`   ❌ Error querying transactions: ${error.message}`);
  }
}

async function main() {
  console.log("🔍 Querying Arbitrum Sepolia Contracts via Arbiscan API");
  console.log("=".repeat(60));
  console.log(`API Key: ${ARBISCAN_API_KEY ? "✅ Set" : "❌ Not set"}`);
  console.log(`API URL: ${ARBISCAN_API_URL}`);
  console.log(`Chain ID: ${CHAIN_ID}`);

  if (!ARBISCAN_API_KEY) {
    console.error("\n❌ Error: ARBISCAN_API_KEY not set in .env");
    console.error("   Add: ARBISCAN_API_KEY=your_api_key_here");
    process.exit(1);
  }

  // Load deployment addresses
  const deploymentFile = path.join(__dirname, "../../deployments/novax-arbitrum-sepolia-421614.json");
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const contracts = deployment.contracts;

  const contractsToQuery: ContractInfo[] = [
    { name: "MockUSDC", address: contracts.USDC },
    { name: "NVX Token", address: contracts.NVXToken },
    { name: "RWA Factory", address: contracts.NovaxRwaFactory },
    { name: "Receivable Factory", address: contracts.NovaxReceivableFactory },
    { name: "Pool Manager", address: contracts.NovaxPoolManager },
    { name: "Exporter Registry", address: contracts.NovaxExporterRegistry },
    { name: "Price Manager", address: contracts.NovaxPriceManager },
  ];

  console.log("\n📦 Contracts to Query:");
  console.log("=".repeat(60));

  for (const contract of contractsToQuery) {
    await queryContract(contract);
    await new Promise(resolve => setTimeout(resolve, 200)); // Rate limit
  }

  // Query transactions for Pool Manager (most active)
  await queryTransactions(contractsToQuery.find(c => c.name === "Pool Manager")!, 5);

  console.log("\n✅ Query complete!");
  console.log("\n💡 Tips:");
  console.log("   - Use Arbiscan API Playground: https://arbiscan.io/apis");
  console.log("   - For Arbitrum One, use: https://api.arbiscan.io/api");
  console.log("   - For Arbitrum Sepolia, use: https://api-sepolia.arbiscan.io/api");
  console.log("   - Rate limit: 5 calls/second (free tier)");
}

// Import ethers for formatting
import { ethers } from "ethers";

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


