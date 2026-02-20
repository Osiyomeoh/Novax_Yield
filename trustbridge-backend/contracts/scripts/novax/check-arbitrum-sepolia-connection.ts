import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking Arbitrum Sepolia connection...\n");
  
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  
  const [signer] = await ethers.getSigners();
  console.log("Deployer address:", signer.address);
  
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.log("\n⚠️  WARNING: Your deployer wallet has 0 ETH!");
    console.log("   You need Sepolia ETH on Arbitrum Sepolia to deploy contracts.");
    console.log("   Get testnet ETH:");
    console.log("   1. Get Sepolia ETH: https://sepoliafaucet.com/");
    console.log("   2. Bridge to Arbitrum Sepolia: https://bridge.arbitrum.io/");
    console.log("   3. Or use QuickNode faucet: https://faucet.quicknode.com/arbitrum/sepolia");
  } else {
    const balanceNum = Number(ethers.formatEther(balance));
    if (balanceNum < 0.01) {
      console.log("\n⚠️  WARNING: Low balance! Recommended: at least 0.1 ETH");
    } else {
      console.log("\n✅ Sufficient balance for deployment");
    }
  }
  
  console.log("\n✅ Connection successful!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Connection failed:", error.message);
    process.exit(1);
  });


