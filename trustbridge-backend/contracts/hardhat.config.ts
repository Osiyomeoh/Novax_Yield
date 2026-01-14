import { HardhatUserConfig } from "hardhat/config.js";
import "@nomicfoundation/hardhat-toolbox";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import "dotenv/config";

const config: HardhatUserConfig = {
  plugins: [
    hardhatVerify,
    // ...other plugins from hardhat-toolbox...
  ],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    mantle_testnet: {
      url: process.env.MANTLE_TESTNET_RPC_URL || "https://rpc.sepolia.mantle.xyz",
      chainId: 5003,
      accounts: process.env.MANTLE_PRIVATE_KEY ? [process.env.MANTLE_PRIVATE_KEY] : [],
      gas: "auto",
      gasPrice: "auto",
    },
    mantle_mainnet: {
      url: process.env.MANTLE_MAINNET_RPC_URL || "https://rpc.mantle.xyz",
      chainId: 5000,
      accounts: process.env.MANTLE_PRIVATE_KEY ? [process.env.MANTLE_PRIVATE_KEY] : [],
      gas: "auto",
      gasPrice: "auto",
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : [],
    },
    // Legacy Hedera networks (kept for reference)
    hedera_testnet: {
      url: "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: process.env.HEDERA_TESTNET_PRIVATE_KEY_2 ? [process.env.HEDERA_TESTNET_PRIVATE_KEY_2] : [],
      gas: "auto",
      gasPrice: "auto",
    },
    hedera_mainnet: {
      url: "https://mainnet.hashio.io/api",
      chainId: 295,
      accounts: process.env.HEDERA_MAINNET_PRIVATE_KEY ? [process.env.HEDERA_MAINNET_PRIVATE_KEY] : [],
      gas: "auto",
      gasPrice: "auto",
    },
  },
  verify: {
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY || process.env.MANTLE_API_KEY || "",
    },
  },
  chainDescriptors: {
    5003: {
      name: "mantleTestnet",
      blockExplorers: {
        etherscan: {
          name: "Mantle Sepolia Explorer",
          url: "https://explorer.sepolia.mantle.xyz",
          apiUrl: "https://explorer.sepolia.mantle.xyz/api",
        },
      },
    },
    5000: {
      name: "mantleMainnet",
      blockExplorers: {
        etherscan: {
          name: "Mantle Explorer",
          url: "https://explorer.mantle.xyz",
          apiUrl: "https://explorer.mantle.xyz/api",
        },
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};

export default config;
