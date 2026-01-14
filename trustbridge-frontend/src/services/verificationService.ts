import { ethers } from 'ethers';
import { contractService } from './contractService';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../config/contracts';

// Import ABIs from contract artifacts
import VerificationRegistryABI from '../contracts/VerificationRegistry.json';
import AttestorVerificationSystemABI from '../contracts/AttestorVerificationSystem.json';

// Use imported ABIs
const VERIFICATION_REGISTRY_ABI = VerificationRegistryABI.abi;
const ATTESTOR_VERIFICATION_SYSTEM_ABI = AttestorVerificationSystemABI.abi;

export enum VerificationStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
  SUSPENDED = 3
}

export interface VerificationRequest {
  requestId: string;
  assetId: string;
  requiredType: number;
  evidenceHashes: string[];
  documentTypes: string[];
  requestedAt: number;
  deadline: number;
  status: VerificationStatus;
  comments: string;
  fee: string;
  assignedAttestor: string;
}

export interface VerificationRecord {
  verified: boolean;
  score: number;
  expiresAt: number;
  status: VerificationStatus;
}

class VerificationService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;

  async connect(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not detected');
      }

      await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x128' }],
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

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async requestVerification(
    assetId: string,
    requiredType: number,
    evidenceHashes: string[],
    documentTypes: string[],
    deadline: number
  ): Promise<{ success: boolean; requestId?: string; transactionHash?: string; error?: string }> {
    try {
      if (!this.signer) {
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

      // The contract now uses TRUST tokens for verification fee (100 TRUST tokens)
      // We need to approve TRUST tokens first, then call the function without value
      const verificationFee = ethers.parseEther('100'); // 100 TRUST tokens
      
      console.log('🔍 Requesting verification...');
      console.log('Asset ID:', assetId);
      console.log('Required Type:', requiredType);
      console.log('Fee: 100 TRUST tokens');

      // Check and approve TRUST tokens
      const trustTokenAddress = '0x0fB610F665dCfd6A55515eBe735413ceB82a1501';
      const trustTokenABI = [
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

      const trustTokenContract = new ethers.Contract(trustTokenAddress, trustTokenABI, this.signer);
      
      // Check TRUST token balance first
      const userAddress = await this.signer.getAddress();
      console.log('🔍 Frontend user address:', userAddress);
      console.log('🔍 Frontend signer address:', await this.signer.getAddress());
      console.log('🔍 Frontend provider network:', await this.signer.provider.getNetwork());
      
      const trustBalance = await trustTokenContract.balanceOf(userAddress);
      console.log('Current TRUST balance:', ethers.formatEther(trustBalance), 'TRUST');
      
      if (trustBalance < verificationFee) {
        return {
          success: false,
          error: `Insufficient TRUST tokens. You have ${ethers.formatEther(trustBalance)} TRUST but need ${ethers.formatEther(verificationFee)} TRUST for verification. Please mint more TRUST tokens.`
        };
      }
      
      // Always check and approve TRUST tokens (don't rely on cached values)
      console.log('🔍 Checking TRUST token allowance...');
      console.log('User address:', userAddress);
      console.log('Attestor contract:', CONTRACT_ADDRESSES.attestorVerificationSystem);
      
      // Force fresh data by using a new contract instance and provider
      const freshProvider = new ethers.BrowserProvider(window.ethereum);
      const freshSigner = await freshProvider.getSigner();
      const freshTrustTokenContract = new ethers.Contract(trustTokenAddress, trustTokenABI, freshSigner);
      
      const currentAllowance = await freshTrustTokenContract.allowance(
        userAddress,
        CONTRACT_ADDRESSES.attestorVerificationSystem
      );

      console.log('Current TRUST allowance (fresh):', ethers.formatEther(currentAllowance), 'TRUST');
      console.log('Required allowance:', ethers.formatEther(verificationFee), 'TRUST');

      // Always approve TRUST tokens to ensure we have enough allowance
      console.log('🔐 Approving TRUST tokens for verification...');
      console.log('Approving to contract:', CONTRACT_ADDRESSES.attestorVerificationSystem);
      console.log('Approving amount:', ethers.formatEther(verificationFee), 'TRUST');
      
      const approveTx = await freshTrustTokenContract.approve(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        verificationFee
      );
      
      console.log('Approval transaction sent:', approveTx.hash);
      const approveReceipt = await approveTx.wait();
      console.log('✅ TRUST token approval confirmed in block:', approveReceipt.blockNumber);
      
      // Wait a moment for the transaction to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify the approval was successful with fresh data
      const newAllowance = await freshTrustTokenContract.allowance(
        userAddress,
        CONTRACT_ADDRESSES.attestorVerificationSystem
      );
      console.log('New allowance after approval (fresh):', ethers.formatEther(newAllowance), 'TRUST');
      console.log('🔍 Verification - User address:', userAddress);
      console.log('🔍 Verification - Attestor contract:', CONTRACT_ADDRESSES.attestorVerificationSystem);
      console.log('🔍 Verification - Required fee:', ethers.formatEther(verificationFee), 'TRUST');
      console.log('🔍 Verification - Actual allowance:', ethers.formatEther(newAllowance), 'TRUST');
      console.log('🔍 Verification - Allowance sufficient:', newAllowance >= verificationFee);
      
      if (newAllowance < verificationFee) {
        throw new Error(`Approval failed. Expected: ${ethers.formatEther(verificationFee)} TRUST, Got: ${ethers.formatEther(newAllowance)} TRUST`);
      }

      // The assetId is already a hex string from the Hedera contract, use it directly
      const assetIdBytes32 = assetId.startsWith('0x') ? assetId : `0x${assetId}`;
      console.log('Asset ID bytes32:', assetIdBytes32);
      console.log('Evidence hashes:', evidenceHashes);
      console.log('Document types:', documentTypes);
      console.log('Deadline:', deadline);

      // Call requestVerification without value (TRUST tokens are handled internally)
      console.log('🚀 Calling requestVerification with parameters:');
      console.log('- Asset ID:', assetIdBytes32);
      console.log('- Required Type:', requiredType);
      console.log('- Evidence Hashes:', evidenceHashes);
      console.log('- Document Types:', documentTypes);
      console.log('- Deadline:', deadline);
      console.log('- Contract Address:', CONTRACT_ADDRESSES.attestorVerificationSystem);
      
      const tx = await contract.requestVerification(
        assetIdBytes32,
        requiredType,
        evidenceHashes,
        documentTypes,
        deadline
      );

      console.log('Verification request sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Verification request confirmed:', receipt);

      // Extract request ID from events
      const verificationRequestedEvent = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id('VerificationRequested(bytes32,address,bytes32,uint8)')
      );

      let requestId = '';
      if (verificationRequestedEvent) {
        const decoded = contract.interface.parseLog(verificationRequestedEvent);
        requestId = decoded?.args[0] || '';
      }

      return {
        success: true,
        requestId,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Verification request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async completeVerification(
    requestId: string,
    approved: boolean,
    comments: string
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.signer) {
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

      console.log('✅ Completing verification...');
      console.log('Request ID:', requestId);
      console.log('Approved:', approved);
      console.log('Comments:', comments);

      // Convert requestId hex string back to bytes32
      const requestIdBytes32 = ethers.getBytes(requestId);
      
      let tx;
      if (approved) {
        // Use approveVerification function
        console.log('✅ Approving verification...');
        tx = await contract.approveVerification(requestIdBytes32, comments);
      } else {
        // Use rejectVerification function
        console.log('❌ Rejecting verification...');
        tx = await contract.rejectVerification(requestIdBytes32, comments);
      }
      
      await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Verification completion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getVerificationStatus(assetId: string): Promise<VerificationRecord | null> {
    try {
      if (!assetId || assetId.trim() === '') {
        console.warn('AssetId is empty or null, returning null');
        return null;
      }

      // Check if wallet is connected
      if (!window.ethereum) {
        console.warn('Wallet not connected, returning null');
        return null;
      }

      if (!this.provider) {
        const connectionResult = await this.connect();
        if (!connectionResult.success) {
          console.warn('Failed to connect to wallet:', connectionResult.error);
          return null;
        }
      }

      // Get verification status from ProfessionalAttestor contract
      if (!this.signer) {
        console.warn('No signer available, returning null');
        return null;
      }
      const userAddress = await this.signer.getAddress();
      const attestorContract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.provider
      );

      // Get all verification requests for the user
      const requestIdsResult = await attestorContract.getUserRequests(userAddress);
      
      // Convert Result object to regular array if needed
      let requestIds = requestIdsResult;
      if (requestIdsResult && typeof requestIdsResult === 'object' && requestIdsResult.constructor.name === 'Result') {
        requestIds = Array.from(requestIdsResult);
      } else if (requestIdsResult && typeof requestIdsResult === 'object' && requestIdsResult.length !== undefined) {
        requestIds = Array.from(requestIdsResult);
      }
      
      // Convert assetId string to bytes32 for comparison
      const assetIdBytes32 = ethers.id(assetId);
      
      // Look for a verification request that matches this asset
      for (const requestId of requestIds) {
        try {
          const request = await attestorContract.getVerificationRequest(requestId);
          if (request.assetId === assetIdBytes32) {
            return {
              verified: request.status === 1, // VerificationStatus.APPROVED = 1
              score: 0, // Not available in this contract
              expiresAt: Number(request.deadline),
              status: Number(request.status) as VerificationStatus
            };
          }
        } catch (err) {
          // Skip invalid requests
          continue;
        }
      }
      
      // No verification request found for this asset
      return null;
    } catch (error) {
      console.error('Failed to get verification status:', error);
      return null;
    }
  }

  async getVerificationRequest(requestId: string): Promise<VerificationRequest | null> {
    try {
      if (!this.provider) {
        await this.connect();
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        this.provider
      );

      // Convert requestId hex string back to bytes32
      const requestIdBytes32 = ethers.getBytes(requestId);
      const result = await contract.getVerificationRequest(requestIdBytes32);
      
      return {
        requestId: result[0],
        assetId: result[2],
        requiredType: Number(result[3]),
        evidenceHashes: result[4],
        documentTypes: result[5],
        requestedAt: Number(result[6]),
        deadline: Number(result[7]),
        status: Number(result[8]) as VerificationStatus,
        comments: result[9],
        fee: result[10].toString(),
        assignedAttestor: result[11]
      };
    } catch (error) {
      console.error('Failed to get verification request:', error);
      return null;
    }
  }


  async getSmartContractVerifications(): Promise<VerificationRequest[]> {
    try {
      // Use read-only provider for reading data (no wallet connection required)
      const readOnlyProvider = new ethers.JsonRpcProvider(NETWORK_CONFIG.hederaRpcUrl);

      // Use ProfessionalAttestor contract instead of VerificationRegistry
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.attestorVerificationSystem,
        ATTESTOR_VERIFICATION_SYSTEM_ABI,
        readOnlyProvider
      );

      // Get all verification requests from ProfessionalAttestor contract
      const verifications = await contract.getAllVerificationRequests();
      
      console.log('Raw verification data from contract:', verifications);
      console.log('Verification data type:', typeof verifications);
      console.log('Is array:', Array.isArray(verifications));
      console.log('Length:', verifications?.length);
      
      // Try to convert Proxy object to array if needed
      let verificationArray = verifications;
      if (verifications && typeof verifications === 'object' && verifications.constructor.name === 'Proxy') {
        console.log('Converting Proxy object to array...');
        verificationArray = Array.from(verifications);
        console.log('Converted array:', verificationArray);
        console.log('Converted array length:', verificationArray.length);
      } else if (verifications && typeof verifications === 'object' && verifications.length === 1 && verifications[0] && verifications[0].constructor.name === 'Proxy') {
        console.log('Converting nested Proxy objects to array...');
        verificationArray = Array.from(verifications);
        console.log('Converted array:', verificationArray);
        console.log('Converted array length:', verificationArray.length);
      }
      
      // Check if verifications is valid
      if (!verificationArray || !Array.isArray(verificationArray)) {
        console.log('Invalid verification data, returning empty array');
        return [];
      }

      if (verificationArray.length === 0) {
        console.log('No verification requests found');
        return [];
      }

      // Transform smart contract data to frontend format
      const transformedVerifications: VerificationRequest[] = verificationArray.map((verification: any, index: number) => {
        console.log(`Processing verification ${index}:`, verification);
        
        // Debug fee conversion
        const rawFee = verification.fee;
        // The fee is now in TRUST token units (18 decimals), so convert using formatEther
        const formattedFee = rawFee ? ethers.formatEther(rawFee) : '100';
        console.log('Fee conversion:', { rawFee: rawFee?.toString(), formattedFee, rawFeeNumber: Number(rawFee) });
        
        // Debug evidence hashes
        console.log('Raw evidenceHashes from contract:', verification.evidenceHashes);
        console.log('Raw documentTypes from contract:', verification.documentTypes);
        
        // Debug status mapping
        const rawStatus = verification.status;
        const statusNumber = Number(rawStatus);
        const mappedStatus = this.mapVerificationStatus(statusNumber);
        console.log('Status mapping:', { rawStatus, statusNumber, mappedStatus });
        
        const transformed = {
          requestId: verification.requestId ? ethers.hexlify(verification.requestId) : `request-${index}`, // Convert bytes32 to hex string
          assetId: verification.assetId ? ethers.hexlify(verification.assetId) : `asset-${index}`, // Convert bytes32 to hex string
          status: mappedStatus,
          requiredType: Number(verification.requiredType),
          evidenceHashes: verification.evidenceHashes || [],
          documentTypes: verification.documentTypes || [],
          fee: formattedFee,
          deadline: Number(verification.deadline) * 1000, // Convert to milliseconds
          submittedAt: Number(verification.requestedAt) * 1000, // Use requestedAt from ABI
          score: 0, // Not available in current ABI
          owner: verification.assetOwner || '0x0000000000000000000000000000000000000000',
          attestors: verification.assignedAttestor ? [verification.assignedAttestor] : []
        };
        
        console.log('Transformed evidenceHashes:', transformed.evidenceHashes);
        console.log('Transformed documentTypes:', transformed.documentTypes);
        
        console.log(`Transformed verification ${index}:`, transformed);
        return transformed;
      });

      return transformedVerifications;
    } catch (error) {
      console.error('Failed to get smart contract verifications:', error);
      return [];
    }
  }

  private mapVerificationStatus(status: number): string {
    switch (status) {
      case 0: return 'pending';
      case 1: return 'approved';
      case 2: return 'rejected';
      case 3: return 'suspended';
      default: return 'pending';
    }
  }
}

export const verificationService = new VerificationService();
