/**
 * Contract Addresses Configuration
 * These addresses are loaded from environment variables or deployment config
 */

import { ethers } from 'ethers';

export interface ContractAddresses {
  TRUST_TOKEN: string;
  ASSET_NFT: string;
  CORE_ASSET_FACTORY: string;
  TRUST_ASSET_FACTORY: string;
  POOL_MANAGER: string;
  VERIFICATION_REGISTRY: string;
  TRUST_MARKETPLACE: string;
  TRUST_FAUCET: string;
  TRUST_TOKEN_EXCHANGE: string;
  AMC_MANAGER: string;
}

/**
 * Get contract address from environment or throw error
 * Tries multiple naming conventions for backward compatibility
 */
export const getContractAddress = (contractName: keyof ContractAddresses): string => {
  // Try multiple possible environment variable formats
  const envKey1 = `VITE_${contractName}_CONTRACT_ADDRESS`;
  const envKey2 = `VITE_${contractName}_ADDRESS`;
  
  // Special handling for AMC_MANAGER which uses VITE_AMC_MANAGER_ADDRESS
  const envKey3 = contractName === 'AMC_MANAGER' ? 'VITE_AMC_MANAGER_ADDRESS' : null;
  
  const address = import.meta.env[envKey1] || import.meta.env[envKey2] || (envKey3 ? import.meta.env[envKey3] : null);
  
  if (!address || address === '0x0000000000000000000000000000000000000000' || address.trim() === '') {
    console.error(`❌ Contract address for ${contractName} not found!`);
    console.error(`   Tried: ${envKey1}, ${envKey2}${envKey3 ? `, ${envKey3}` : ''}`);
    console.error(`   Please set the contract address in your .env file`);
    throw new Error(`Contract address for ${contractName} not configured. Please set VITE_${contractName}_ADDRESS in .env`);
  }
  
  // Validate address format
  if (!address.startsWith('0x') || address.length !== 42) {
    console.error(`❌ Invalid contract address format for ${contractName}: ${address}`);
    throw new Error(`Invalid contract address format for ${contractName}`);
  }
  
  console.log(`✅ Using ${contractName} address: ${address}`);
  
  // Debug logging for AMC_MANAGER to help troubleshoot
  if (contractName === 'AMC_MANAGER') {
    console.log(`🔍 AMC_MANAGER Debug:`, {
      'envKey1 (VITE_AMC_MANAGER_CONTRACT_ADDRESS)': import.meta.env.VITE_AMC_MANAGER_CONTRACT_ADDRESS,
      'envKey2 (VITE_AMC_MANAGER_ADDRESS)': import.meta.env.VITE_AMC_MANAGER_ADDRESS,
      'envKey3 (VITE_AMC_MANAGER_ADDRESS)': import.meta.env.VITE_AMC_MANAGER_ADDRESS,
      'Final address': address
    });
  }
  
  return address;
};

/**
 * All contract addresses
 */
export const contractAddresses: ContractAddresses = {
  TRUST_TOKEN: getContractAddress('TRUST_TOKEN'),
  ASSET_NFT: getContractAddress('ASSET_NFT'),
  CORE_ASSET_FACTORY: getContractAddress('CORE_ASSET_FACTORY'),
  TRUST_ASSET_FACTORY: getContractAddress('TRUST_ASSET_FACTORY'),
  POOL_MANAGER: getContractAddress('POOL_MANAGER'),
  VERIFICATION_REGISTRY: getContractAddress('VERIFICATION_REGISTRY'),
  TRUST_MARKETPLACE: getContractAddress('TRUST_MARKETPLACE'),
  TRUST_FAUCET: getContractAddress('TRUST_FAUCET'),
  TRUST_TOKEN_EXCHANGE: getContractAddress('TRUST_TOKEN_EXCHANGE'),
  AMC_MANAGER: getContractAddress('AMC_MANAGER'),
};

/**
 * Network configuration
 */
export const networkConfig = {
  name: import.meta.env.VITE_MANTLE_NETWORK || 'testnet',
  chainId: parseInt(import.meta.env.VITE_MANTLE_CHAIN_ID || '5003'),
  rpcUrl: import.meta.env.VITE_MANTLE_TESTNET_RPC_URL || 'https://rpc.sepolia.mantle.xyz',
  explorer: 'https://explorer.sepolia.mantle.xyz',
};

/**
 * Backward compatibility: NETWORK_CONFIG alias
 */
export const NETWORK_CONFIG = networkConfig;

/**
 * Role constants matching OpenZeppelin AccessControl
 * These are keccak256 hashes as defined in the smart contracts
 */
export const ROLES = {
  DEFAULT_ADMIN_ROLE: ethers.ZeroHash, // 0x0000000000000000000000000000000000000000000000000000000000000000
  VERIFIER_ROLE: ethers.keccak256(ethers.toUtf8Bytes('VERIFIER_ROLE')),
  AMC_ROLE: ethers.keccak256(ethers.toUtf8Bytes('AMC_ROLE')),
  MINTER_ROLE: ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')),
  ATTESTOR_ROLE: ethers.keccak256(ethers.toUtf8Bytes('ATTESTOR_ROLE')),
  INSPECTOR_ROLE: ethers.keccak256(ethers.toUtf8Bytes('INSPECTOR_ROLE')),
};

/**
 * Backward compatibility: CONTRACT_ADDRESSES object with lowercase keys
 */
export const CONTRACT_ADDRESSES = {
  trustToken: contractAddresses.TRUST_TOKEN,
  assetNFT: contractAddresses.ASSET_NFT,
  coreAssetFactory: contractAddresses.CORE_ASSET_FACTORY,
  trustAssetFactory: contractAddresses.TRUST_ASSET_FACTORY,
  poolManager: contractAddresses.POOL_MANAGER,
  verificationRegistry: contractAddresses.VERIFICATION_REGISTRY,
  trustMarketplace: contractAddresses.TRUST_MARKETPLACE,
  trustFaucet: contractAddresses.TRUST_FAUCET,
  trustTokenExchange: contractAddresses.TRUST_TOKEN_EXCHANGE,
  amcManager: contractAddresses.AMC_MANAGER,
  // Additional aliases for backward compatibility
  assetNft: contractAddresses.ASSET_NFT,
  coreAsset: contractAddresses.CORE_ASSET_FACTORY,
  trustAsset: contractAddresses.TRUST_ASSET_FACTORY,
  pool: contractAddresses.POOL_MANAGER,
  marketplace: contractAddresses.TRUST_MARKETPLACE,
  faucet: contractAddresses.TRUST_FAUCET,
  exchange: contractAddresses.TRUST_TOKEN_EXCHANGE,
};
