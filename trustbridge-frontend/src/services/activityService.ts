import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface ActivityEvent {
  id: string;
  type: 'sale' | 'listing' | 'offer' | 'transfer' | 'mint';
  timestamp: string;
  transactionId: string;
  nftContract: string;
  tokenId: string;
  serialNumber: string;
  from: string;
  to: string;
  price?: number;
  currency?: string;
  metadata?: any;
}

export const activityService = {
  /**
   * Get activity for a specific NFT
   */
  async getNFTActivity(tokenId: string, serialNumber: string, limit?: number): Promise<ActivityEvent[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await axios.get(`${API_BASE_URL}/activity/nft/${tokenId}/${serialNumber}${params}`);
    return response.data.data;
  },

  /**
   * Get activity for a user
   */
  async getUserActivity(accountId: string, limit?: number): Promise<ActivityEvent[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await axios.get(`${API_BASE_URL}/activity/user/${accountId}${params}`);
    return response.data.data;
  },

  /**
   * Get marketplace activity
   */
  async getMarketplaceActivity(marketplaceAccountId: string, limit?: number): Promise<ActivityEvent[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await axios.get(`${API_BASE_URL}/activity/marketplace/${marketplaceAccountId}${params}`);
    return response.data.data;
  },

  /**
   * Get collection activity
   */
  async getCollectionActivity(tokenId: string, limit?: number): Promise<ActivityEvent[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await axios.get(`${API_BASE_URL}/activity/collection/${tokenId}${params}`);
    return response.data.data;
  },

  /**
   * Get price history for an NFT
   */
  async getNFTPriceHistory(tokenId: string, serialNumber: string): Promise<{ timestamp: string; price: number }[]> {
    const response = await axios.get(`${API_BASE_URL}/activity/nft/${tokenId}/${serialNumber}/price-history`);
    return response.data.data;
  },
};

