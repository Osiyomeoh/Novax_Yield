require("@nomicfoundation/hardhat-toolbox");
const hardhatVerify = require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  plugins: [
    hardhatVerify,
    // ...other plugins from hardhat-toolbox...
  ],
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    mantle_testnet: {
      url: process.env.MANTLE_TESTNET_RPC_URL || "https://rpc.sepolia.mantle.xyz",
      accounts: process.env.MANTLE_PRIVATE_KEY ? [process.env.MANTLE_PRIVATE_KEY] : [],
      chainId: 5003,
      gas: "auto",
      gasPrice: "auto",
    },
    mantle_mainnet: {
      url: process.env.MANTLE_MAINNET_RPC_URL || "https://rpc.mantle.xyz",
      accounts: process.env.MANTLE_PRIVATE_KEY ? [process.env.MANTLE_PRIVATE_KEY] : [],
      chainId: 5000,
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
      accounts: process.env.HEDERA_PRIVATE_KEY ? [process.env.HEDERA_PRIVATE_KEY] : [],
      chainId: 296,
      gas: "auto",
      gasPrice: "auto",
    },
    hedera_mainnet: {
      url: "https://mainnet.hashio.io/api",
      accounts: process.env.HEDERA_PRIVATE_KEY ? [process.env.HEDERA_PRIVATE_KEY] : [],
      chainId: 295,
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
    artifacts: "./artifacts",
  },
};
