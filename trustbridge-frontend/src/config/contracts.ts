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
 * Novax Yield Contract Addresses (Arbitrum One)
 * Contract addresses will be populated after deployment to Arbitrum
 */
export interface NovaxContractAddresses {
  RWA_FACTORY: string;
  RECEIVABLE_FACTORY: string;
  POOL_MANAGER: string;
  MARKETPLACE: string;
  NVX_TOKEN: string;
  USDC: string;
  STAKING_VAULT: string;
  VAULT_CAPACITY_MANAGER: string;
}

export const novaxContractAddresses: NovaxContractAddresses = {
  // Contract addresses on Arbitrum Sepolia (deployed Feb 18, 2026)
  // These can be overridden via environment variables
  RWA_FACTORY: import.meta.env.VITE_NOVAX_RWA_FACTORY_ADDRESS || '0x83E58aaa63B9437ec39985Eb913CABA27f85A442',
  RECEIVABLE_FACTORY: import.meta.env.VITE_NOVAX_RECEIVABLE_FACTORY_ADDRESS || '0xEbf84CE8945B7e1BE6dBfB6914320222Cf05467b',
  POOL_MANAGER: import.meta.env.VITE_NOVAX_POOL_MANAGER_ADDRESS || '0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5',
  MARKETPLACE: import.meta.env.VITE_NOVAX_MARKETPLACE_ADDRESS || '',
  NVX_TOKEN: import.meta.env.VITE_NVX_TOKEN_ADDRESS || '0x9fF0637bCEEb4263DcA3ECdc00380E7C5077C8ff',
  USDC: import.meta.env.VITE_USDC_ADDRESS || '0xD1A4AB603d489F6A6D74e7A5E853ad880cB7C24D', // MockUSDC on Arbitrum Sepolia
  STAKING_VAULT: import.meta.env.VITE_STAKING_VAULT_ADDRESS || '0x94FBbA3EB7799e9eb037d63cDfea60Ab3985e048',
  VAULT_CAPACITY_MANAGER: import.meta.env.VITE_VAULT_CAPACITY_MANAGER_ADDRESS || '0x12870fcf8666cF8C3a1f6745c7D387dCc5210eAE',
};

/**
 * Network configuration
 * Updated for Arbitrum Sepolia (Novax Yield)
 */
export const networkConfig = {
  name: import.meta.env.VITE_NETWORK || 'arbitrum_sepolia',
  chainId: parseInt(import.meta.env.VITE_CHAIN_ID || '421614'),
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
  explorer: import.meta.env.VITE_EXPLORER_URL || 'https://sepolia.arbiscan.io',
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
  ADMIN_ROLE: ethers.keccak256(ethers.toUtf8Bytes('ADMIN_ROLE')),
  AMC_ROLE: ethers.keccak256(ethers.toUtf8Bytes('AMC_ROLE')),
  OPERATOR_ROLE: ethers.keccak256(ethers.toUtf8Bytes('OPERATOR_ROLE')),
  MINTER_ROLE: ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')),
  BURNER_ROLE: ethers.keccak256(ethers.toUtf8Bytes('BURNER_ROLE')),
  // Legacy roles (for backward compatibility)
  VERIFIER_ROLE: ethers.keccak256(ethers.toUtf8Bytes('VERIFIER_ROLE')),
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
