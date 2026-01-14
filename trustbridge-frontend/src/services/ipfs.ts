// IPFS service using backend API

export interface IPFSUploadResult {
  cid: string;
  ipfsUrl: string;
  pinSize: number;
  timestamp: string;
}

export interface IPFSFileMetadata {
  name: string;
  type: string;
  size: number;
  description?: string;
  category?: string;
  tags?: string[];
}

class IPFSService {
  private serverUrl: string;

  constructor() {
    this.serverUrl = (import.meta as any).env.VITE_SERVER_URL;
  }

  /**
   * Upload a file to IPFS using backend service
   */
  async uploadFile(
    file: File, 
    metadata?: IPFSFileMetadata
  ): Promise<IPFSUploadResult> {
    try {
      // Validate file before processing
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Use FormData for more efficient file upload (no base64 conversion needed)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);
      formData.append('fileType', file.type);
      formData.append('metadata', JSON.stringify(metadata || {}));

      // Upload file through backend using FormData
      const response = await fetch(`${this.serverUrl}/api/ipfs/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in to upload files.');
        }
        throw new Error(`Upload failed: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      
      console.log('IPFS upload response:', result);
      
      if (!result.success) {
        console.error('IPFS upload failed:', result);
        throw new Error(`Upload failed: ${result.message || 'Unknown error'}`);
      }

      return result.data;

    } catch (error) {
      console.error('IPFS upload error:', error);
      throw new Error(`Failed to upload file to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple files to IPFS
   */
  async uploadFiles(
    files: File[], 
    metadata?: IPFSFileMetadata
  ): Promise<IPFSUploadResult[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, metadata));
    return Promise.all(uploadPromises);
  }

  /**
   * Get file from IPFS using CID
   */
  async getFile(cid: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.serverUrl}/api/ipfs/file/${cid}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get file: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('IPFS get file error:', error);
      throw new Error(`Failed to get file from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file URL from IPFS using CID (with caching)
   */
  async getFileUrl(cid: string, useCache = true): Promise<string> {
    if (useCache) {
      const { assetCacheService } = await import('./assetCacheService');
      const cached = await assetCacheService.getCachedIPFS(cid);
      if (cached?.url) {
        return cached.url;
      }
    }
    
    const url = `https://${(import.meta as any).env.VITE_PINATA_GATEWAY_URL || 'gateway.pinata.cloud'}/ipfs/${cid}`;
    
    // Cache the URL
    if (useCache) {
      const { assetCacheService } = await import('./assetCacheService');
      await assetCacheService.cacheIPFS(cid, { url, timestamp: Date.now() });
    }
    
    return url;
  }

  /**
   * Get file URL through backend proxy (to avoid CORS and rate limiting, with caching)
   */
  async getProxyFileUrl(cid: string, useCache = true): Promise<string> {
    if (useCache) {
      const { assetCacheService } = await import('./assetCacheService');
      const cached = await assetCacheService.getCachedIPFS(cid);
      if (cached?.proxyUrl) {
        return cached.proxyUrl;
      }
    }
    
    const proxyUrl = !this.serverUrl 
      ? await this.getFileUrl(cid, useCache)
      : `${this.serverUrl}/api/ipfs/file/${cid}`;
    
    // Cache the proxy URL
    if (useCache) {
      const { assetCacheService } = await import('./assetCacheService');
      const cached = await assetCacheService.getCachedIPFS(cid) || {};
      await assetCacheService.cacheIPFS(cid, { 
        ...cached, 
        proxyUrl, 
        timestamp: Date.now() 
      });
    }
    
    return proxyUrl;
  }

  /**
   * Pin a file to IPFS (server-side operation)
   */
  async pinFile(cid: string, metadata?: IPFSFileMetadata): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/api/ipfs/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
        },
        body: JSON.stringify({
          cid,
          metadata: metadata || {}
        })
      });

      return response.ok;
    } catch (error) {
      console.error('IPFS pin error:', error);
      return false;
    }
  }

  /**
   * Unpin a file from IPFS (server-side operation)
   */
  async unpinFile(cid: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/api/ipfs/unpin/${cid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('IPFS unpin error:', error);
      return false;
    }
  }

  /**
   * Get file metadata from IPFS
   */
  async getFileMetadata(cid: string): Promise<IPFSFileMetadata | null> {
    try {
      const response = await fetch(`${this.serverUrl}/api/ipfs/metadata/${cid}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
        }
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('IPFS metadata error:', error);
      return null;
    }
  }

  /**
   * List all pinned files
   */
  async listPinnedFiles(): Promise<IPFSUploadResult[]> {
    try {
      const response = await fetch(`${this.serverUrl}/api/ipfs/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('IPFS list error:', error);
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File, maxSize: number = 50 * 1024 * 1024): { valid: boolean; error?: string } {
    // Check file size (default 50MB)
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

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not supported'
      };
    }

    return { valid: true };
  }

  /**
   * Get file preview URL
   */
  getPreviewUrl(cid: string, fileType: string): string {
    const baseUrl = this.getFileUrl(cid);
    
    // For images, return direct URL
    if (fileType.startsWith('image/')) {
      return baseUrl;
    }
    
    // For PDFs, use PDF.js viewer
    if (fileType === 'application/pdf') {
      return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(baseUrl)}`;
    }
    
    // For other files, return direct URL
    return baseUrl;
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();
export default ipfsService;
