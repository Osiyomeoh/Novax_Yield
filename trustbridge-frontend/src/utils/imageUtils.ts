/**
 * Image Utility Functions
 * Handles IPFS URL normalization, image loading, and fallbacks
 */

/**
 * Normalize IPFS URL to HTTP gateway URL
 */
export const normalizeIPFSUrl = (url: string | undefined | null): string | null => {
  if (!url) return null;
  
  // If already HTTP/HTTPS, check if it's an IPFS gateway URL and extract CID
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Check if it's already a valid IPFS gateway URL
    const ipfsMatch = url.match(/\/ipfs\/([^\/\?]+)/);
    if (ipfsMatch) {
      const cid = ipfsMatch[1];
      // Validate CID format (real CIDs only, not test values)
      // baf CIDs can be 59-62 characters, Qm CIDs are 46 characters
      if (cid.match(/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]{56,62})$/)) {
        // Use configured gateway or default
        const gateway = import.meta.env.VITE_PINATA_GATEWAY_URL || 'gateway.pinata.cloud';
        return `https://${gateway}/ipfs/${cid}`;
      }
    }
    // If it's HTTP but not IPFS, return as-is (might be external image)
    return url;
  }
  
  // If ipfs:// protocol, convert to gateway URL
  if (url.startsWith('ipfs://')) {
    let cid = url.replace('ipfs://', '').replace('ipfs/', '');
    // Remove any trailing slashes or query params
    cid = cid.split('/')[0].split('?')[0];
    
    // Validate CID format (skip test values like QmImage, QmTestImage)
    // baf CIDs can be 59-62 characters, Qm CIDs are 46 characters
    if (cid.match(/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]{56,62})$/)) {
      const gateway = import.meta.env.VITE_PINATA_GATEWAY_URL || 'gateway.pinata.cloud';
      return `https://${gateway}/ipfs/${cid}`;
    } else {
      console.warn(`⚠️ Invalid or test IPFS CID detected: ${cid}`);
      return null; // Return null for invalid/test CIDs
    }
  }
  
  // If just CID (no protocol), assume it's IPFS
  // baf CIDs can be 59-62 characters, Qm CIDs are 46 characters
  if (url.match(/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]{56,62})$/)) {
    const gateway = import.meta.env.VITE_PINATA_GATEWAY_URL || 'gateway.pinata.cloud';
    return `https://${gateway}/ipfs/${url}`;
  }
  
  // Return null if can't determine (don't return invalid URLs)
  console.warn(`⚠️ Could not normalize IPFS URL: ${url}`);
  return null;
};

/**
 * Get image URL with fallbacks
 */
export const getAssetImageUrl = (asset: any): string | null => {
  // Try multiple possible image fields
  const imageSources = [
    asset.imageURI,
    asset.displayImage,
    asset.image,
    asset.metadata?.image,
    asset.metadata?.imageURI,
    asset.metadata?.displayImage
  ];
  
  for (const source of imageSources) {
    if (source) {
      const normalized = normalizeIPFSUrl(source);
      if (normalized) {
        return normalized;
      }
    }
  }
  
  return null;
};

/**
 * Get image URL with backend proxy (for CORS issues)
 */
export const getAssetImageUrlWithProxy = (asset: any): string | null => {
  const imageUrl = getAssetImageUrl(asset);
  if (!imageUrl) return null;
  
  // If it's an IPFS URL, use backend proxy
  if (imageUrl.includes('/ipfs/')) {
    const cid = imageUrl.split('/ipfs/')[1]?.split('?')[0];
    if (cid) {
      const serverUrl = import.meta.env.VITE_API_URL || '';
      if (serverUrl) {
        return `${serverUrl}/api/ipfs/file/${cid}`;
      }
    }
  }
  
  return imageUrl;
};

/**
 * Try multiple IPFS gateways if one fails
 */
export const getIPFSGatewayUrl = (cid: string, attempt: number = 0): string => {
  const gateways = [
    import.meta.env.VITE_PINATA_GATEWAY_URL || 'gateway.pinata.cloud',
    'ipfs.io',
    'dweb.link',
    'cloudflare-ipfs.com'
  ];
  
  const gateway = gateways[attempt % gateways.length];
  return `https://${gateway}/ipfs/${cid}`;
};

