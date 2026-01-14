import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ROLES, NETWORK_CONFIG } from '../config/contracts';

// Import ABIs from contract artifacts
import UniversalAssetFactoryABI from '../contracts/UniversalAssetFactory.json';
import NFTMarketplaceABI from '../contracts/NFTMarketplace.json';
import TrustTokenABI from '../contracts/TrustToken.json';
import AttestorVerificationSystemABI from '../contracts/AttestorVerificationSystem.json';

// Use imported ABIs
const UNIVERSAL_ASSET_FACTORY_ABI = UniversalAssetFactoryABI.abi;
const NFT_MARKETPLACE_ABI = NFTMarketplaceABI.abi;
const TRUST_TOKEN_ABI = TrustTokenABI.abi;
const ATTESTOR_VERIFICATION_SYSTEM_ABI = AttestorVerificationSystemABI.abi;

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
  BASIC = 0,
  STANDARD = 1,
  PREMIUM = 2,
  ENTERPRISE = 3
}

export enum AttestorType {
  LEGAL_EXPERT = 0,
  FINANCIAL_AUDITOR = 1,
  REAL_ESTATE_APPRAISER = 2,
  VEHICLE_INSPECTOR = 3,
  ART_APPRAISER = 4,
  COMMODITY_SPECIALIST = 5,
  BUSINESS_VALUATOR = 6,
  IP_SPECIALIST = 7
}

export enum AttestorTier {
  BASIC = 0,
  PROFESSIONAL = 1,
  EXPERT = 2,
  MASTER = 3
}

export enum VerificationStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
  SUSPENDED = 3
}

// Interfaces
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

export interface AttestorData {
  attestorType: AttestorType;
  tier: AttestorTier;
  specializations: string[];
  countries: string[];
  experienceYears: number;
  contactInfo: string;
  credentials: string;
  uploadedDocuments: string[];
  documentTypes: string[];
}

export interface TierRequirements {
  stakeAmount: string;
  registrationFee: string;
  requiredDocuments: string[];
  minExperienceYears: number;
}

export interface ListingData {
  listingId: number;
  assetId: string;
  seller: string;
  price: string;
  isActive: boolean;
  createdAt: number;
  expiresAt: number;
}

// Contract Service Class
class ContractService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.hederaRpcUrl);
  }

  // Get provider with wallet connection
  private async getProviderWithWallet(): Promise<ethers.BrowserProvider> {
    if (typeof window !== 'undefined' && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    throw new Error('MetaMask not available');
  }

  // Get signer
  private async getSigner(): Promise<ethers.JsonRpcSigner> {
    const walletProvider = await this.getProviderWithWallet();
    return await walletProvider.getSigner();
  }

  // Asset Factory Methods
  async tokenizeAsset(assetData: AssetData, walletAddress: string): Promise<string> {
    try {
      const signer = await this.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.universalAssetFactory,
        UNIVERSAL_ASSET_FACTORY_ABI,
        signer
      );

      const tx = await contract.tokenizeAsset(
        assetData.category,
        assetData.assetType,
        assetData.name,
        assetData.location,
        ethers.parseUnits(assetData.totalValue.toString(), 18),
        assetData.maturityDate,
        assetData.verificationLevel,
        assetData.evidenceHashes,
        assetData.documentTypes,
        assetData.imageURI,
        assetData.documentURI,
        assetData.description,
        { value: ethers.parseUnits("0.1", 18) } // 0.1 HBAR fee
      );

      const receipt = await tx.wait();
      return receipt.logs[0].args.assetId;
    } catch (error) {
      console.error('Error tokenizing asset:', error);
      throw error;
    }
  }

  async getAsset(assetId: string): Promise<any> {
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.universalAssetFactory,
        UNIVERSAL_ASSET_FACTORY_ABI,
        this.provider
      );

      return await contract.getAsset(assetId);
    } catch (error) {
      console.error('Error getting asset:', error);
      throw error;
    }
  }

  async getUserAssets(userAddress: string): Promise<string[]> {
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.universalAssetFactory,
        UNIVERSAL_ASSET_FACTORY_ABI,
        this.provider
      );

      return await contract.getUserAssets(userAddress);
    } catch (error) {
      console.error('Error getting user assets:', error);
      throw error;
    }
  }

  // NFT Marketplace Methods
  async listAsset(assetId: string, price: string, duration: number): Promise<number> {
    try {
      const signer = await this.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.nftMarketplace,
        NFT_MARKETPLACE_ABI,
        signer
      );

      const tx = await contract.listAsset(
        assetId,
        ethers.parseUnits(price, 18),
        duration
      );

      const receipt = await tx.wait();
      return receipt.logs[0].args.listingId;
    } catch (error) {
      console.error('Error listing asset:', error);
      throw error;
    }
  }

  async buyAsset(listingId: number, price: string): Promise<void> {
    try {
      const signer = await this.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.nftMarketplace,
        NFT_MARKETPLACE_ABI,
        signer
      );

      const tx = await contract.buyAsset(listingId, {
        value: ethers.parseUnits(price, 18)
      });

      await tx.wait();
    } catch (error) {
      console.error('Error buying asset:', error);
      throw error;
    }
  }

  async getAssetListings(assetId: string): Promise<ListingData[]> {
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.nftMarketplace,
        NFT_MARKETPLACE_ABI,
        this.provider
      );

      const listings = await contract.getAssetListings(assetId);
      return listings.map((listing: any) => ({
        listingId: Number(listing.listingId),
        assetId: listing.assetId,
        seller: listing.seller,
        price: ethers.formatUnits(listing.price, 18),
        isActive: listing.isActive,
        createdAt: Number(listing.createdAt),
        expiresAt: Number(listing.expiresAt)
      }));
    } catch (error) {
      console.error('Error getting asset listings:', error);
      throw error;
    }
  }

  // Trust Token Methods
  async getTrustTokenBalance(address: string): Promise<string> {
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trustToken,
        TRUST_TOKEN_ABI,
        this.provider
      );

      const balance = await contract.balanceOf(address);
      return ethers.formatUnits(balance, 18);
    } catch (error) {
      console.error('Error getting TRUST token balance:', error);
      throw error;
    }
  }

  async approveTrustToken(spender: string, amount: string): Promise<void> {
    try {
      const signer = await this.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trustToken,
        TRUST_TOKEN_ABI,
        signer
      );

      const tx = await contract.approve(spender, ethers.parseUnits(amount, 18));
      await tx.wait();
    } catch (error) {
      console.error('Error approving TRUST tokens:', error);
      throw error;
    }
  }

  async mintTrustTokens(amount: string): Promise<void> {
    try {
      const signer = await this.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trustToken,
        TRUST_TOKEN_ABI,
        signer
      );

      const tx = await contract.mint(ethers.parseUnits(amount, 18));
      await tx.wait();
    } catch (error) {
      console.error('Error minting TRUST tokens:', error);
      throw error;
    }
  }

  // Attestor Verification System Methods
  async registerAttestor(attestorData: AttestorData): Promise<void> {
    try {
      const signer = await this.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        signer
      );

      const tx = await contract.registerAttestor(
        attestorData.attestorType,
        attestorData.tier,
        attestorData.specializations,
        attestorData.countries,
        attestorData.experienceYears,
        attestorData.contactInfo,
        attestorData.credentials,
        attestorData.uploadedDocuments,
        attestorData.documentTypes
      );

      await tx.wait();
    } catch (error) {
      console.error('Error registering attestor:', error);
      throw error;
    }
  }

  async getAttestorProfile(attestorAddress: string): Promise<any> {
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.provider
      );

      return await contract.getAttestorProfile(attestorAddress);
    } catch (error) {
      console.error('Error getting attestor profile:', error);
      throw error;
    }
  }

  async getTierRequirements(tier: AttestorTier): Promise<TierRequirements> {
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.provider
      );

      const requirements = await contract.getTierRequirements(tier);
      return {
        stakeAmount: ethers.formatUnits(requirements.stakeAmount, 18),
        registrationFee: ethers.formatUnits(requirements.registrationFee, 18),
        requiredDocuments: requirements.requiredDocuments,
        minExperienceYears: Number(requirements.minExperienceYears)
      };
    } catch (error) {
      console.error('Error getting tier requirements:', error);
      throw error;
    }
  }

  async isAttestor(address: string): Promise<boolean> {
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.provider
      );

      return await contract.isAttestor(address);
    } catch (error) {
      console.error('Error checking if address is attestor:', error);
      throw error;
    }
  }

  async updateAttestorStatus(attestorAddress: string, status: VerificationStatus): Promise<void> {
    try {
      const signer = await this.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        signer
      );

      const tx = await contract.updateAttestorStatus(attestorAddress, status);
      await tx.wait();
    } catch (error) {
      console.error('Error updating attestor status:', error);
      throw error;
    }
  }

  async approveVerification(requestId: string, comments: string): Promise<void> {
    try {
      const signer = await this.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        signer
      );

      const tx = await contract.approveVerification(requestId, comments);
      await tx.wait();
    } catch (error) {
      console.error('Error approving verification:', error);
      throw error;
    }
  }

  async rejectVerification(requestId: string, comments: string): Promise<void> {
    try {
      const signer = await this.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        signer
      );

      const tx = await contract.rejectVerification(requestId, comments);
      await tx.wait();
    } catch (error) {
      console.error('Error rejecting verification:', error);
      throw error;
    }
  }

  async getVerificationRequest(requestId: string): Promise<any> {
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.provider
      );

      return await contract.getVerificationRequest(requestId);
    } catch (error) {
      console.error('Error getting verification request:', error);
      throw error;
    }
  }

  async getUserRequests(userAddress: string): Promise<string[]> {
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.provider
      );

      return await contract.getUserRequests(userAddress);
    } catch (error) {
      console.error('Error getting user requests:', error);
      throw error;
    }
  }

  // Admin Methods
  async hasRole(role: string, address: string): Promise<boolean> {
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.provider
      );

      return await contract.hasRole(role, address);
    } catch (error) {
      console.error('Error checking role:', error);
      throw error;
    }
  }

  async isAdmin(address: string): Promise<boolean> {
    return this.hasRole(ROLES.DEFAULT_ADMIN_ROLE, address);
  }

  async isVerifier(address: string): Promise<boolean> {
    return this.hasRole(ROLES.VERIFIER_ROLE, address);
  }
}

// Export singleton instance
export const contractService = new ContractService();
export default contractService;
