import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking Arbitrum One connection...\n");
  
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  
  const [signer] = await ethers.getSigners();
  console.log("Deployer address:", signer.address);
  
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.log("\n⚠️  WARNING: Your deployer wallet has 0 ETH!");
    console.log("   You need ETH on Arbitrum One to deploy contracts.");
    console.log("   Bridge ETH to Arbitrum: https://bridge.arbitrum.io/");
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


