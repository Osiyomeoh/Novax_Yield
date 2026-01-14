import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

export interface IPFSFileMetadata {
  name: string;
  type: string;
  size: number;
  description?: string;
  category?: string;
  tags?: string[];
}

export interface IPFSUploadResult {
  cid: string;
  ipfsUrl: string;
  pinSize: number;
  timestamp: string;
}

export interface PresignedUrlResponse {
  url: string;
  fields: Record<string, string>;
}

@Injectable()
export class IPFSService {
  private readonly logger = new Logger(IPFSService.name);
  private readonly pinataApiKey: string;
  private readonly pinataSecretKey: string;
  private readonly pinataGateway: string;

  constructor(private configService: ConfigService) {
    this.pinataApiKey = this.configService.get<string>('PINATA_API_KEY');
    this.pinataSecretKey = this.configService.get<string>('PINATA_SECRET_KEY');
    this.pinataGateway = this.configService.get<string>('PINATA_GATEWAY_URL') || 'gateway.pinata.cloud';

    if (!this.pinataApiKey || !this.pinataSecretKey) {
      this.logger.warn('Pinata API credentials not configured. IPFS functionality will be limited.');
    }
  }

  /**
   * Generate presigned URL for file upload
   */
  async generatePresignedUrl(
    fileName: string,
    fileSize: number,
    fileType: string,
    metadata?: IPFSFileMetadata
  ): Promise<PresignedUrlResponse> {
    try {
      // For now, we'll use direct Pinata API upload
      // In production, you might want to implement actual presigned URLs
      // or use a service like AWS S3 with presigned URLs
      
      this.logger.log(`Generating presigned URL for file: ${fileName}`);
      
      // Return mock presigned URL response
      // In a real implementation, this would generate actual presigned URLs
      return {
        url: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
        fields: {
          'pinataMetadata': JSON.stringify({
            name: fileName,
            keyvalues: {
              category: metadata?.category || 'general',
              description: metadata?.description || '',
              tags: metadata?.tags?.join(',') || ''
            }
          }),
          'pinataOptions': JSON.stringify({
            cidVersion: 1
          })
        }
      };
    } catch (error) {
      this.logger.error('Error generating presigned URL:', error);
      throw new InternalServerErrorException('Failed to generate presigned URL');
    }
  }

  /**
   * Upload file directly to Pinata IPFS
   */
  async uploadFile(
    file: Express.Multer.File,
    metadata?: IPFSFileMetadata
  ): Promise<IPFSUploadResult> {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new BadRequestException('Pinata API credentials not configured');
    }

    try {
      this.logger.log(`Uploading file to IPFS: ${file.originalname}`);

      const formData = new FormData();
      
      // Add file
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });

      // Add metadata
      formData.append('pinataMetadata', JSON.stringify({
        name: file.originalname,
        keyvalues: {
          category: metadata?.category || 'general',
          description: metadata?.description || '',
          tags: metadata?.tags?.join(',') || '',
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size.toString()
        }
      }));

      // Add options
      formData.append('pinataOptions', JSON.stringify({
        cidVersion: 1,
        wrapWithDirectory: false
      }));

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      const { IpfsHash, PinSize } = response.data;
      const ipfsUrl = `https://${this.pinataGateway}/ipfs/${IpfsHash}`;

      this.logger.log(`File uploaded successfully: ${IpfsHash}`);

      return {
        cid: IpfsHash,
        ipfsUrl,
        pinSize: PinSize,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Error uploading file to IPFS:', error);
      if (error.response) {
        this.logger.error('Pinata API error:', error.response.data);
      }
      throw new InternalServerErrorException('Failed to upload file to IPFS');
    }
  }

  /**
   * Upload file from buffer
   */
  async uploadFileFromBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    metadata?: IPFSFileMetadata
  ): Promise<IPFSUploadResult> {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new BadRequestException('Pinata API credentials not configured');
    }

    try {
      this.logger.log(`Uploading file from buffer to IPFS: ${fileName}`);

      const formData = new FormData();
      
      // Add file buffer
      formData.append('file', buffer, {
        filename: fileName,
        contentType: mimeType
      });

      // Add metadata
      formData.append('pinataMetadata', JSON.stringify({
        name: fileName,
        keyvalues: {
          category: metadata?.category || 'general',
          description: metadata?.description || '',
          tags: metadata?.tags?.join(',') || '',
          originalName: fileName,
          mimeType: mimeType,
          size: buffer.length.toString()
        }
      }));

      // Add options
      formData.append('pinataOptions', JSON.stringify({
        cidVersion: 1,
        wrapWithDirectory: false
      }));

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      const { IpfsHash, PinSize } = response.data;
      const ipfsUrl = `https://${this.pinataGateway}/ipfs/${IpfsHash}`;

      this.logger.log(`File uploaded successfully from buffer: ${IpfsHash}`);

      return {
        cid: IpfsHash,
        ipfsUrl,
        pinSize: PinSize,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Error uploading file from buffer to IPFS:', error);
      if (error.response) {
        this.logger.error('Pinata API error:', error.response.data);
      }
      throw new InternalServerErrorException('Failed to upload file to IPFS');
    }
  }

  /**
   * Pin existing file by CID
   */
  async pinFile(cid: string, metadata?: IPFSFileMetadata): Promise<boolean> {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new BadRequestException('Pinata API credentials not configured');
    }

    try {
      this.logger.log(`Pinning file to IPFS: ${cid}`);

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinByHash',
        {
          hashToPin: cid,
          pinataMetadata: {
            name: metadata?.name || `File-${cid}`,
            keyvalues: {
              category: metadata?.category || 'general',
              description: metadata?.description || '',
              tags: metadata?.tags?.join(',') || '',
              pinnedAt: new Date().toISOString()
            }
          },
          pinataOptions: {
            cidVersion: 1
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          }
        }
      );

      this.logger.log(`File pinned successfully: ${cid}`);
      return true;

    } catch (error) {
      this.logger.error('Error pinning file to IPFS:', error);
      if (error.response) {
        this.logger.error('Pinata API error:', error.response.data);
      }
      return false;
    }
  }

  /**
   * Unpin file from IPFS
   */
  async unpinFile(cid: string): Promise<boolean> {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new BadRequestException('Pinata API credentials not configured');
    }

    try {
      this.logger.log(`Unpinning file from IPFS: ${cid}`);

      await axios.delete(
        `https://api.pinata.cloud/pinning/unpin/${cid}`,
        {
          headers: {
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          }
        }
      );

      this.logger.log(`File unpinned successfully: ${cid}`);
      return true;

    } catch (error) {
      this.logger.error('Error unpinning file from IPFS:', error);
      if (error.response) {
        this.logger.error('Pinata API error:', error.response.data);
      }
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(cid: string): Promise<IPFSFileMetadata | null> {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new BadRequestException('Pinata API credentials not configured');
    }

    try {
      this.logger.log(`Getting file metadata: ${cid}`);

      const response = await axios.get(
        `https://api.pinata.cloud/data/pinList?hashContains=${cid}`,
        {
          headers: {
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          }
        }
      );

      const pins = response.data.rows;
      if (pins.length === 0) {
        return null;
      }

      const pin = pins[0];
      const metadata = pin.metadata;

      return {
        name: metadata.name || `File-${cid}`,
        type: metadata.keyvalues?.mimeType || 'application/octet-stream',
        size: parseInt(metadata.keyvalues?.size || '0'),
        description: metadata.keyvalues?.description || '',
        category: metadata.keyvalues?.category || 'general',
        tags: metadata.keyvalues?.tags?.split(',') || []
      };

    } catch (error) {
      this.logger.error('Error getting file metadata:', error);
      return null;
    }
  }

  /**
   * List pinned files
   */
  async listPinnedFiles(): Promise<IPFSUploadResult[]> {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new BadRequestException('Pinata API credentials not configured');
    }

    try {
      this.logger.log('Listing pinned files');

      const response = await axios.get(
        'https://api.pinata.cloud/data/pinList?status=pinned',
        {
          headers: {
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          }
        }
      );

      const pins = response.data.rows.map(pin => ({
        cid: pin.ipfs_pin_hash,
        ipfsUrl: `https://${this.pinataGateway}/ipfs/${pin.ipfs_pin_hash}`,
        pinSize: pin.size,
        timestamp: pin.date_pinned
      }));

      this.logger.log(`Found ${pins.length} pinned files`);
      return pins;

    } catch (error) {
      this.logger.error('Error listing pinned files:', error);
      throw new InternalServerErrorException('Failed to list pinned files');
    }
  }

  /**
   * Get file URL from CID
   */
  getFileUrl(cid: string): string {
    return `https://${this.pinataGateway}/ipfs/${cid}`;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: Express.Multer.File, maxSize: number = 50 * 1024 * 1024): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`
      };
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/json'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'File type not supported'
      };
    }

    return { valid: true };
  }
}
