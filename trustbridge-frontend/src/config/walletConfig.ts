// Simple wallet configuration based on working Hedera CRA template
export const WALLET_TYPES = {
  METAMASK: 'metamask',
  HEDERA_NATIVE: 'hedera_native'
} as const;

export type WalletType = typeof WALLET_TYPES[keyof typeof WALLET_TYPES];

export interface WalletConfig {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

export const walletConfig: WalletConfig = {
  name: 'TrustBridge Africa',
  description: 'Universal Asset Protocol for Africa',
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001',
  icons: [`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'}/trustbridge-icon.svg`],
};
