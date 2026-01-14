// IPFS Configuration
export const IPFS_CONFIG = {
  // Pinata Gateway URL - Replace with your actual gateway domain
  GATEWAY_URL: import.meta.env.VITE_PINATA_GATEWAY_URL || 'gateway.pinata.cloud',
  
  // Pinata JWT Token - Replace with your actual JWT token
  JWT_TOKEN: import.meta.env.VITE_PINATA_JWT || '',
  
  // Server URL for presigned URLs
  SERVER_URL: import.meta.env.VITE_SERVER_URL,
  
  // File upload limits
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Allowed file types
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  
  // IPFS Gateway URLs (fallback options)
  GATEWAY_URLS: [
    'gateway.pinata.cloud',
    'ipfs.io',
    'cloudflare-ipfs.com',
    'dweb.link'
  ]
};

// Helper function to get file URL from CID
export const getIPFSFileUrl = (cid: string, gateway?: string): string => {
  const gatewayUrl = gateway || IPFS_CONFIG.GATEWAY_URL;
  return `https://${gatewayUrl}/ipfs/${cid}`;
};

// Helper function to validate file type
export const isValidFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.slice(0, -1));
    }
    return file.type === type;
  });
};

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to get file icon based on type
export const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType === 'application/pdf') return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('text')) return '📄';
  return '📁';
};
