import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface Collection {
  collectionId: string;
  name: string;
  description?: string;
  symbol?: string;
  creator: string;
  bannerImage?: string;
  profileImage?: string;
  verified: boolean;
  nftTokenIds: string[];
  totalVolume: number;
  floorPrice: number;
  itemCount: number;
  ownerCount: number;
  listedCount: number;
  stats: {
    sales24h?: number;
    volume24h?: number;
    sales7d?: number;
    volume7d?: number;
    sales30d?: number;
    volume30d?: number;
    avgPrice?: number;
    highestSale?: number;
  };
  royalty: {
    percentage: number;
    receiver: string;
  };
  category: string[];
  socialLinks: {
    twitter?: string;
    discord?: string;
    website?: string;
    instagram?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const collectionsService = {
  /**
   * Create a new collection
   */
  async createCollection(data: {
    name: string;
    description?: string;
    symbol?: string;
    creator: string;
    bannerImage?: string;
    profileImage?: string;
    category?: string[];
    royaltyPercentage?: number;
    socialLinks?: any;
  }): Promise<Collection> {
    const response = await axios.post(`${API_BASE_URL}/collections`, data);
    return response.data.data;
  },

  /**
   * Get collection by ID
   */
  async getCollection(collectionId: string): Promise<Collection> {
    const response = await axios.get(`${API_BASE_URL}/collections/${collectionId}`);
    return response.data.data;
  },

  /**
   * Get all collections with filters
   */
  async getCollections(filters?: {
    creator?: string;
    verified?: boolean;
    category?: string;
    sortBy?: 'volume' | 'floor' | 'items' | 'created';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    skip?: number;
  }): Promise<{ collections: Collection[]; total: number }> {
    const params = new URLSearchParams();
    
    if (filters?.creator) params.append('creator', filters.creator);
    if (filters?.verified !== undefined) params.append('verified', filters.verified.toString());
    if (filters?.category) params.append('category', filters.category);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.skip) params.append('skip', filters.skip.toString());

    const response = await axios.get(`${API_BASE_URL}/collections?${params.toString()}`);
    return {
      collections: response.data.data,
      total: response.data.total,
    };
  },

  /**
   * Add NFT to collection
   */
  async addNFTToCollection(collectionId: string, tokenId: string): Promise<Collection> {
    const response = await axios.post(`${API_BASE_URL}/collections/${collectionId}/nfts`, {
      tokenId,
    });
    return response.data.data;
  },

  /**
   * Update collection stats
   */
  async updateCollectionStats(
    collectionId: string,
    stats: {
      floorPrice?: number;
      totalVolume?: number;
      listedCount?: number;
      ownerCount?: number;
      sales24h?: number;
      volume24h?: number;
    }
  ): Promise<Collection> {
    const response = await axios.put(`${API_BASE_URL}/collections/${collectionId}/stats`, stats);
    return response.data.data;
  },

  /**
   * Search collections
   */
  async searchCollections(query: string, limit?: number): Promise<Collection[]> {
    const params = new URLSearchParams({ q: query });
    if (limit) params.append('limit', limit.toString());
    
    const response = await axios.get(`${API_BASE_URL}/collections/search/query?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Get trending collections
   */
  async getTrendingCollections(limit?: number): Promise<Collection[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await axios.get(`${API_BASE_URL}/collections/trending/list${params}`);
    return response.data.data;
  },

  /**
   * Get collections by creator
   */
  async getCollectionsByCreator(creator: string): Promise<Collection[]> {
    const response = await axios.get(`${API_BASE_URL}/collections/creator/${creator}`);
    return response.data.data;
  },
};

