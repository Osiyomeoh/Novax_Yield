// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

// Asset Types
export interface Asset {
  _id: string;
  assetId: string;
  owner: string;
  type: 'AGRICULTURAL' | 'REAL_ESTATE' | 'MINING' | 'MANUFACTURING';
  name: string;
  description: string;
  location: {
    country: string;
    region: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    address?: string;
  };
  totalValue: number;
  tokenSupply: number;
  tokenizedAmount: number;
  maturityDate: string;
  expectedAPY: number;
  verificationScore: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'TOKENIZED';
  investments: string[];
  operations: any[];
  createdAt: string;
  updatedAt: string;
}

// Investment Types
export interface Investment {
  _id: string;
  investmentId: string;
  userId: string;
  assetId: string;
  amount: number;
  tokens: number;
  status: 'ACTIVE' | 'MATURED' | 'CANCELLED';
  transactionHash?: string;
  createdAt: string;
  updatedAt: string;
  blockchainData?: {
    tokenBalance: number;
    contractAddress: string;
    lastUpdated: string;
  };
}

// Portfolio Types
export interface Portfolio {
  totalInvested: number;
  totalValue: number;
  totalReturns: number;
  returnPercentage: number;
  totalInvestments: number;
  totalUsers: number;
  totalAssets: number;
  userPortfolios: Record<string, {
    invested: number;
    value: number;
  }>;
  lastUpdated: string;
}

// Analytics Types
export interface MarketAnalytics {
  totalValueLocked: number;
  totalAssets: number;
  totalUsers: number;
  averageAPY: number;
  totalInvestments: number;
  averageInvestmentSize: number;
  dailyVolume: number;
  activeUsers: number;
  blockchainData: {
    lastUpdated: string;
    source: string;
  };
}

// Hedera Status Types
export interface HederaStatus {
  status: string;
  network: string;
  accountId: string;
  balance: string;
  contracts: {
    trustToken: string;
    attestorManager: string;
    policyManager: string;
    verificationRegistry: string;
    assetFactory: string;
    settlementEngine: string;
    feeDistribution: string;
    verificationBuffer: string;
  };
  timestamp: string;
}

// Auth Types
export interface AuthCredentials {
  email: string;
  password: string;
}

export interface WalletAuth {
  address: string;
  signature: string;
  message: string;
  timestamp: number;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
}

export interface AuthResult {
  user: any;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Verification Types
export interface VerificationRequest {
  assetId: string;
  evidence: {
    documents: Array<{
      name: string;
      fileRef: string;
    }>;
    location: {
      coordinates: {
        lat: number;
        lng: number;
      };
    };
    photos: Array<{
      description: string;
      fileRef: string;
    }>;
  };
}

// Error Types
export interface ApiError {
  message: string;
  error: string;
  statusCode: number;
}
