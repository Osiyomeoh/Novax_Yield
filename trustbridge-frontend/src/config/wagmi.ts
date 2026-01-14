import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mantleSepolia, mantleMainnet } from './mantleChains';

/**
 * Supported chains for TrustBridge
 */
export const chains = [mantleSepolia, mantleMainnet];

/**
 * Wagmi Configuration for Rainbow Kit
 * Configured for Mantle Network (Sepolia Testnet and Mainnet)
 */
export const config = getDefaultConfig({
  appName: 'TrustBridge',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '57c1a62e8228b65451c34d64d9f63537',
  chains: chains,
  ssr: false, // Disable SSR for better performance
});

