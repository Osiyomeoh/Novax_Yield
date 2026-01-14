import { ethers } from 'ethers';
import { StoryClient, StoryConfig } from '@story-protocol/sdk';

export interface IPAsset {
  ipId: string;
  name: string;
  description: string;
  mediaUrl: string;
  metadataUrl: string;
  owner: string;
  registeredAt: number;
  hederaAssetId?: string; // Link to Hedera asset
  txHash: string;
}

export interface IPSearchResult {
  ipId: string;
  name: string;
  description: string;
  owner: string;
  registeredAt: number;
}

class StoryProtocolService {
  private client: StoryClient | null = null;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private isInitialized = false;

  /**
   * Initialize Story Protocol client with Sepolia network
   */
  async initialize() {
    if (this.isInitialized && this.client) {
      return;
    }

    if (!window.ethereum) {
      throw new Error('MetaMask not detected. Please install MetaMask to use Story Protocol.');
    }

    try {
      // Switch to Sepolia network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID (11155111)
      }).catch(async (error: any) => {
        if (error.code === 4902) {
          // Add Sepolia network if it doesn't exist
          const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_KEY';
          
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia',
              rpcUrls: [rpcUrl],
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            }],
          });
        } else {
          throw error;
        }
      });

      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      const account = await this.signer.getAddress();

      const config: StoryConfig = {
        network: 'sepolia',
        transport: 'http',
        account: account,
      };

      this.client = StoryClient.newClient(config);
      this.isInitialized = true;

      console.log('✅ Story Protocol initialized on Sepolia');
    } catch (error) {
      console.error('❌ Failed to initialize Story Protocol:', error);
      throw new Error(`Failed to initialize Story Protocol: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Register a new IP asset on Story Protocol
   */
  async registerIP(assetData: {
    name: string;
    description: string;
    mediaUrl: string;
    metadataUrl: string;
    hederaAssetId?: string;
  }): Promise<IPAsset> {
    if (!this.client || !this.signer) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Story Protocol client not initialized');
    }

    try {
      console.log('📝 Registering IP on Story Protocol:', assetData.name);

      // Register IP on Story Protocol
      const response = await this.client.ipAsset.register({
        name: assetData.name,
        description: assetData.description,
        mediaUrl: assetData.mediaUrl,
        metadataUrl: assetData.metadataUrl,
      });

      const owner = await this.signer!.getAddress();

      const ipAsset: IPAsset = {
        ipId: response.ipId,
        name: assetData.name,
        description: assetData.description,
        mediaUrl: assetData.mediaUrl,
        metadataUrl: assetData.metadataUrl,
        owner: owner,
        registeredAt: Date.now(),
        hederaAssetId: assetData.hederaAssetId,
        txHash: response.txHash,
      };

      console.log('✅ IP registered successfully:', response.ipId);
      return ipAsset;
    } catch (error) {
      console.error('❌ Failed to register IP:', error);
      throw new Error(`Failed to register IP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find IP asset by IP ID
   */
  async findIPById(ipId: string): Promise<IPAsset | null> {
    if (!this.client) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Story Protocol client not initialized');
    }

    try {
      console.log('🔍 Searching for IP by ID:', ipId);

      // Get IP asset details by ID
      const ipAsset = await this.client.ipAsset.get({
        ipId: ipId,
      });

      if (!ipAsset) {
        return null;
      }

      // Fetch metadata from IPFS if available
      let name = ipId;
      let description = '';
      let mediaUrl = '';
      let metadataUrl = '';

      try {
        if (ipAsset.metadataURI) {
          metadataUrl = ipAsset.metadataURI;
          const metadataResponse = await fetch(ipAsset.metadataURI);
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json();
            name = metadata.name || name;
            description = metadata.description || description;
            mediaUrl = metadata.image || metadata.mediaUrl || '';
          }
        }
      } catch (metadataError) {
        console.warn('Could not fetch IP metadata:', metadataError);
      }

      return {
        ipId: ipId,
        name: name,
        description: description,
        mediaUrl: mediaUrl,
        metadataUrl: metadataUrl,
        owner: ipAsset.owner || '',
        registeredAt: ipAsset.createdAt || Date.now(),
        txHash: ipAsset.txHash || '',
      };
    } catch (error) {
      console.error('❌ Failed to find IP by ID:', error);
      return null;
    }
  }

  /**
   * Find IP assets by title/name
   * Note: Story Protocol may not have direct title search, so we'll use metadata search
   */
  async findIPByTitle(title: string): Promise<IPAsset[]> {
    if (!this.client) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Story Protocol client not initialized');
    }

    try {
      console.log('🔍 Searching for IP by title:', title);

      // Story Protocol SDK might have search functionality
      // If not, we'll need to query events or use a subgraph
      const results: IPAsset[] = [];

      // Option 1: Try SDK search if available
      try {
        // This is a placeholder - adjust based on actual SDK API
        const searchResults = await (this.client as any).ipAsset.search?.({
          query: title,
        });

        if (searchResults && Array.isArray(searchResults)) {
          return searchResults.map((result: any) => ({
            ipId: result.ipId,
            name: result.name || title,
            description: result.description || '',
            mediaUrl: result.mediaUrl || '',
            metadataUrl: result.metadataUrl || '',
            owner: result.owner || '',
            registeredAt: result.createdAt || Date.now(),
            txHash: result.txHash || '',
          }));
        }
      } catch (searchError) {
        console.warn('SDK search not available, trying alternative method');
      }

      // Option 2: Query IP assets owned by current user and filter by title
      // This is a fallback - ideally Story Protocol would have a search API
      const owner = await this.signer!.getAddress();
      
      try {
        // Get IPs owned by user
        const ownedIPs = await (this.client as any).ipAsset.getOwned?.({
          owner: owner,
        });

        if (ownedIPs && Array.isArray(ownedIPs)) {
          for (const ip of ownedIPs) {
            // Fetch metadata to check title
            try {
              if (ip.metadataURI) {
                const metadataResponse = await fetch(ip.metadataURI);
                if (metadataResponse.ok) {
                  const metadata = await metadataResponse.json();
                  const ipName = metadata.name?.toLowerCase() || '';
                  
                  if (ipName.includes(title.toLowerCase())) {
                    results.push({
                      ipId: ip.ipId,
                      name: metadata.name || ip.ipId,
                      description: metadata.description || '',
                      mediaUrl: metadata.image || metadata.mediaUrl || '',
                      metadataUrl: ip.metadataURI,
                      owner: ip.owner || owner,
                      registeredAt: ip.createdAt || Date.now(),
                      txHash: ip.txHash || '',
                    });
                  }
                }
              }
            } catch (metadataError) {
              console.warn('Could not fetch metadata for IP:', ip.ipId);
            }
          }
        }
      } catch (ownedError) {
        console.warn('Could not fetch owned IPs:', ownedError);
      }

      return results;
    } catch (error) {
      console.error('❌ Failed to find IP by title:', error);
      return [];
    }
  }

  /**
   * Search IP assets (by title, description, or ID)
   */
  async searchIPs(query: string): Promise<IPAsset[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    // Check if query looks like an IP ID (address format)
    const isIPId = /^0x[a-fA-F0-9]{40}$/.test(query.trim());

    if (isIPId) {
      // Search by ID
      const ip = await this.findIPById(query.trim());
      return ip ? [ip] : [];
    } else {
      // Search by title/name
      return await this.findIPByTitle(query.trim());
    }
  }

  /**
   * Get all IP assets owned by current user
   */
  async getMyIPs(): Promise<IPAsset[]> {
    if (!this.client) {
      await this.initialize();
    }

    if (!this.client || !this.signer) {
      throw new Error('Story Protocol client not initialized');
    }

    try {
      const owner = await this.signer.getAddress();
      console.log('🔍 Fetching IPs owned by:', owner);

      // Get IPs owned by user
      const ownedIPs = await (this.client as any).ipAsset.getOwned?.({
        owner: owner,
      });

      if (!ownedIPs || !Array.isArray(ownedIPs)) {
        return [];
      }

      const ipAssets: IPAsset[] = [];

      for (const ip of ownedIPs) {
        try {
          let name = ip.ipId;
          let description = '';
          let mediaUrl = '';
          let metadataUrl = '';

          if (ip.metadataURI) {
            metadataUrl = ip.metadataURI;
            const metadataResponse = await fetch(ip.metadataURI);
            if (metadataResponse.ok) {
              const metadata = await metadataResponse.json();
              name = metadata.name || name;
              description = metadata.description || description;
              mediaUrl = metadata.image || metadata.mediaUrl || '';
            }
          }

          ipAssets.push({
            ipId: ip.ipId,
            name: name,
            description: description,
            mediaUrl: mediaUrl,
            metadataUrl: metadataUrl,
            owner: ip.owner || owner,
            registeredAt: ip.createdAt || Date.now(),
            txHash: ip.txHash || '',
          });
        } catch (error) {
          console.warn('Could not process IP:', ip.ipId, error);
        }
      }

      return ipAssets;
    } catch (error) {
      console.error('❌ Failed to get user IPs:', error);
      return [];
    }
  }

  /**
   * Link Hedera asset to Story Protocol IP
   */
  async linkHederaAsset(ipId: string, hederaAssetId: string): Promise<void> {
    // Store the link in metadata or backend
    // This could be stored in:
    // 1. Story Protocol IP metadata (update metadataURI)
    // 2. Backend database
    // 3. Hedera asset metadata

    console.log('🔗 Linking IP', ipId, 'to Hedera asset', hederaAssetId);
    
    // Implementation depends on where you want to store the link
    // For now, we'll just log it - you can extend this to update metadata
  }
}

export const storyProtocolService = new StoryProtocolService();


