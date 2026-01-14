import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ethers } from 'ethers';

@Controller('public')
export class PublicController {
  private readonly HEDERA_RPC_URL = 'https://testnet.hashio.io/api';
  private readonly UNIVERSAL_ASSET_FACTORY_ADDRESS = '0x14A3457Ab49C4E8c09C24C03d0C20e89Ff7A0A39';
  private readonly PROFESSIONAL_ATTESTOR_ADDRESS = '0x51bB4F42bD8b4eE9D84Fb148c5c0884DD85C0EF9';

  private readonly UNIVERSAL_ASSET_FACTORY_ABI = [
    'function getAsset(bytes32 assetId) view returns (bytes32 id, address owner, uint8 category, string assetType, string name, string location, uint256 totalValue, uint256 maturityDate, uint8 verificationScore, bool isActive, uint256 createdAt, address nftContract, uint256 tokenId, uint8 verificationLevel)',
    'function getAssetEvidence(bytes32 assetId) view returns (string[] evidenceHashes, string[] documentTypes)'
  ];

  private readonly PROFESSIONAL_ATTESTOR_ABI = [
    'function getUserRequests(address user) view returns (bytes32[])',
    'function getVerificationRequest(bytes32 requestId) view returns (tuple(bytes32 requestId, address assetOwner, bytes32 assetId, uint8 requiredType, string[] evidenceHashes, string[] documentTypes, uint256 requestedAt, uint256 deadline, uint8 status, string comments, uint256 fee, address assignedAttestor))'
  ];

  @Get('asset/:assetId')
  async getPublicAssetData(@Param('assetId') assetId: string) {
    try {
      // Validate assetId format
      if (!/^0x[a-fA-F0-9]{64}$/.test(assetId)) {
        throw new HttpException('Invalid asset ID format', HttpStatus.BAD_REQUEST);
      }

      const provider = new ethers.JsonRpcProvider(this.HEDERA_RPC_URL);
      
      const universalAssetFactory = new ethers.Contract(
        this.UNIVERSAL_ASSET_FACTORY_ADDRESS,
        this.UNIVERSAL_ASSET_FACTORY_ABI,
        provider
      );

      const professionalAttestor = new ethers.Contract(
        this.PROFESSIONAL_ATTESTOR_ADDRESS,
        this.PROFESSIONAL_ATTESTOR_ABI,
        provider
      );

      // Get asset data
      const asset = await universalAssetFactory.getAsset(assetId);
      const evidence = await universalAssetFactory.getAssetEvidence(assetId);
      
      // Parse location
      let locationObj = {
        address: asset.location,
        city: 'Unknown',
        state: 'Unknown',
        country: 'Unknown'
      };

      try {
        const parsedLocation = JSON.parse(asset.location);
        if (parsedLocation && typeof parsedLocation === 'object') {
          locationObj = {
            address: parsedLocation.address || asset.location,
            city: parsedLocation.city || 'Unknown',
            state: parsedLocation.state || 'Unknown',
            country: parsedLocation.country || 'Unknown'
          };
        }
      } catch (e) {
        locationObj.address = asset.location;
      }

      const assetData = {
        id: asset.id,
        assetId: assetId,
        owner: asset.owner,
        category: asset.category,
        assetType: asset.assetType,
        name: asset.name,
        location: locationObj,
        totalValue: asset.totalValue.toString(),
        maturityDate: asset.maturityDate.toString(),
        verificationScore: Number(asset.verificationScore),
        isActive: asset.isActive,
        createdAt: asset.createdAt.toString(),
        nftContract: asset.nftContract,
        tokenId: asset.tokenId.toString(),
        verificationLevel: Number(asset.verificationLevel),
        evidenceHashes: evidence[0] || [],
        documentTypes: evidence[1] || [],
        createdAtDate: new Date(Number(asset.createdAt) * 1000).toISOString(),
        valueInHbar: Number(asset.totalValue.toString()) / 100000000
      };

      // Try to get verification data
      let verification = null;
      try {
        const userRequests = await professionalAttestor.getUserRequests(asset.owner);
        for (const requestId of userRequests) {
          const request = await professionalAttestor.getVerificationRequest(requestId);
          if (request[2] === assetId) { // Check if assetId matches
            verification = {
              requestId: request[0],
              assetOwner: request[1],
              assetId: request[2],
              requiredType: Number(request[3]),
              status: Number(request[8]),
              requestedAt: new Date(Number(request[6]) * 1000).toISOString(),
              deadline: new Date(Number(request[7]) * 1000).toISOString(),
              fee: ethers.formatEther(request[10]),
              assignedAttestor: request[11],
              evidenceHashes: request[4],
              documentTypes: request[5],
              comments: request[9]
            };
            break;
          }
        }
      } catch (e) {
        console.warn('Could not fetch verification data:', e);
      }

      return {
        success: true,
        data: {
          asset: assetData,
          verification,
          evidence: evidence[0] || [],
          documentTypes: evidence[1] || []
        }
      };

    } catch (error) {
      console.error('Error fetching public asset data:', error);
      throw new HttpException(
        'Failed to fetch asset data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('asset/:assetId/verification')
  async getAssetVerificationStatus(@Param('assetId') assetId: string) {
    try {
      // Validate assetId format
      if (!/^0x[a-fA-F0-9]{64}$/.test(assetId)) {
        throw new HttpException('Invalid asset ID format', HttpStatus.BAD_REQUEST);
      }

      const provider = new ethers.JsonRpcProvider(this.HEDERA_RPC_URL);
      
      const universalAssetFactory = new ethers.Contract(
        this.UNIVERSAL_ASSET_FACTORY_ADDRESS,
        this.UNIVERSAL_ASSET_FACTORY_ABI,
        provider
      );

      const professionalAttestor = new ethers.Contract(
        this.PROFESSIONAL_ATTESTOR_ADDRESS,
        this.PROFESSIONAL_ATTESTOR_ABI,
        provider
      );

      // Get asset data to find owner
      const asset = await universalAssetFactory.getAsset(assetId);
      
      // Get verification data
      let verification = null;
      try {
        const userRequests = await professionalAttestor.getUserRequests(asset.owner);
        for (const requestId of userRequests) {
          const request = await professionalAttestor.getVerificationRequest(requestId);
          if (request[2] === assetId) {
            verification = {
              requestId: request[0],
              assetOwner: request[1],
              assetId: request[2],
              requiredType: Number(request[3]),
              status: Number(request[8]),
              requestedAt: new Date(Number(request[6]) * 1000).toISOString(),
              deadline: new Date(Number(request[7]) * 1000).toISOString(),
              fee: ethers.formatEther(request[10]),
              assignedAttestor: request[11],
              evidenceHashes: request[4],
              documentTypes: request[5],
              comments: request[9]
            };
            break;
          }
        }
      } catch (e) {
        console.warn('Could not fetch verification data:', e);
      }

      return {
        success: true,
        data: {
          assetId,
          verification,
          isVerified: verification && verification.status === 1
        }
      };

    } catch (error) {
      console.error('Error fetching verification status:', error);
      throw new HttpException(
        'Failed to fetch verification status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
