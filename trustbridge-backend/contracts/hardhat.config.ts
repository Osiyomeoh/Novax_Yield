import { HardhatUserConfig } from "hardhat/config.js";
import "@nomicfoundation/hardhat-toolbox";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import "dotenv/config";

const config = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000, // Very high runs to minimize contract size (prioritizes deployment size over execution gas)
          },
          viaIR: true, // Enable IR pipeline for better optimization
          metadata: {
            bytecodeHash: "none", // Don't include metadata hash to reduce size
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    // Mantle networks removed
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : [],
    },
    arbitrum_one: {
      url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      accounts: (() => {
        const accounts: string[] = [];
        if (process.env.ARBITRUM_PRIVATE_KEY) {
          accounts.push(process.env.ARBITRUM_PRIVATE_KEY);
        }
        // Support multiple private keys for deployment
        if (process.env.ARBITRUM_PRIVATE_KEY2) {
          accounts.push(process.env.ARBITRUM_PRIVATE_KEY2);
        }
        if (process.env.ARBITRUM_PRIVATE_KEY3) {
          accounts.push(process.env.ARBITRUM_PRIVATE_KEY3);
        }
        if (process.env.ARBITRUM_PRIVATE_KEY4) {
          accounts.push(process.env.ARBITRUM_PRIVATE_KEY4);
        }
        // Fallback to generic PRIVATE_KEY if no Arbitrum-specific key
        if (accounts.length === 0 && process.env.PRIVATE_KEY) {
          accounts.push(process.env.PRIVATE_KEY);
        }
        return accounts;
      })(),
      gas: "auto",
      gasPrice: "auto",
    },
    arbitrum_sepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: (() => {
        const accounts: string[] = [];
        if (process.env.ARBITRUM_PRIVATE_KEY) {
          accounts.push(process.env.ARBITRUM_PRIVATE_KEY);
        }
        if (process.env.ARBITRUM_PRIVATE_KEY2) {
          accounts.push(process.env.ARBITRUM_PRIVATE_KEY2);
        }
        if (process.env.ARBITRUM_PRIVATE_KEY3) {
          accounts.push(process.env.ARBITRUM_PRIVATE_KEY3);
        }
        if (process.env.ARBITRUM_PRIVATE_KEY4) {
          accounts.push(process.env.ARBITRUM_PRIVATE_KEY4);
        }
        // Fallback to generic PRIVATE_KEY if no Arbitrum-specific key
        if (accounts.length === 0 && process.env.PRIVATE_KEY) {
          accounts.push(process.env.PRIVATE_KEY);
        }
        return accounts;
      })(),
      gas: "auto",
      gasPrice: "auto",
    },
    // Hedera networks removed
  },
  verify: {
    etherscan: {
      apiKey: process.env.ARBISCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
      customChains: [
        {
          network: "arbitrum_one",
          chainId: 42161,
          urls: {
            apiURL: "https://api.arbiscan.io/api",
            browserURL: "https://arbiscan.io",
          },
        },
        {
          network: "arbitrum_sepolia",
          chainId: 421614,
          urls: {
            apiURL: "https://api-sepolia.arbiscan.io/api",
            browserURL: "https://sepolia.arbiscan.io",
          },
        },
      ],
    },
  } as any,
  chainDescriptors: {
    42161: {
      name: "arbitrumOne",
      blockExplorers: {
        etherscan: {
          name: "Arbiscan",
          url: "https://arbiscan.io",
          apiUrl: "https://api.arbiscan.io/api",
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
} as HardhatUserConfig;

export default config;
