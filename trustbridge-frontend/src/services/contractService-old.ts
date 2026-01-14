import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ROLES, NETWORK_CONFIG } from '../config/contracts';

// Import ABIs from contract artifacts
import UniversalAssetFactoryABI from '../contracts/UniversalAssetFactory.json';
import NFTMarketplaceABI from '../contracts/NFTMarketplace.json';
import TrustTokenABI from '../contracts/TrustToken.json';
import AttestorVerificationSystemABI from '../contracts/AttestorVerificationSystem.json';
// Use imported ABI
const UNIVERSAL_ASSET_FACTORY_ABI = UniversalAssetFactoryABI.abi;
  {
    "inputs": [
      {"name": "category", "type": "uint8"},
      {"name": "assetType", "type": "string"},
      {"name": "name", "type": "string"},
      {"name": "location", "type": "string"},
      {"name": "totalValue", "type": "uint256"},
      {"name": "maturityDate", "type": "uint256"},
      {"name": "level", "type": "uint8"},
      {"name": "evidenceHashes", "type": "string[]"},
      {"name": "documentTypes", "type": "string[]"},
      {"name": "imageURI", "type": "string"},
      {"name": "documentURI", "type": "string"},
      {"name": "description", "type": "string"}
    ],
    "name": "tokenizeAsset",
    "outputs": [{"name": "assetId", "type": "bytes32"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"name": "assetId", "type": "bytes32"}],
    "name": "getAsset",
    "outputs": [
      {"name": "id", "type": "bytes32"},
      {"name": "owner", "type": "address"},
      {"name": "category", "type": "uint8"},
      {"name": "assetType", "type": "string"},
      {"name": "name", "type": "string"},
      {"name": "location", "type": "string"},
      {"name": "totalValue", "type": "uint256"},
      {"name": "maturityDate", "type": "uint256"},
      {"name": "verificationScore", "type": "uint8"},
      {"name": "isActive", "type": "bool"},
      {"name": "createdAt", "type": "uint256"},
      {"name": "nftContract", "type": "address"},
      {"name": "tokenId", "type": "uint256"},
      {"name": "verificationLevel", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserAssets",
    "outputs": [{"name": "assetIds", "type": "bytes32[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMinFeeHBAR",
    "outputs": [{"name": "fee", "type": "uint256"}],
    "stateMutability": "pure",
    "type": "function"
  }
];

const NFT_MARKETPLACE_ABI = [
  {
    "inputs": [
      {"name": "nftContract", "type": "address"},
      {"name": "tokenId", "type": "uint256"},
      {"name": "price", "type": "uint256"},
      {"name": "duration", "type": "uint256"}
    ],
    "name": "listAsset",
    "outputs": [{"name": "listingId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "listingId", "type": "uint256"}],
    "name": "buyAsset",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "listingId", "type": "uint256"},
      {"name": "duration", "type": "uint256"}
    ],
    "name": "makeOffer",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "listingId", "type": "uint256"},
      {"name": "buyer", "type": "address"}
    ],
    "name": "acceptOffer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "listingId", "type": "uint256"}],
    "name": "getListing",
    "outputs": [
      {"name": "seller", "type": "address"},
      {"name": "nftContract", "type": "address"},
      {"name": "tokenId", "type": "uint256"},
      {"name": "price", "type": "uint256"},
      {"name": "isActive", "type": "bool"},
      {"name": "createdAt", "type": "uint256"},
      {"name": "expiresAt", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getActiveListings",
    "outputs": [{"name": "listingIds", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Import ABI from artifacts
import AttestorVerificationSystemABI from '../contracts/AttestorVerificationSystem.json';

const ATTESTOR_VERIFICATION_SYSTEM_ABI = AttestorVerificationSystemABI.abi;

const TRUST_TOKEN_ABI = [
  {
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Enums matching smart contracts
export enum AssetCategory {
  FARM_PRODUCE = 0,
  FARMLAND = 1,
  REAL_ESTATE = 2,
  VEHICLES = 3,
  ART_COLLECTIBLES = 4,
  COMMODITIES = 5,
  BUSINESS_ASSETS = 6,
  INTELLECTUAL_PROPERTY = 7
}

export enum VerificationLevel {
  BASIC = 0,      // 1 attestor, 1% fee
  STANDARD = 1,   // 2 attestors, 2% fee
  PREMIUM = 2,    // 3 attestors, 3% fee
  ENTERPRISE = 3  // 5+ attestors, 5% fee
}

export enum AttestorType {
  LEGAL_EXPERT = 0,
  FINANCIAL_AUDITOR = 1,
  TECHNICAL_SPECIALIST = 2,
  REAL_ESTATE_APPRAISER = 3,
  AGRICULTURAL_EXPERT = 4,
  ART_APPRAISER = 5,
  VEHICLE_INSPECTOR = 6,
  BUSINESS_VALUATOR = 7
}

export enum AttestorTier {
  BASIC = 0,      // Tier 1: 1,000 TRUST + $25
  PROFESSIONAL = 1, // Tier 2: 5,000 TRUST + $50
  EXPERT = 2,     // Tier 3: 10,000 TRUST + $100
  MASTER = 3      // Tier 4: 25,000 TRUST + $250
}

export interface AssetData {
  category: AssetCategory;
  assetType: string;
  name: string;
  location: string;
  totalValue: number;
  maturityDate: number;
  verificationLevel: VerificationLevel;
  evidenceHashes: string[];
  documentTypes: string[];
  imageURI: string;
  documentURI: string;
  description: string;
}

export interface ListingData {
  nftContract: string;
  tokenId: number;
  price: number;
  duration: number; // in seconds
}

export interface AttestorData {
  name: string;
  organization: string;
  attestorType: AttestorType;
  tier: AttestorTier;
  specializations: string[];
  countries: string[];
  experienceYears: number;
  contactInfo: string;
  credentials: string;
  uploadedDocuments: string[];
}

export interface TierRequirements {
  stakingRequirement: string;
  registrationFee: string;
  experienceRequirement: number;
  documentRequirements: string[];
}

class ContractService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private isConnected = false;

  async connect(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not detected');
      }

      // Request account access
      await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      // Switch to Hedera testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x128' }], // Hedera testnet chain ID
      }).catch(async (error: any) => {
        if (error.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x128',
              chainName: 'Hedera Testnet',
              rpcUrls: ['https://testnet.hashio.io/api'],
              nativeCurrency: {
                name: 'HBAR',
                symbol: 'HBAR',
                decimals: 18,
              },
              blockExplorerUrls: ['https://hashscan.io/testnet'],
            }],
          });
        } else {
          throw error;
        }
      });

      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.isConnected = true;

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async tokenizeAsset(assetData: AssetData): Promise<{ success: boolean; assetId?: string; transactionHash?: string; tokenId?: string; tokenAddress?: string; transactionId?: string; fullSignature?: string; error?: string }> {
    try {
      if (!this.isConnected || !this.signer) {
        const connectionResult = await this.connect();
        if (!connectionResult.success) {
          return { success: false, error: connectionResult.error };
        }
      }

      if (!this.signer) {
        return { success: false, error: 'No signer available' };
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.universalAssetFactory,
        UNIVERSAL_ASSET_FACTORY_ABI,
        this.signer
      );

      // Get minimum fee
      const minFee = await contract.getMinFeeHBAR();
      const feeInWei = ethers.parseUnits(minFee.toString(), 18);

      console.log('🚀 Creating asset with smart contract...');
      console.log('Asset data:', assetData);
      console.log('Fee required:', ethers.formatEther(feeInWei), 'HBAR');

      const tx = await contract.tokenizeAsset(
        assetData.category,
        assetData.assetType,
        assetData.name,
        assetData.location,
        assetData.totalValue,
        assetData.maturityDate,
        assetData.verificationLevel,
        assetData.evidenceHashes,
        assetData.documentTypes,
        assetData.imageURI,
        assetData.documentURI,
        assetData.description,
        { value: feeInWei }
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Extract asset ID from events
      const assetTokenizedEvent = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id('AssetTokenized(bytes32,address,uint8,string,string,uint256,uint8,address,uint256)')
      );

      let assetId = '';
      if (assetTokenizedEvent) {
        const decoded = contract.interface.parseLog(assetTokenizedEvent);
        assetId = decoded?.args[0] || '';
      }

      return {
        success: true,
        assetId,
        transactionHash: tx.hash,
        tokenId: '0.0.0', // Will be extracted from contract events
        tokenAddress: '', // Will be extracted from contract events
        transactionId: tx.hash, // For compatibility
        fullSignature: tx.hash // For compatibility
      };
    } catch (error) {
      console.error('Asset tokenization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async listAsset(listingData: ListingData): Promise<{ success: boolean; listingId?: number; transactionHash?: string; error?: string }> {
    try {
      if (!this.isConnected || !this.signer) {
        const connectionResult = await this.connect();
        if (!connectionResult.success) {
          return { success: false, error: connectionResult.error };
        }
      }

      if (!this.signer) {
        return { success: false, error: 'No signer available' };
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.nftMarketplace,
        NFT_MARKETPLACE_ABI,
        this.signer
      );

      const tx = await contract.listAsset(
        listingData.nftContract,
        listingData.tokenId,
        ethers.parseEther(listingData.price.toString()),
        listingData.duration
      );

      const receipt = await tx.wait();
      
      // Extract listing ID from events
      const assetListedEvent = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id('AssetListed(uint256,address,address,uint256,uint256)')
      );

      let listingId = 0;
      if (assetListedEvent) {
        const decoded = contract.interface.parseLog(assetListedEvent);
        listingId = Number(decoded?.args[0] || 0);
      }

      return {
        success: true,
        listingId,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Asset listing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async buyAsset(listingId: number, price: number): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.isConnected || !this.signer) {
        const connectionResult = await this.connect();
        if (!connectionResult.success) {
          return { success: false, error: connectionResult.error };
        }
      }

      if (!this.signer) {
        return { success: false, error: 'No signer available' };
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.nftMarketplace,
        NFT_MARKETPLACE_ABI,
        this.signer
      );

      const tx = await contract.buyAsset(listingId, { 
        value: ethers.parseEther(price.toString()) 
      });

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Asset purchase failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async registerAttestor(attestorData: AttestorData): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.isConnected || !this.signer) {
        const connectionResult = await this.connect();
        if (!connectionResult.success) {
          return { success: false, error: connectionResult.error };
        }
      }

      if (!this.signer) {
        return { success: false, error: 'No signer available' };
      }

      // Use Hedera RPC provider for read operations
      const hederaProvider = new ethers.JsonRpcProvider('https://testnet.hashio.io/api');
      
      const readContract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        hederaProvider
      );

      // Get tier requirements to calculate fee
      const tierRequirements = await readContract.getTierRequirements(attestorData.tier);
      
      // Extract values from array (stakingRequirement, registrationFee, experienceRequirement, documentRequirements)
      const stakingRequirement = tierRequirements[0];
      const registrationFee = tierRequirements[1];
      const experienceRequirement = tierRequirements[2];
      const documentRequirements = tierRequirements[3];

      console.log('=== ATTESTOR REGISTRATION START ===');
      console.log('🚀 Registering attestor with enhanced contract...');
      console.log('Tier:', attestorData.tier);
      console.log('Raw tierRequirements array:', tierRequirements);
      console.log('tierRequirements length:', tierRequirements.length);
      console.log('tierRequirements[0] (staking):', tierRequirements[0].toString());
      console.log('tierRequirements[1] (fee):', tierRequirements[1].toString());
      console.log('tierRequirements[2] (experience):', tierRequirements[2].toString());
      console.log('tierRequirements[3] (documents):', tierRequirements[3].toString());
      console.log('Staking requirement:', stakingRequirement.toString());
      console.log('Registration fee:', registrationFee.toString());
      console.log('=== END REGISTRATION START ===');
      console.log('Experience requirement:', experienceRequirement);
      console.log('Document requirements:', documentRequirements);

      // Validate tier requirements
      if (!registrationFee || !stakingRequirement) {
        throw new Error(`Invalid tier requirements for tier ${attestorData.tier}. Registration fee: ${registrationFee}, Staking requirement: ${stakingRequirement}`);
      }

      // The registration fee and staking requirement are both in TRUST token units (18 decimals)
      const registrationFeeInTrust = ethers.formatEther(registrationFee);
      const stakingRequirementInTrust = ethers.formatEther(stakingRequirement);
      
      console.log('Registration fee:', registrationFeeInTrust, 'TRUST');
      console.log('Staking requirement:', stakingRequirementInTrust, 'TRUST');
      console.log('Registration fee (raw):', registrationFee.toString());
      console.log('Staking requirement (raw):', stakingRequirement.toString());

      // Calculate total TRUST tokens needed (registration fee + staking requirement)
      const totalTrustNeeded = registrationFee + stakingRequirement;
      
      // Check current allowance
      const trustTokenContract = new ethers.Contract(
        CONTRACT_ADDRESSES.trustToken,
        TRUST_TOKEN_ABI,
        this.signer
      );
      
      const currentAllowance = await trustTokenContract.allowance(
        await this.signer.getAddress(),
        CONTRACT_ADDRESSES.attestorVerificationSystem
      );

      console.log('Current allowance:', ethers.formatEther(currentAllowance), 'TRUST');
      console.log('Total needed:', ethers.formatEther(totalTrustNeeded), 'TRUST');

      // Approve TRUST tokens if needed
      if (currentAllowance < totalTrustNeeded) {
        console.log('🔐 Approving TRUST tokens for attestor registration...');
        const approveTx = await trustTokenContract.approve(
          CONTRACT_ADDRESSES.attestorVerificationSystem,
          totalTrustNeeded
        );
        
        console.log('Approval transaction sent:', approveTx.hash);
        await approveTx.wait();
        console.log('✅ TRUST token approval confirmed');
      }

      console.log('=== ATTESTOR REGISTRATION DEBUG ===');
      console.log('Total TRUST needed:', ethers.formatEther(totalTrustNeeded), 'TRUST');
      console.log('Current allowance:', ethers.formatEther(currentAllowance), 'TRUST');
      console.log('=== END REGISTRATION DEBUG ===');

      // Create contract instance with signer for transactions
      const writeContract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.signer
      );

      // Validate and prepare array parameters
      const specializations = Array.isArray(attestorData.specializations) ? 
        attestorData.specializations.map(s => String(s)) : [];
      const countries = Array.isArray(attestorData.countries) ? 
        attestorData.countries.map(c => String(c)) : [];
      const uploadedDocuments = Array.isArray(attestorData.uploadedDocuments) ? 
        attestorData.uploadedDocuments.map(d => String(d)) : [];
      const documentTypes = Array.isArray(attestorData.documentTypes) ? 
        attestorData.documentTypes.map(t => String(t)) : [];

      console.log('🔍 Array validation:');
      console.log('  specializations:', specializations);
      console.log('  countries:', countries);
      console.log('  uploadedDocuments:', uploadedDocuments);
      console.log('  documentTypes:', documentTypes);
      console.log('🔍 Other parameters:');
      console.log('  attestorType:', attestorData.attestorType, typeof attestorData.attestorType);
      console.log('  tier:', attestorData.tier, typeof attestorData.tier);
      console.log('  experienceYears:', attestorData.experienceYears, typeof attestorData.experienceYears);
      console.log('  contactInfo:', attestorData.contactInfo);
      console.log('  credentials:', attestorData.credentials);

      const tx = await writeContract.registerAttestor(
        attestorData.attestorType,
        attestorData.tier,
        specializations,
        countries,
        attestorData.experienceYears,
        attestorData.contactInfo,
        attestorData.credentials,
        uploadedDocuments,
        documentTypes
        // No value field needed - payment is handled via TRUST token transfer
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Attestor registration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAsset(assetId: string): Promise<any> {
    try {
      if (!this.provider) {
        await this.connect();
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.universalAssetFactory,
        UNIVERSAL_ASSET_FACTORY_ABI,
        this.provider
      );

      return await contract.getAsset(assetId);
    } catch (error) {
      console.error('Failed to get asset:', error);
      return null;
    }
  }

  async getUserAssets(userAddress: string): Promise<string[]> {
    try {
      if (!this.provider) {
        await this.connect();
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.universalAssetFactory,
        UNIVERSAL_ASSET_FACTORY_ABI,
        this.provider
      );

      return await contract.getUserAssets(userAddress);
    } catch (error) {
      console.error('Failed to get user assets:', error);
      return [];
    }
  }

  async getActiveListings(): Promise<any[]> {
    try {
      if (!this.provider) {
        await this.connect();
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.nftMarketplace,
        NFT_MARKETPLACE_ABI,
        this.provider
      );

      const listingIds = await contract.getActiveListings();
      const listings = [];

      for (const listingId of listingIds) {
        const listing = await contract.getListing(listingId);
        listings.push({
          id: Number(listingId),
          ...listing
        });
      }

      return listings;
    } catch (error) {
      console.error('Failed to get active listings:', error);
      return [];
    }
  }

  async getTierRequirements(tier: AttestorTier): Promise<TierRequirements> {
    try {
      console.log(`🔍 Getting tier requirements for tier: ${tier}`);
      
      if (!this.provider) {
        console.log('🔌 No provider, connecting...');
        await this.connect();
      }

      // Check network and switch if needed
      const network = await this.provider.getNetwork();
      
      if (network.chainId !== 296n) {
        console.warn(`⚠️ Wrong network! Expected Hedera testnet (296), got ${network.chainId}`);
        console.log('🔄 Attempting to switch to Hedera testnet...');
        
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x128' }], // 296 in hex
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            console.log('➕ Adding Hedera testnet to MetaMask...');
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x128', // 296 in hex
                  chainName: 'Hedera Testnet',
                  rpcUrls: ['https://testnet.hashio.io/api'],
                  nativeCurrency: {
                    name: 'HBAR',
                    symbol: 'HBAR',
                    decimals: 18
                  },
                  blockExplorerUrls: ['https://hashscan.io/testnet']
                }]
              });
            } catch (addError) {
              console.error('❌ Failed to add Hedera testnet:', addError);
              throw new Error('Please add Hedera testnet to MetaMask manually');
            }
          } else {
            console.error('❌ Failed to switch to Hedera testnet:', switchError);
            throw new Error('Please switch to Hedera testnet in MetaMask');
          }
        }
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.provider
      );

      console.log(`📞 Calling getTierRequirements(${tier}) on contract ${CONTRACT_ADDRESSES.attestorVerificationSystem}`);
      console.log(`🔍 Contract ABI method:`, PROFESSIONAL_ATTESTOR_ABI.find(m => m.name === 'getTierRequirements'));
      console.log(`🌐 Provider network:`, network);
      console.log(`🔗 Expected chainId: 296 (Hedera testnet), actual: ${network.chainId}`);
      
      // Check if contract exists by trying to get code
      const code = await this.provider.getCode(CONTRACT_ADDRESSES.attestorVerificationSystem);
      console.log(`📄 Contract code length: ${code.length} (should be > 0 if contract exists)`);
      
      // Add timeout to prevent hanging
      const requirements = await Promise.race([
        contract.getTierRequirements(tier),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Contract call timeout')), 10000)
        )
      ]);
      
      console.log(`✅ Tier ${tier} requirements received:`, requirements);
      
      // The contract returns an array, not an object with named properties
      return {
        stakingRequirement: ethers.formatEther(requirements[0]),
        registrationFee: ethers.formatEther(requirements[1]),
        experienceRequirement: Number(requirements[2]),
        documentRequirements: requirements[3]
      };
    } catch (error) {
      console.error(`❌ Failed to get tier requirements for tier ${tier}:`, error);
      
      // Return default values based on tier
      const defaultRequirements = {
        0: { staking: '1000', fee: '25', experience: 1, docs: 4 },
        1: { staking: '5000', fee: '50', experience: 3, docs: 4 },
        2: { staking: '10000', fee: '100', experience: 5, docs: 5 },
        3: { staking: '25000', fee: '250', experience: 10, docs: 6 }
      };
      
      const defaults = defaultRequirements[tier as keyof typeof defaultRequirements] || defaultRequirements[0];
      
      return {
        stakingRequirement: defaults.staking,
        registrationFee: defaults.fee,
        experienceRequirement: defaults.experience,
        documentRequirements: Array(defaults.docs).fill('Document required')
      };
    }
  }

  async getAttestorsByTier(tier: AttestorTier): Promise<string[]> {
    try {
      if (!this.provider) {
        await this.connect();
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.provider
      );

      return await contract.getAttestorsByTier(tier);
    } catch (error) {
      console.error('Failed to get attestors by tier:', error);
      return [];
    }
  }

  async unstakeTokens(): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.isConnected || !this.signer) {
        const connectionResult = await this.connect();
        if (!connectionResult.success) {
          return { success: false, error: connectionResult.error };
        }
      }

      if (!this.signer) {
        return { success: false, error: 'No signer available' };
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.signer
      );

      const tx = await contract.unstake();
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Unstaking failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Admin functions
  async approveAttestor(attestorAddress: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.isConnected || !this.signer) {
        const connectionResult = await this.connect();
        if (!connectionResult.success) {
          return { success: false, error: connectionResult.error };
        }
      }

      if (!this.signer) {
        return { success: false, error: 'No signer available' };
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.signer
      );

      // Update attestor status to APPROVED (1)
      const tx = await contract.updateAttestorStatus(attestorAddress, 1, "Approved by admin");
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Attestor approval failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async rejectAttestor(attestorAddress: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.isConnected || !this.signer) {
        const connectionResult = await this.connect();
        if (!connectionResult.success) {
          return { success: false, error: connectionResult.error };
        }
      }

      if (!this.signer) {
        return { success: false, error: 'No signer available' };
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.signer
      );

      // Update attestor status to REJECTED (2)
      const tx = await contract.updateAttestorStatus(attestorAddress, 2, "Rejected by admin");
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Attestor rejection failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAttestorProfile(attestorAddress: string): Promise<any> {
    try {
      if (!this.provider) {
        await this.connect();
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.provider
      );

      const result = await contract.getAttestorProfile(attestorAddress);
      console.log('Raw contract result:', result);
      return result;
    } catch (error) {
      console.error('Failed to get attestor profile:', error);
      return null;
    }
  }

  async getAllAttestors(): Promise<any[]> {
    try {
      if (!this.provider) {
        await this.connect();
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.provider
      );

      // Get all attestor addresses from the contract
      const attestorAddresses = await contract.getAllAttestors();
      console.log('Total attestors:', attestorAddresses.length);

      const attestors = [];
      
      // Get profiles for each attestor
      for (const address of attestorAddresses) {
        try {
          const profile = await contract.getAttestorProfile(address);
          
          if (profile && profile.attestorAddress && profile.attestorAddress !== '0x0000000000000000000000000000000000000000') {
            attestors.push({
              address: address,
              attestorAddress: profile.attestorAddress,
              name: profile.name,
              organization: profile.organization,
              attestorType: Number(profile.attestorType),
              tier: Number(profile.tier),
              specializations: profile.specializations || [],
              countries: profile.countries || [],
              experienceYears: Number(profile.experienceYears),
              totalVerifications: Number(profile.totalVerifications),
              successfulVerifications: Number(profile.successfulVerifications),
              failedVerifications: Number(profile.failedVerifications),
              reputationScore: Number(profile.reputationScore),
              stakedAmount: profile.stakedAmount.toString(),
              registrationFee: profile.registrationFee.toString(),
              requiredDocuments: profile.requiredDocuments || [],
              uploadedDocuments: profile.uploadedDocuments || [],
              status: Number(profile.status),
              isActive: profile.isActive,
              createdAt: profile.createdAt.toString(),
              lastActivity: profile.lastActivity.toString(),
              contactInfo: profile.contactInfo || '',
              credentials: profile.credentials || '',
              reviewerNotes: profile.reviewerNotes || ''
            });
          }
        } catch (error) {
          console.error(`Failed to get profile for ${address}:`, error);
          // Continue with next attestor
        }
      }

      return attestors;
    } catch (error) {
      console.error('Failed to get all attestors:', error);
      throw error;
    }
  }

  // Admin role checking functions
  async isAdmin(userAddress: string): Promise<boolean> {
    try {
      if (!this.provider) {
        await this.connect();
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.provider
      );

      const DEFAULT_ADMIN_ROLE = ROLES.DEFAULT_ADMIN_ROLE;
      const VERIFIER_ROLE = ROLES.VERIFIER_ROLE;

      const hasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, userAddress);
      const hasVerifierRole = await contract.hasRole(VERIFIER_ROLE, userAddress);

      return hasAdminRole || hasVerifierRole;
    } catch (error) {
      console.error('Failed to check admin status:', error);
      return false;
    }
  }

  async isVerifier(userAddress: string): Promise<boolean> {
    try {
      if (!this.provider) {
        await this.connect();
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.provider
      );

      const VERIFIER_ROLE = ROLES.VERIFIER_ROLE;
      return await contract.hasRole(VERIFIER_ROLE, userAddress);
    } catch (error) {
      console.error('Failed to check verifier status:', error);
      return false;
    }
  }

  async getAdminRoles(userAddress: string): Promise<{isAdmin: boolean, isVerifier: boolean}> {
    try {
      if (!this.provider) {
        await this.connect();
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.provider
      );

      const DEFAULT_ADMIN_ROLE = ROLES.DEFAULT_ADMIN_ROLE;
      const VERIFIER_ROLE = ROLES.VERIFIER_ROLE;

      const hasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, userAddress);
      const hasVerifierRole = await contract.hasRole(VERIFIER_ROLE, userAddress);

      return {
        isAdmin: hasAdminRole,
        isVerifier: hasVerifierRole
      };
    } catch (error) {
      console.error('Failed to get admin roles:', error);
      return { isAdmin: false, isVerifier: false };
    }
  }

  isConnectedToHedera(): boolean {
    return this.isConnected;
  }
}

export const contractService = new ContractService();
