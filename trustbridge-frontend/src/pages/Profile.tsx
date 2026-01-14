import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
// Profile component for RWA asset management
import { 
  User, 
  Copy, 
  MoreHorizontal, 
  Plus, 
  Settings,
  Building2,
  Globe,
  Shield,
  Activity,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  XCircle,
  Zap,
  Loader2,
  RefreshCw,
  Wallet,
  FileText,
  Grid3X3,
  Heart,
  List,
  Tag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/UI/Card';
import Button from '../components/UI/Button';
import AssetDetailModal from '../components/Assets/AssetDetailModal';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useToast } from '../hooks/useToast';
import { usePrivy } from '@privy-io/react-auth';
import { usePortfolio, useAssetByOwner } from '../hooks/useApi';
import { contractService } from '../services/contractService';
import { trustToUSD, formatUSD as formatUSDPrice } from '../utils/priceUtils';
import { ipfsService } from '../services/ipfs';
import { assetCacheService } from '../services/assetCacheService';
import { hybridAssetService } from '../services/hybridAssetService';
import { robustAssetService } from '../services/robustAssetService';
import { normalizeIPFSUrl } from '../utils/imageUtils';

const Profile: React.FC = () => {
  console.log('🏠 Profile component rendered');
  const { user, authStep, isAuthenticated, startKYC, refreshUser } = useAuth();
  const { address, isConnected, provider } = useWallet();
  console.log('🏠 Profile - Wallet state:', { address, isConnected, hasProvider: !!provider });
  
  // Try to load cached assets synchronously IMMEDIATELY on mount (before async useEffect)
  // This prevents showing 0 assets during the async cache load
  const [initialAssetsLoaded, setInitialAssetsLoaded] = useState(false);
  const { user: privyUser } = usePrivy(); // Get Privy user data (includes Google login info)
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get user display info - prefer backend user data, fallback to Privy Google data
  const displayName = user?.name || 
                     privyUser?.google?.name || 
                     (privyUser?.google?.givenName && privyUser?.google?.familyName 
                       ? `${privyUser.google.givenName} ${privyUser.google.familyName}`.trim()
                       : privyUser?.google?.givenName) || 
                     'Anonymous User';
  const displayEmail = user?.email || 
                      privyUser?.google?.email || 
                      privyUser?.email?.address || 
                      '';
  
  const [activeTab, setActiveTab] = useState('portfolio');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [chainFilter, setChainFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [assetTypeFilter, setAssetTypeFilter] = useState('all');
  const [rwaAssets, setRwaAssets] = useState<any[]>([]);
  const [isLoadingRWA, setIsLoadingRWA] = useState(false);
  const [usdValue, setUsdValue] = useState<string>('Loading...');
  
  // Fetch real data from API - portfolio only, assets must come from blockchain
  const { data: portfolioData, loading: portfolioLoading } = usePortfolio();
  // userAssetsData disabled - assets must come from blockchain only
  const userAssetsData = null;
  const assetsLoading = false;
  const assetsError = null;
  
  // State for user's NFTs from smart contracts
  // Initialize with synchronous cache check to prevent showing 0 on refresh
  // This runs synchronously during component initialization (before first render)
  const [userNFTs, setUserNFTs] = useState<any[]>(() => {
    if (address) {
      try {
        // Try to load from localStorage synchronously (instant, no async delay)
        const syncCache = assetCacheService.getCachedAssetsSync(address);
        if (syncCache && syncCache.length > 0) {
          console.log(`⚡ Initialized state with ${syncCache.length} cached assets (synchronous - prevents showing 0)`);
          return syncCache;
        } else {
          console.log('⚡ No synchronous cache found, starting with empty array');
        }
      } catch (error) {
        console.warn('⚠️ Failed to load sync cache on init:', error);
      }
    }
    return [];
  });
  const [nftsLoading, setNftsLoading] = useState(false);
  
  // Track last fetched address to prevent unnecessary refetches
  const lastFetchedAddressRef = useRef<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState(false);
  
  // State for RWA assets (removed digital assets and old blockchain assets)
  // const [hederaAssets, setHederaAssets] = useState<any[]>([]);
  // const [hederaAssetsLoading] = useState(false);
  
  // Don't clear assets on mount - let them load from blockchain
  // Assets will be fetched by the useEffect below
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [showAssetDetail, setShowAssetDetail] = useState(false);
  
  // Check authentication status and redirect if needed
  useEffect(() => {
    console.log('🔍 Profile - Auth check effect triggered:', { 
      isConnected, 
      address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
      isAuthenticated, 
      authStep, 
      user: !!user,
      userEmail: user?.email,
      userName: user?.name,
      kycStatus: user?.kycStatus,
      fullUserObject: user
    });
    
    if (isConnected && address) {
      // Add a small delay to ensure AuthContext has completed its auth check
      const timer = setTimeout(() => {
        console.log('Profile - Delayed auth check after 500ms:', { 
          isAuthenticated, 
          authStep, 
          user: !!user 
        });
        
        // If user is not authenticated or needs to complete profile
        // Skip if user has email and name (likely from Google login - profile already has data)
        // If user has both email and name, they don't need to complete profile
        const hasProfileData = !!(user?.email && user?.name);
        const needsCompletion = !hasProfileData && (
          !isAuthenticated || 
          authStep === 'wallet' || 
          authStep === 'profile'
        );
        
        if (needsCompletion) {
          console.log('Profile - User needs authentication, redirecting to profile completion');
          console.log('Redirecting because:', {
            notAuthenticated: !isAuthenticated,
            walletStep: authStep === 'wallet',
            profileStep: authStep === 'profile' && !hasProfileData,
            emailStep: authStep === 'email' && !hasProfileData,
            hasUser: !!user,
            userEmail: user?.email,
            userName: user?.name,
            hasProfileData
          });
          // Profile completion is handled by the centralized popup
          return;
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isConnected, address, isAuthenticated, authStep, user, navigate]);
  
  // Refresh user data when component mounts to ensure latest KYC status
  useEffect(() => {
    if (user && address) {
      console.log('Profile - Refreshing user data on mount to get latest KYC status');
      refreshUser().catch(error => {
        console.error('Error refreshing user data on mount:', error);
      });
    }
  }, [address]); // Only run when address changes (user connects)
  
  // Watch for KYC status changes
  useEffect(() => {
    console.log('🔍 Profile - KYC status changed:', {
      kycStatus: user?.kycStatus,
      isApproved: user?.kycStatus?.toLowerCase() === 'approved',
      user: user
    });

    // Show success toast when KYC is approved
    if (user?.kycStatus === 'approved') {
      toast({
        title: 'KYC Verification Complete!',
        description: 'Your identity has been verified. You can now create RWA assets.',
        variant: 'default'
      });
    }
  }, [user?.kycStatus, toast]);

  // Periodic KYC status check when user is not approved
  useEffect(() => {
    // Only poll if user is authenticated and KYC is pending
    if (!isAuthenticated || !user || user.kycStatus === 'approved' || user.kycStatus === 'rejected') {
      return;
    }

    let consecutiveErrors = 0;
    const maxErrors = 3; // Stop polling after 3 consecutive errors

    const interval = setInterval(async () => {
      // Don't poll if not authenticated
      if (!isAuthenticated) {
        clearInterval(interval);
        return;
      }

      try {
        console.log('🔄 Profile - Checking KYC status...');
        await refreshUser();
        consecutiveErrors = 0; // Reset error count on success
      } catch (error: any) {
        consecutiveErrors++;
        const isNetworkError = error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error');
        const isUnauthorized = error?.response?.status === 401;
        
        // Stop polling if too many errors or user is not authenticated
        if (consecutiveErrors >= maxErrors || isUnauthorized) {
          console.log('🛑 Profile - Stopping KYC status polling due to errors or unauthorized');
          clearInterval(interval);
          return;
        }

        // Only log network errors occasionally to reduce spam
        if (isNetworkError && consecutiveErrors % 3 === 0) {
          console.warn(`⚠️ Profile - Network error checking KYC status (${consecutiveErrors}/${maxErrors})`);
        } else if (!isNetworkError) {
          console.error('Error checking KYC status:', error);
        }
      }
    }, 30000); // Check every 30 seconds (reduced frequency)

    return () => clearInterval(interval);
  }, [user?.kycStatus, refreshUser, isAuthenticated]);
  
  // Clear cache when wallet address changes
  useEffect(() => {
    if (address) {
      console.log('🔄 Wallet address changed, clearing cache for:', address);
      // Clear all NFT caches
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && typeof key === 'string' && (key.startsWith('user_nfts_') || key.startsWith('asset_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear sessionStorage assets
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && typeof key === 'string' && key.startsWith('asset_')) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      console.log('🧹 Cleared cache keys:', keysToRemove.length, 'localStorage,', sessionKeysToRemove.length, 'sessionStorage');
    }
  }, [address]);

  // Calculate USD value based on actual assets (userNFTs, rwaAssets)
  // This should match the assets count displayed
  useEffect(() => {
    const calculateUSDValue = async () => {
      // Calculate total value from actual assets only (not portfolio API)
      // Combine userNFTs and rwaAssets to get total asset value
      const allAssets: any[] = [];
      
      // Add NFTs if they exist
      if (userNFTs && userNFTs.length > 0) {
        allAssets.push(...userNFTs);
      }
      
      // Add RWA assets if they exist
      if (rwaAssets && rwaAssets.length > 0) {
        allAssets.push(...rwaAssets);
      }
      
      // If no assets, set USD value to $0.00
      if (allAssets.length === 0) {
        setUsdValue('$0.00');
        return;
      }
      
      // Calculate total value from assets
      const totalValue = allAssets.reduce((sum, asset) => {
        const value = parseFloat(asset.totalValue || asset.value || asset.price || '0') || 0;
        return sum + value;
      }, 0);
      
      if (totalValue > 0) {
        try {
          const usd = await trustToUSD(totalValue);
          setUsdValue(formatUSDPrice(usd));
        } catch (error) {
          console.error('Failed to calculate USD value from assets:', error);
          setUsdValue('$0.00');
        }
      } else {
        setUsdValue('$0.00');
      }
    };
    
    calculateUSDValue();
  }, [userNFTs, rwaAssets]); // Calculate USD value when assets change

  // Listen for navigation state to trigger refresh after asset creation
  useEffect(() => {
    const state = location.state as any;
    if (state?.refreshAssets) {
      console.log('🔄 Received refresh trigger from navigation, forcing asset refresh...');
      setForceRefresh(prev => !prev);
      // Clear the navigation state to prevent repeated refreshes
      navigate(location.pathname, { replace: true, state: {} });
    }
    
    // Also check sessionStorage for refresh flag (set after buying from marketplace)
    const needsRefresh = sessionStorage.getItem('profileNeedsRefresh');
    if (needsRefresh === 'true') {
      console.log('🔄 Profile refresh flag detected (after purchase), forcing asset refresh...');
      sessionStorage.removeItem('profileNeedsRefresh');
      setForceRefresh(prev => !prev);
    }
  }, [location.state, location.pathname, navigate]);

  // Assets must come from blockchain only - fetch from Mantle smart contracts
  useEffect(() => {
    console.log('🔍 ========== PROFILE ASSET FETCH useEffect ==========');
    console.log('🔍 Profile useEffect triggered:', { 
      address, 
      addressLength: address?.length,
      forceRefresh, 
      hasProvider: !!provider,
      isConnected,
      timestamp: new Date().toISOString(),
      userNFTsLength: userNFTs.length,
      lastFetchedAddress: lastFetchedAddressRef.current
    });
    console.log('🔍 Full address value:', address);
    console.log('🔍 Address truthy check:', !!address);
    console.log('🔍 isConnected:', isConnected);
    console.log('🔍 Provider available:', !!provider);
    
    // CRITICAL: If address just became available and we have no assets, try sync cache load
    // This handles the case where address wasn't available during useState initialization
    if (address && userNFTs.length === 0) {
      try {
        const syncCache = assetCacheService.getCachedAssetsSync(address);
        if (syncCache && syncCache.length > 0) {
          console.log(`⚡ Loading ${syncCache.length} cached assets (address just became available)`);
          setUserNFTs(syncCache);
          lastFetchedAddressRef.current = address;
          // Check if we have less than 5 assets - if so, we still need to fetch
          if (syncCache.length < 5) {
            console.warn(`⚠️ Only ${syncCache.length} assets in sync cache, need to fetch to find all 5`);
          }
          // Don't return early - continue to fetch fresh data below
        }
      } catch (error) {
        console.warn('⚠️ Failed to load sync cache when address became available:', error);
      }
    }
    
    // Wait for address to be available (Privy wallets can take time to initialize)
    if (!address) {
      console.log('⚠️ No address yet, waiting for wallet to be ready...');
      console.log('💡 Please connect your wallet to view your assets.');
      console.log('💡 Expected address: 0x00224492F572944500AB4eb91E413cfA34770c60');
      // Only clear if we had a previous address (address changed from valid to null)
      if (lastFetchedAddressRef.current) {
        console.log('🔄 Address cleared, clearing assets...');
        setUserNFTs([]);
        lastFetchedAddressRef.current = null;
      }
      setNftsLoading(false);
      return;
    }

    // Additional validation - ensure address is a valid Ethereum address
    if (!address.startsWith('0x') || address.length !== 42) {
      console.log('⚠️ Invalid address format:', address);
      // Only clear if we had a previous valid address
      if (lastFetchedAddressRef.current) {
        console.log('🔄 Invalid address, clearing assets...');
        setUserNFTs([]);
        lastFetchedAddressRef.current = null;
      }
      setNftsLoading(false);
      return;
    }

    // Check if address changed - only refetch if address actually changed
    const normalizedAddress = address.toLowerCase();
    const lastAddress = lastFetchedAddressRef.current?.toLowerCase();
    
    let isCancelled = false;

    // Step 1: ALWAYS try to load cached assets first (ensures consistency)
    const loadCachedAssets = async () => {
      try {
        console.log('📦 Attempting to load cached assets for instant display...');
        console.log('📦 Current userNFTs count before cache load:', userNFTs.length);
        const cachedAssets = await assetCacheService.getCachedAssets(address);
        if (cachedAssets && cachedAssets.length > 0) {
          console.log(`⚡ Found ${cachedAssets.length} cached assets in storage`);
          console.log(`📦 Cache has ${cachedAssets.length} assets, current state has ${userNFTs.length}`);
          
          // CRITICAL: If cache has less than 5 assets, we need to fetch to find missing ones
          if (cachedAssets.length < 5) {
            console.warn(`⚠️ Cache only has ${cachedAssets.length} assets, but should have 5. Will fetch to find missing assets.`);
            // Still load what we have for instant display, but will fetch below
          }
          
          // Check if cached assets have imageURI - if not, they're stale
          const cachedAssetsWithImages = cachedAssets.filter((asset: any) => 
            asset.imageURI && asset.imageURI.trim() !== '' && asset.imageURI !== '❌ EMPTY'
          );
          const hasStaleCache = cachedAssets.length > 0 && cachedAssetsWithImages.length === 0;
          
          if (hasStaleCache) {
            console.warn(`⚠️ Cached assets have no imageURI - cache is stale!`);
            console.warn(`⚠️ Cached assets: ${cachedAssets.length}, Assets with imageURI: ${cachedAssetsWithImages.length}`);
            console.warn(`⚠️ Clearing stale cache and forcing fresh fetch...`);
            // Clear stale cache
            await assetCacheService.clearCache(address);
            // Don't use stale cache - force fresh fetch
            return false;
          }
          
          // Always use cache if state is empty OR if counts don't match (inconsistency)
          if (userNFTs.length === 0) {
            console.log(`📦 State is empty, loading ${cachedAssets.length} assets from cache`);
            setUserNFTs(cachedAssets);
            lastFetchedAddressRef.current = address;
            return cachedAssets.length < 5 ? false : true; // Return false if incomplete to force fetch
          } else if (cachedAssets.length !== userNFTs.length) {
            console.log(`📦 Inconsistency detected: cache has ${cachedAssets.length}, state has ${userNFTs.length}. Using cache.`);
            setUserNFTs(cachedAssets);
            lastFetchedAddressRef.current = address;
            return cachedAssets.length < 5 ? false : true; // Return false if incomplete to force fetch
          } else {
            console.log(`📦 Cache matches state (${cachedAssets.length} assets), keeping current state`);
            // If we have less than 5, we still need to fetch
            if (cachedAssets.length < 5) {
              console.warn(`⚠️ Only ${cachedAssets.length} assets in cache/state, need to fetch to find all 5`);
              return false; // Force fetch
            }
            return true; // Cache exists and matches, and has correct count
          }
        } else {
          console.log('📦 No cached assets found');
          return false; // No cache available
        }
      } catch (error: any) {
        console.warn('⚠️ Failed to load cached assets (non-critical):', error.message);
        return false;
      }
    };

    const fetchBlockchainAssets = async (retryCount = 0, forceRefreshParam = false) => {
      if (isCancelled) return;
      
      // Always fetch fresh data from database + blockchain
      // Cache is not relied upon - it's optional optimization only
      // This ensures system works even when cache is cleared, in incognito mode, etc.
      // We use hybrid service which handles database + blockchain efficiently
      
      // Add a small delay on retry to allow blockchain to sync
      if (retryCount > 0) {
        console.log(`⏳ Retrying asset fetch (attempt ${retryCount + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
      }
      setNftsLoading(true);
      // Don't clear assets unless it's a force refresh or address changed
      // This prevents flickering/flashing of assets during re-renders
      if (forceRefreshParam) {
        console.log('🔄 Force refresh: fetching from blockchain...');
        // Only clear on force refresh if we want to show loading state
        // setUserNFTs([]); // Commented out to prevent flickering
      } else {
        // Don't clear assets - keep existing ones visible while fetching
        console.log('🔄 Fetching assets (keeping existing assets visible)...');
      }
      console.log('🔗 Fetching assets from Mantle blockchain for address:', address);
      
      try {
        // Import mantleContractService dynamically
        const { mantleContractService } = await import('../services/mantleContractService');
        
        // Import ethers for address normalization
        const { ethers } = await import('ethers');
        
        // Always initialize provider (create if not available)
        let currentProvider = provider;
        if (!currentProvider) {
          const rpcUrl = import.meta.env.VITE_MANTLE_TESTNET_RPC_URL || 'https://rpc.sepolia.mantle.xyz';
          currentProvider = new ethers.JsonRpcProvider(rpcUrl);
          console.log('⚠️ Created new provider for asset fetching');
        }
        
        // Initialize with null signer and provider for read-only access
        mantleContractService.initialize(null as any, currentProvider);
        
        console.log('🔍 Address being used:', address);
        console.log('🔍 Address type:', typeof address);
        console.log('🔍 Address normalized:', address ? ethers.getAddress(address) : 'N/A');
        console.log('💡 Note: Assets are queried by connected wallet address. Make sure you\'re connected with the wallet that created the assets.');
        
        // Use ROBUST asset service: Multiple strategies with validation and reconciliation
        // This ensures ALL assets are found accurately and consistently
        console.log('🔍 Using ROBUST asset service (multiple strategies + validation + reconciliation)...');
        console.log('🔍 Strategies: getUserAssets + Events + Database + Validation');
        console.log('🔍 Features: Deduplication, Validation, Persistent Caching, Background Refresh');
        
        const robustResult = await robustAssetService.getUserAssets(address, {
          useCache: !forceRefresh, // Use cache if not forcing refresh
          forceRefresh: !!forceRefresh,
          validateCount: true // Ensure we find ALL assets (should find 5)
        });
        
        console.log(`✅ Robust service returned ${robustResult.assets.length} assets (source: ${robustResult.source})`);
        console.log(`📊 Result details:`, {
          assetCount: robustResult.assets.length,
          source: robustResult.source,
          cached: robustResult.cached,
          strategies: robustResult.foundViaStrategies,
          firstAsset: robustResult.assets[0] ? {
            assetId: robustResult.assets[0].assetId,
            name: robustResult.assets[0].name
          } : null
        });
        console.log(`📊 Strategy breakdown:`, robustResult.foundViaStrategies);
        
        const allAssets = robustResult.assets;
        console.log(`🔗 Total unique assets found: ${allAssets.length}`);
        
        // Log if we're missing assets (should be 5 based on blockchain query)
        if (allAssets.length < 5) {
          console.warn(`⚠️ Found ${allAssets.length} assets, but blockchain shows 5. Some assets may be missing.`);
        } else if (allAssets.length === 5) {
          console.log(`✅ Perfect! Found all 5 assets as expected.`);
        }
        
        if (allAssets.length === 0) {
          console.warn('⚠️ No assets found. Possible reasons:');
          console.warn('   1. Assets not synced to database yet');
          console.warn('   2. Blockchain event queries failed (check RPC)');
          console.warn('   3. Assets created with different address');
          console.warn('   4. Network mismatch');
        }
        
        // Transform to match expected format and normalize image URLs
        const blockchainNFTs = allAssets.map((asset: any) => {
          console.log(`🖼️ Processing asset for display:`, {
            assetId: asset.assetId,
            name: asset.name,
            rawImageURI: asset.imageURI,
            rawDisplayImage: asset.displayImage,
            rawImage: asset.image,
            metadataImage: asset.metadata?.image,
            metadataImageURI: asset.metadata?.imageURI
          });
          
          // Get image URI from multiple possible sources
          let imageURI = asset.imageURI || asset.displayImage || asset.image || asset.metadata?.image || asset.metadata?.imageURI || '';
          
          console.log(`🖼️ Found image URI:`, imageURI);
          
          // Normalize IPFS image URI using utility function
          if (imageURI) {
            const normalized = normalizeIPFSUrl(imageURI);
            if (normalized) {
              imageURI = normalized;
              console.log(`✅ Normalized image URI:`, imageURI);
            } else {
              console.warn(`⚠️ Failed to normalize image URI (might be test value):`, imageURI);
              imageURI = ''; // Clear invalid image URI
            }
          } else {
            console.warn(`⚠️ No image URI found for asset:`, asset.name || asset.assetId);
          }
          
          return {
            tokenId: asset.tokenId || asset.assetId || '0',
            assetId: asset.assetId || asset.tokenId,
            name: asset.name,
            description: asset.description,
            imageURI: imageURI,
            displayImage: imageURI, // Also set displayImage for compatibility
            documentURI: asset.documentURI || asset.metadata?.documentURI || '',
            owner: asset.owner,
            createdAt: asset.createdAt,
            status: asset.status,
            totalValue: asset.totalValue, // Include totalValue at top level
            location: asset.location,
            maturityDate: asset.maturityDate,
            assetType: asset.assetType,
            metadata: {
              ...(asset.metadata || {}),
              assetType: asset.assetType || asset.metadata?.assetType || 'RWA',
              type: 'rwa',
              category: 'RWA',
              name: asset.name,
              description: asset.description,
              image: imageURI,
              imageURI: imageURI,
              documentURI: asset.documentURI || asset.metadata?.documentURI || '',
              price: asset.totalValue,
              totalValue: asset.totalValue
            }
          };
        });
        
        console.log(`✅ Setting ${blockchainNFTs.length} assets to userNFTs state`);
        console.log('📦 First asset sample (full object):', blockchainNFTs[0] ? {
          assetId: blockchainNFTs[0].assetId,
          name: blockchainNFTs[0].name,
          imageURI: blockchainNFTs[0].imageURI,
          displayImage: blockchainNFTs[0].displayImage,
          image: blockchainNFTs[0].image,
          metadata: blockchainNFTs[0].metadata,
          totalValue: blockchainNFTs[0].totalValue,
          fullObject: blockchainNFTs[0] // Log full object for debugging
        } : 'No assets');
        
        // Log all assets' imageURIs
        console.log('🖼️ All assets imageURIs:', blockchainNFTs.map((a: any, idx: number) => ({
          index: idx,
          assetId: a.assetId,
          name: a.name,
          imageURI: a.imageURI,
          displayImage: a.displayImage,
          metadataImage: a.metadata?.image,
          metadataImageURI: a.metadata?.imageURI
        })));
        
        // Set assets in state FIRST for immediate display
        setUserNFTs(blockchainNFTs);
        
        // Update last fetched address to prevent unnecessary refetches
        lastFetchedAddressRef.current = address;
        console.log(`✅ Updated last fetched address: ${address}`);
        console.log(`✅ Set ${blockchainNFTs.length} assets in state`);
        
        // ALWAYS cache assets after successful fetch for persistence across refreshes
        // This ensures assets persist even after page refresh
        if (blockchainNFTs.length > 0) {
          try {
            console.log('💾 Caching assets for persistence across page refreshes...');
            await assetCacheService.cacheAssets(address, blockchainNFTs);
            console.log(`✅ Cached ${blockchainNFTs.length} assets for address ${address} (persistent across refreshes)`);
          } catch (cacheError: any) {
            console.warn('⚠️ Failed to cache assets (may affect persistence after refresh):', cacheError.message);
          }
        }
        
        // Clear old non-blockchain storage (keep cache service data)
        const sessionKeys = Object.keys(sessionStorage).filter(key => key.startsWith('asset_'));
        sessionKeys.forEach(key => sessionStorage.removeItem(key));
        localStorage.removeItem('assetReferences');
        
      } catch (error: any) {
        console.error('❌ Error fetching blockchain assets from Mantle:', error);
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          data: error.data,
          stack: error.stack
        });
        
        // Retry up to 3 times for network errors
        if (retryCount < 3 && (error.message?.includes('network') || error.message?.includes('fetch') || error.code === 'NETWORK_ERROR')) {
          console.log(`🔄 Retrying due to network error (attempt ${retryCount + 1}/3)...`);
          return fetchBlockchainAssets(retryCount + 1, forceRefreshParam);
        }
        
        // Only clear assets on error if this was the first fetch for this address
        // Don't clear if we already have assets (might be transient error)
        if (lastFetchedAddressRef.current !== address) {
          setUserNFTs([]);
          lastFetchedAddressRef.current = null;
        }
      } finally {
        if (!isCancelled) {
          setNftsLoading(false);
        }
      }
    };

    // Load cached assets first (instant display on page refresh), then fetch fresh data
    (async () => {
      const hasCache = await loadCachedAssets();
      
      console.log('✅ Address validated, starting asset fetch decision...');
      console.log('✅ Address:', address);
      console.log('✅ Last fetched address:', lastFetchedAddressRef.current);
      console.log('✅ Address changed:', normalizedAddress !== lastAddress);
      console.log('✅ Force refresh:', forceRefresh);
      console.log('✅ Cached assets loaded:', hasCache);
      console.log('✅ Current userNFTs count:', userNFTs.length);
      
      // Decision logic:
      // 1. If address unchanged AND we have 5 assets AND not force refresh: skip fetch
      // 2. If we have less than 5 assets: ALWAYS fetch to find missing ones
      // 3. If cache loaded assets: still fetch fresh data in background
      // 4. If no cache and no assets: fetch immediately
      
      // Check if current assets have imageURI - if not, force refresh
      const currentAssetsWithImages = userNFTs.filter((asset: any) => 
        asset.imageURI && asset.imageURI.trim() !== '' && asset.imageURI !== '❌ EMPTY'
      );
      const needsImageRefresh = userNFTs.length > 0 && currentAssetsWithImages.length === 0;
      
      const hasCorrectCount = userNFTs.length === 5;
      const hasImages = currentAssetsWithImages.length > 0;
      const shouldSkipFetch = normalizedAddress === lastAddress && !forceRefresh && hasCorrectCount && hasImages && !needsImageRefresh;
      
      if (shouldSkipFetch) {
        console.log('✅ Address unchanged and all 5 assets already loaded with images, skipping fetch');
        console.log(`   Current assets: ${userNFTs.length}, Address: ${address}`);
        console.log(`   Assets with images: ${currentAssetsWithImages.length}`);
        console.log(`   Last fetched address: ${lastFetchedAddressRef.current}`);
        return;
      }
      
      if (needsImageRefresh) {
        console.log(`🔄 Current assets (${userNFTs.length}) have no imageURI - forcing refresh to fetch images`);
        setForceRefresh(true);
        // Immediately trigger fetch with force refresh
        if (!isCancelled) {
          console.log('🔄 IMMEDIATELY fetching fresh data to get imageURI...');
          fetchBlockchainAssets(0, true);
          return; // Exit early to prevent double fetch
        }
      }
      
      // CRITICAL: Always fetch if we have less than 5 assets
      if (userNFTs.length < 5) {
        console.warn(`⚠️ Only ${userNFTs.length} assets found, but should have 5. Fetching to find missing assets...`);
        console.log(`🔄 Current count: ${userNFTs.length}, Expected: 5`);
        // Force fetch even if address unchanged
        if (!isCancelled) {
          console.log('🔄 Fetching fresh data from blockchain using ROBUST service (forced due to missing assets)...');
          fetchBlockchainAssets(0, true); // Force refresh to find all 5 assets
        }
      } else if (!isCancelled) {
        // Normal fetch if we have 5 assets but address changed or force refresh
        const shouldFetch = normalizedAddress !== lastAddress || forceRefresh || needsImageRefresh;
        if (shouldFetch) {
          console.log('🔄 Fetching fresh data from blockchain using ROBUST service...');
          console.log(`🔄 Fetch reason: addressChanged=${normalizedAddress !== lastAddress}, forceRefresh=${forceRefresh}, needsImageRefresh=${needsImageRefresh}`);
          fetchBlockchainAssets(0, !!forceRefresh || needsImageRefresh);
        } else {
          console.log('⏭️ Skipping fetch - address unchanged, no force refresh, and assets have images');
        }
      }
    })();
    
    // Cleanup function
    return () => {
      isCancelled = true;
      console.log('🧹 Profile useEffect cleanup: cancelling ongoing asset fetch');
    };
  }, [address, forceRefresh, isConnected]); // Removed provider to prevent unnecessary re-runs

  // RWA assets from API disabled - assets must come from blockchain only
  useEffect(() => {
    console.log('🔗 RWA API fetching disabled - assets must come from blockchain only');
    setRwaAssets([]);
    setIsLoadingRWA(false);
  }, [address, isConnected]);

  // OLD FUNCTION - NO LONGER USED (replaced by fetchUserAssetsProgressive above)
  // Fetch Hedera digital assets - DIRECTLY from Mirror Node (no localStorage)
  /*
  const fetchHederaAssets_OLD = async () => {
    if (!address) {
      console.log('⚠️ Cannot fetch assets - no address provided');
      return;
    }
    
    setHederaAssetsLoading(true);
    try {
      console.log('🔍 Fetching NFTs from Hedera Mirror Node for user:', address);
      console.log('🔗 Mirror Node URL:', `https://testnet.mirrornode.hedera.com/api/v1/accounts/${address}/nfts?limit=100`);
      
      // Query Mirror Node for user's NFTs
      const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${address}/nfts?limit=100`);
      
      if (!response.ok) {
        throw new Error(`Mirror Node returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log(`📦 Found ${data.nfts?.length || 0} NFTs for user ${address}`);
      console.log('📋 Raw NFT data:', data.nfts);
      
      // Parse NFT metadata
      const nftPromises = (data.nfts || []).map(async (nft: any) => {
        try {
          const tokenId = nft.token_id;
          const serialNumber = nft.serial_number;
          
          let metadata: any = {};
          let metadataString = '';
          let imageUrl = '';
          
          if (nft.metadata) {
            metadataString = atob(nft.metadata);
            
            try {
              metadata = JSON.parse(metadataString);
              imageUrl = metadata.image || metadata.imageURI || metadata.imageUrl || '';
            } catch {
              // Check if it's an IPFS CID
              if (metadataString.startsWith('baf') && !metadataString.includes('/')) {
                const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${metadataString}`;
                try {
                  const metadataResponse = await fetch(ipfsUrl);
                  if (metadataResponse.ok) {
                    metadata = await metadataResponse.json();
                    imageUrl = metadata.image || metadata.imageURI || metadata.imageUrl || '';
                  }
                } catch (e) {
                  console.warn(`Failed to fetch metadata from IPFS:`, e);
                }
              } else if (metadataString.startsWith('http')) {
                imageUrl = metadataString;
              }
            }
          }
          
          if (!imageUrl) {
            imageUrl = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="%231a1a1a"/><text x="50%" y="50%" font-family="Arial" font-size="24" fill="%2300ff88" text-anchor="middle" dy=".3em">${encodeURIComponent(metadata.name || 'NFT')}</text></svg>`;
          }
          
          return {
            id: `${tokenId}-${serialNumber}`,
            tokenId,
            serialNumber,
            name: metadata.name || metadata.assetName || `NFT #${serialNumber}`,
            description: metadata.description || '',
            imageURI: imageUrl,
            totalValue: metadata.price || metadata.totalValue || '100',
            value: parseFloat(metadata.price || metadata.totalValue || '100'),
            price: metadata.price || metadata.totalValue || '100',
            owner: address,
            createdAt: nft.created_timestamp || new Date().toISOString(),
            isTradeable: true,
            status: 'owned',
            category: metadata.category || 'RWA',
            type: 'rwa'
          };
        } catch (error) {
          console.warn(`Failed to process NFT:`, error);
          return null;
        }
      });
      
      const assets = (await Promise.all(nftPromises)).filter(Boolean);
      setHederaAssets(assets);
      console.log('✅ Fetched and parsed', assets.length, 'NFTs from Hedera');
    } catch (error) {
      console.error('❌ Error fetching Hedera assets:', error);
    } finally {
      setHederaAssetsLoading(false);
    }
  };
  */

  // Force refresh assets directly from HFS (bypass Mirror Node)
  /*
  const forceRefreshHederaAssets = async () => {
    if (!address) return;
    
    setHederaAssetsLoading(true);
    try {
      console.log('🔄 Force refreshing Hedera assets directly from HFS...');
      
      // Debug: Check Hedera client status
      console.log('🔍 Hedera client status for force refresh:', {
        hasClient: !!hederaClient,
        hasOperator: !!hederaClient?.operatorAccountId,
        operatorAccountId: hederaClient?.operatorAccountId?.toString()
      });
      
      if (!hederaClient || !hederaClient.operatorAccountId) {
        console.error('❌ No valid Hedera client with operator available for HFS queries');
        toast({
          title: 'Wallet Not Connected',
          description: 'Please ensure your HashPack wallet is properly connected.',
          variant: 'destructive'
        });
        return;
      }
      
      // Get asset references from localStorage
      const assetReferences = JSON.parse(localStorage.getItem('assetReferences') || '[]');
      const userReferences = assetReferences.filter((ref: any) => ref.owner === address);
      
      console.log(`📊 Found ${userReferences.length} asset references for force refresh`);
      
      const refreshedAssets: any[] = [];
      
      for (const ref of userReferences) {
        try {
          console.log(`🔄 Force fetching metadata for asset ${ref.tokenId} from file ${ref.fileId}...`);
          const assetData = await hederaAssetService.getAssetDataDirectly(ref.tokenId, ref.fileId, hederaClient);
          
          if (assetData) {
            refreshedAssets.push(assetData);
            console.log(`✅ Force refreshed asset: ${assetData.name} with image: ${assetData.imageURI}`);
          } else {
            console.warn(`⚠️ Could not force fetch asset data for ${ref.tokenId}`);
          }
        } catch (error) {
          console.error(`❌ Error force fetching asset ${ref.tokenId}:`, error);
        }
      }
      
      setHederaAssets(refreshedAssets);
      console.log(`✅ Force refreshed ${refreshedAssets.length} assets from HFS`);
      
      toast({
        title: 'Assets Refreshed',
        description: `Successfully refreshed ${refreshedAssets.length} assets directly from HFS`,
        variant: 'default'
      });
    } catch (error) {
      console.error('❌ Error force refreshing Hedera assets:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh assets from HFS',
        variant: 'destructive'
      });
    } finally {
      setHederaAssetsLoading(false);
    }
  };
  */

  // NOTE: Assets are now loaded by fetchUserAssetsProgressive above
  // which handles both owned and listed assets from Mantle blockchain

  // Refresh assets when component mounts (e.g., returning from CreateDigitalAsset)
  useEffect(() => {
    if (address) {
      console.log('🔄 Profile mounted, refreshing assets...');
      console.log('🔄 Address on mount:', address);
      setForceRefresh(true);
      // Reset force refresh after a short delay
      setTimeout(() => setForceRefresh(false), 1000);
    } else {
      console.log('🔄 Profile mounted but no address yet');
    }
  }, [address]); // Include address in dependencies
  
  // Calculate user stats from real data
  const userStats = useMemo(() => {
    // Debug: Log all sessionStorage keys
    console.log('🔍 All sessionStorage keys:', Object.keys(sessionStorage));
    console.log('🔍 userStats calculation - nftsLoading:', nftsLoading);
    console.log('🔍 Current wallet address:', address);
    
    // Show progressive loading - update stats as NFTs load
    
    // Assets must come from blockchain only - no sessionStorage or localStorage
    const realAssets: any[] = [];
    const localStorageAssets: any[] = [];
    
    console.log('🔗 Assets from blockchain only - ignoring sessionStorage/localStorage');

    // Assets must come from blockchain only
    // Combine only blockchain assets (userNFTs), ignore all other sources
    const allAssets: any[] = [];
    
    // Only add assets from blockchain (userNFTs)
    // Disabled: realAssets (sessionStorage), localStorageAssets, rwaAssets (API), hederaAssets
    // All non-blockchain sources are ignored
    
    // Also check for any assets with "Rigid" in the name (recently purchased)
    const rigidAssets = allAssets.filter(asset => 
      asset.name && asset.name.toLowerCase().includes('rigid')
    );
    if (rigidAssets.length > 0) {
      console.log('🎨 Found Rigid assets:', rigidAssets);
    }

    console.log('🔍 All assets combined:', allAssets);
    console.log('🔍 Total assets count:', allAssets.length);
    console.log('🔍 NFTs loading state:', nftsLoading);

    if (allAssets.length > 0) {
      console.log('🔍 userStats - Processing allAssets:', allAssets.length, 'items');
      const totalValue = allAssets.reduce((sum, asset) => {
        const value = parseFloat(asset.totalValue) || 0;
        console.log('🔍 Adding asset value:', value, 'from asset:', asset.name, '(source:', asset.source || 'sessionStorage', ')');
        return sum + value;
      }, 0);

      console.log('🔍 Total portfolio value calculated:', totalValue);

      // Format large numbers with K/M suffixes
      const formatValue = (value: number) => {
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M TRUST`;
        } else if (value >= 1000) {
          return `${(value / 1000).toFixed(0)}K TRUST`;
        } else {
          return `${value.toFixed(2)} TRUST`;
        }
      };


      return {
        portfolioValue: formatValue(totalValue),
        usdValue: usdValue, // Use calculated USD value
        assetsCount: allAssets.length,
        createdCount: allAssets.length,
        collectionsCount: 0
      };
    }

    // Fallback: Use hardcoded data for your specific asset
    console.log('🔍 No sessionStorage data found, using fallback data');
    console.log('🔍 NFTs loading state in fallback:', nftsLoading);
    console.log('🔍 User NFTs length in fallback:', userNFTs.length);
    
    // If NFTs are still loading, show loading state
    if (nftsLoading) {
      return {
        portfolioValue: 'Loading...',
        usdValue: usdValue,
    assetsCount: 0,
    createdCount: 0,
    collectionsCount: 0
      };
    }
    
    // If we have NFTs but no sessionStorage data, use NFT data
    if (userNFTs.length > 0) {
      return {
        portfolioValue: `${userNFTs.length * 1000} TRUST`,
        usdValue: usdValue,
        assetsCount: userNFTs.length,
        createdCount: userNFTs.length,
        collectionsCount: 0
      };
    }
    
    // No assets found - return zeros instead of mock data
    return {
      portfolioValue: '0 TRUST',
      usdValue: usdValue,
      assetsCount: 0,
      createdCount: 0,
      collectionsCount: 0
    };
  }, [portfolioData, portfolioLoading, userAssetsData, userNFTs, nftsLoading, address, rwaAssets, usdValue]);

  // Refresh handler
  const handleRefresh = async () => {
    console.log('🔄 ========== MANUAL REFRESH TRIGGERED ==========');
    console.log('🔍 Current address:', address);
    console.log('🔍 Current userNFTs count:', userNFTs.length);
    console.log('🔍 isConnected:', isConnected);
    
    if (!address) {
      console.warn('🔄 Cannot refresh - no address available');
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to refresh assets',
        variant: 'destructive'
      });
      return;
    }
    
    // Manually trigger asset fetch with detailed logging
    try {
      console.log('🔄 Step 1: Importing services...');
      const { mantleContractService } = await import('../services/mantleContractService');
      const { ethers } = await import('ethers');
      console.log('✅ Services imported');
      
      console.log('🔄 Step 2: Creating provider...');
      const rpcUrl = import.meta.env.VITE_MANTLE_TESTNET_RPC_URL || 'https://rpc.sepolia.mantle.xyz';
      console.log('🔍 RPC URL:', rpcUrl);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      console.log('✅ Provider created');
      
      console.log('🔄 Step 3: Initializing service...');
      mantleContractService.initialize(null as any, provider);
      console.log('✅ Service initialized');
      
      console.log('🔄 Step 4: Fetching assets from factory...');
      console.log('🔍 Address being used:', address);
      setNftsLoading(true);
      
      const assets = await mantleContractService.getUserAssetsFromFactory(address);
      console.log('🔄 ========== FETCH COMPLETE ==========');
      console.log('📦 Assets found:', assets.length);
      console.log('📦 Assets data:', JSON.stringify(assets, null, 2));
      
      if (assets.length > 0) {
        console.log('🔄 Step 5: Formatting assets...');
        const formattedAssets = assets.map((asset: any) => ({
          tokenId: asset.tokenId || asset.assetId || '0',
          assetId: asset.assetId || asset.tokenId,
          name: asset.name,
          description: asset.description,
          imageURI: asset.imageURI,
          owner: asset.owner,
          createdAt: asset.createdAt,
          status: asset.status,
          totalValue: asset.totalValue,
          metadata: asset.metadata || {
            assetType: asset.assetType || 'RWA',
            type: 'rwa',
            category: 'RWA',
            name: asset.name,
            description: asset.description,
            image: asset.imageURI,
            price: asset.totalValue,
            totalValue: asset.totalValue
          }
        }));
        console.log('✅ Formatted assets:', formattedAssets.length);
        console.log('📦 First asset:', formattedAssets[0]);
        setUserNFTs(formattedAssets);
        console.log('✅ Assets set in state');
        toast({
          title: 'Assets Refreshed',
          description: `Found ${formattedAssets.length} assets`,
          variant: 'default'
        });
      } else {
        console.warn('⚠️ No assets found for address:', address);
        setUserNFTs([]);
        toast({
          title: 'No Assets Found',
          description: 'No assets found for this wallet address',
          variant: 'default'
        });
      }
      setNftsLoading(false);
    } catch (error: any) {
      console.error('🔄 ========== FETCH ERROR ==========');
      console.error('❌ Error type:', error.constructor.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error:', error);
      setNftsLoading(false);
      toast({
        title: 'Refresh Failed',
        description: error.message || 'Failed to fetch assets',
        variant: 'destructive'
      });
    }
    
    setForceRefresh(prev => !prev);
    toast({
      title: 'Refreshing Assets',
      description: 'Fetching latest assets from Mantle blockchain...',
      variant: 'default'
    });
  };

  // Asset filtering function
  const getFilteredAssets = (assets: any[]) => {
    console.log('🔍 getFilteredAssets called with:', {
      assetsCount: assets.length,
      filters: {
        searchQuery,
        statusFilter,
        assetTypeFilter,
        collectionFilter
      },
      firstAsset: assets[0] ? {
        id: assets[0].id,
        name: assets[0].name,
        type: assets[0].type,
        status: assets[0].status,
        category: assets[0].category
      } : null
    });
    
    const filtered = assets.filter(asset => {
      // Search filter
      if (searchQuery && !asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !asset.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        console.log('❌ Asset filtered by search:', asset.name);
        return false;
      }
      
      // Status filter - handle both numeric and string statuses
      if (statusFilter !== 'all') {
        const assetStatus = typeof asset.status === 'number' ? asset.status : 
                           (typeof asset.status === 'string' ? asset.status.toLowerCase() : '');
        
        if (statusFilter === 'listed') {
          // Numeric statuses: 5=ACTIVE, 6=ACTIVE_AMC_MANAGED, 7=DIGITAL_ACTIVE are considered "active/listed"
          if (typeof asset.status === 'number') {
            if (![5, 6, 7].includes(asset.status)) {
              console.log('❌ Asset filtered by status (listed):', asset.name, 'status:', asset.status);
              return false;
            }
          } else if (assetStatus !== 'listed' && assetStatus !== 'for sale') {
            console.log('❌ Asset filtered by status (listed):', asset.name, 'status:', assetStatus);
            return false;
          }
        } else if (statusFilter === 'not_listed') {
          // Numeric statuses that are NOT active
          if (typeof asset.status === 'number') {
            if ([5, 6, 7].includes(asset.status)) {
              console.log('❌ Asset filtered by status (not_listed):', asset.name, 'status:', asset.status);
              return false;
            }
          } else if (assetStatus === 'listed' || assetStatus === 'for sale') {
            console.log('❌ Asset filtered by status (not_listed):', asset.name, 'status:', assetStatus);
            return false;
          }
        } else if (statusFilter === 'hidden' && assetStatus !== 'hidden') {
          console.log('❌ Asset filtered by status (hidden):', asset.name, 'status:', assetStatus);
          return false;
        }
      }
      
      // Asset type filter
      if (assetTypeFilter !== 'all') {
        const assetType = (asset.type || asset.assetType || '').toLowerCase();
        if (assetTypeFilter === 'rwa' && assetType !== 'rwa') {
          console.log('❌ Asset filtered by type:', asset.name, 'type:', asset.type, 'expected: rwa');
          return false;
        }
      }
      
      // Collection filter
      if (collectionFilter !== 'all') {
        if (asset.category !== collectionFilter) {
          console.log('❌ Asset filtered by collection:', asset.name, 'category:', asset.category);
          return false;
        }
      }
      
      console.log('✅ Asset passed all filters:', asset.name);
      return true;
    });
    
    console.log('🔍 getFilteredAssets Result:', {
      inputAssets: assets.length,
      filteredAssets: filtered.length,
      filters: {
        assetTypeFilter,
        statusFilter,
        collectionFilter,
        searchQuery
      },
      filteredAssetNames: filtered.map(a => a.name)
    });
    
    return filtered;
  };

  // Set asset type filter based on active tab
  useEffect(() => {
    if (activeTab === 'rwa-assets') {
      setAssetTypeFilter('rwa');
    } else {
      setAssetTypeFilter('all');
    }
  }, [activeTab]);

  // Get user assets from blockchain only
  const userAssets = useMemo(() => {
    console.log('🔍 userAssets useMemo triggered:', {
      userNFTsLength: userNFTs.length,
      userNFTs: userNFTs,
      timestamp: new Date().toISOString()
    });
    // Only assets from blockchain (smart contracts)
    const allAssets: any[] = [];
    
    console.log('🔍 Processing userNFTs for display:', userNFTs.length, 'assets');
    
    // Add NFTs from blockchain (smart contracts) only
    userNFTs.forEach(nft => {
      console.log('🔍 Processing NFT:', {
        tokenId: nft.tokenId,
        name: nft.name,
        assetType: nft.metadata?.assetType,
        type: nft.metadata?.type,
        category: nft.metadata?.category,
        assetTypeString: nft.assetType,
        imageURI: nft.imageURI,
        displayImage: nft.displayImage,
        image: nft.image,
        metadataImage: nft.metadata?.image,
        metadataImageURI: nft.metadata?.imageURI,
        fullNFT: nft // Log full object for debugging
      });
      
      // Include all assets from blockchain (RWA or otherwise)
      // Check multiple possible fields for asset type
      const isRWA = nft.metadata?.assetType === 'RWA' || 
                    nft.metadata?.type === 'rwa' || 
                    nft.metadata?.category === 'RWA' ||
                    nft.assetType === 'RWA' ||
                    nft.assetType?.includes('REAL_ESTATE') ||
                    nft.assetType?.includes('COMMODITY') ||
                    nft.assetType?.includes('AGRICULTURAL') ||
                    nft.assetType?.includes('INFRASTRUCTURE') ||
                    nft.assetType?.includes('BUSINESS') ||
                    nft.status !== undefined; // If it has a status, it's likely an RWA asset
      
      // Include all assets from blockchain (they're all RWAs from our factory)
      // Parse totalValue to number for display
      const totalValueStr = nft.totalValue || nft.metadata?.totalValue || nft.metadata?.price || '0';
      const totalValueNum = parseFloat(totalValueStr) || 0;
      
      // Get image URI from multiple sources and normalize it
      console.log(`🖼️ Profile.tsx - Processing NFT: ${nft.name || nft.assetId || nft.tokenId}`, {
        'nft.imageURI': nft.imageURI || '❌ EMPTY',
        'nft.displayImage': nft.displayImage || '❌ EMPTY',
        'nft.image': nft.image || '❌ EMPTY',
        'nft.metadata?.image': nft.metadata?.image || '❌ EMPTY',
        'nft.metadata?.imageURI': nft.metadata?.imageURI || '❌ EMPTY',
        'Full NFT object keys': Object.keys(nft)
      });
      
      let imageURI = nft.imageURI || nft.displayImage || nft.image || nft.metadata?.image || nft.metadata?.imageURI || '';
      
      console.log(`🖼️ Profile.tsx - Extracted imageURI for ${nft.name || nft.assetId}:`, imageURI || '❌ EMPTY');
      
      if (imageURI) {
        const normalized = normalizeIPFSUrl(imageURI);
        if (normalized) {
          imageURI = normalized;
          console.log(`✅ Asset ${nft.name || nft.tokenId} - Normalized image URI:`, imageURI);
        } else {
          console.warn(`⚠️ Failed to normalize image URI for ${nft.name || nft.tokenId} (might be test value):`, imageURI);
          imageURI = ''; // Clear invalid image URI
        }
      } else {
        console.warn(`⚠️ No image URI found for asset:`, nft.name || nft.tokenId);
      }
      
      console.log(`🖼️ Profile.tsx - Final imageURI for ${nft.name || nft.assetId}:`, imageURI || '❌ EMPTY');
      
      const processedAsset = {
        id: nft.tokenId || nft.assetId || `asset-${Date.now()}`,
        name: nft.name || nft.metadata?.name || `Asset #${nft.tokenId || 'Unknown'}`,
        description: nft.description || nft.metadata?.description || 'RWA asset',
        imageURI: imageURI,
        displayImage: imageURI, // Also set displayImage for compatibility
        image: imageURI, // Also set image for compatibility
        totalValue: totalValueStr,
        value: totalValueNum, // This is what the display uses
        price: totalValueStr,
        owner: nft.owner || address,
        createdAt: nft.createdAt || new Date().toISOString(),
        isTradeable: true,
        status: nft.status !== undefined ? nft.status : 'owned',
        tokenId: nft.tokenId || nft.assetId,
        assetId: nft.assetId || nft.tokenId,
        source: 'blockchain', // Only blockchain source
        type: 'rwa',
        category: 'RWA',
        assetType: nft.assetType || nft.metadata?.assetType || 'RWA',
        location: nft.location || nft.metadata?.location || '',
        maturityDate: nft.maturityDate || nft.metadata?.maturityDate || null,
        metadata: {
          ...nft.metadata,
          image: imageURI,
          imageURI: imageURI,
          displayImage: imageURI
        }
      };
      
      console.log(`🖼️ Profile.tsx - Final processed asset for ${processedAsset.name}:`, {
        'imageURI': processedAsset.imageURI || '❌ EMPTY',
        'displayImage': processedAsset.displayImage || '❌ EMPTY',
        'image': processedAsset.image || '❌ EMPTY',
        'metadata.image': processedAsset.metadata?.image || '❌ EMPTY',
        'metadata.imageURI': processedAsset.metadata?.imageURI || '❌ EMPTY',
        'Has any image?': !!(processedAsset.imageURI || processedAsset.displayImage || processedAsset.image || processedAsset.metadata?.image)
      });
      
      allAssets.push(processedAsset);
    });

    console.log('🔗 Blockchain assets only:', allAssets.length, 'total assets');
    console.log('📦 userAssets computed:', {
      count: allAssets.length,
      sample: allAssets[0] ? {
        id: allAssets[0].id,
        name: allAssets[0].name,
        imageURI: allAssets[0].imageURI,
        status: allAssets[0].status,
        value: allAssets[0].value
      } : null
    });
    return allAssets;
  }, [userNFTs, address]);

  // Helper function to calculate time ago - MUST be defined before recentActivity
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Get real recent activity from user's assets and transactions
  const recentActivity = useMemo(() => {
    const activities: any[] = [];
    
    console.log('🔍 Recent Activity - userNFTs:', userNFTs);
    console.log('🔍 Recent Activity - userNFTs length:', userNFTs?.length);
    
    // Add activities from user's NFTs
    if (userNFTs && userNFTs.length > 0) {
      userNFTs.forEach((nft: any) => {
        // Try multiple sources for timestamp
        const timestamp = nft.createdAt || 
                         nft.metadata?.createdAt || 
                         nft.created_timestamp ||
                         nft.modified_timestamp;
        
        if (timestamp) {
          const createdDate = new Date(timestamp);
          const timeAgo = getTimeAgo(createdDate);
          
          activities.push({
          action: 'Asset Created',
            asset: nft.name || nft.metadata?.name || `NFT #${nft.serialNumber || nft.id}`,
            time: timeAgo,
            type: 'success',
            timestamp: createdDate.getTime()
          });
        } else {
          // If no timestamp, still show the asset with "Recently"
          activities.push({
            action: 'Asset Owned',
            asset: nft.name || nft.metadata?.name || `NFT #${nft.serialNumber || nft.id}`,
            time: 'Recently',
            type: 'success',
            timestamp: Date.now()
          });
        }
      });
    }
    
    // Sort by timestamp (most recent first) and limit to 5
    return activities
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 5);
  }, [userNFTs]);

  const tabs = [
    { id: 'portfolio', label: 'All Assets', icon: Wallet },
    { id: 'rwa-assets', label: 'Real Estate', icon: Building2 },
    { id: 'commodities', label: 'Commodities', icon: Globe },
    { id: 'intellectual', label: 'IP & Patents', icon: Shield },
    { id: 'created', label: 'My Creations', icon: Plus },
    { id: 'trading', label: 'Trading', icon: TrendingUp },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'favorites', label: 'Favorites', icon: Heart }
  ];

  const statusFilters = [
    { id: 'all', label: 'All' },
    { id: 'listed', label: 'Listed' },
    { id: 'not-listed', label: 'Not Listed' },
    { id: 'hidden', label: 'Hidden' }
  ];

  const chainOptions = [
    { id: 'all', label: 'All Chains' },
    { id: 'hedera', label: 'Hedera' },
    { id: 'ethereum', label: 'Ethereum' }
  ];

  const assetTypeFilters = [
    { id: 'all', label: 'All Assets' },
    { id: 'rwa', label: 'RWA' }
  ];

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast({
        title: 'Address Copied',
        description: 'Wallet address copied to clipboard',
        variant: 'default'
      });
    }
  };

  const handleCreateAsset = () => {
    if (user?.kycStatus?.toLowerCase() !== 'approved') {
      toast({
        title: 'KYC Required',
        description: 'You need to complete KYC verification to create RWA assets',
        variant: 'destructive'
      });
      return;
    }
    
    navigate('/dashboard/create-rwa-asset');
  };

  const handleStartKYC = async () => {
    try {
      await startKYC();
      toast({
        title: 'KYC Verification Started',
        description: 'A new tab has opened for KYC verification. Please complete the verification to create RWA assets.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error starting KYC:', error);
      toast({
        title: 'KYC Error',
        description: error instanceof Error ? error.message : 'Failed to start KYC verification. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleManualKYCApproval = async () => {
    try {
      console.log('🔧 Manually approving KYC for user:', user?.email);
      console.log('🔧 User ID:', user?._id);
      console.log('🔧 Current KYC status:', user?.kycStatus);
      
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/auth/kyc/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          inquiryId: user?.kycInquiryId || 'manual-approval',
          status: 'approved'
        })
      });

      console.log('🔧 Manual approval response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Manual KYC approval response:', result);
        
        toast({
          title: 'KYC Status Updated',
          description: 'Your KYC status has been manually updated to approved. Refreshing...',
          variant: 'default'
        });
        
        // Refresh user data to get updated status
        setTimeout(() => {
          refreshUser().catch(error => {
            console.error('Error refreshing after manual KYC approval:', error);
          });
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('❌ Manual KYC approval failed:', response.status, errorText);
        throw new Error(`Failed to update KYC status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error manually approving KYC:', error);
      toast({
        title: 'KYC Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update KYC status. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDirectKYCUpdate = async () => {
    try {
      console.log('🔧 Direct KYC update for user:', user?.email);
      
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/auth/update-kyc-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          userId: user?._id,
          kycStatus: 'approved'
        })
      });

      console.log('🔧 Direct update response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Direct KYC update response:', result);
        
        toast({
          title: 'KYC Status Updated Directly',
          description: 'Your KYC status has been directly updated to approved.',
          variant: 'default'
        });
        
        // Refresh user data to get updated status
        setTimeout(() => {
          refreshUser().catch(error => {
            console.error('Error refreshing after direct KYC update:', error);
          });
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('❌ Direct KYC update failed:', response.status, errorText);
        throw new Error(`Failed to update KYC status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error in direct KYC update:', error);
      toast({
        title: 'Direct KYC Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update KYC status directly.',
        variant: 'destructive'
      });
    }
  };

  const handleDebugKycInquiry = async () => {
    try {
      console.log('🔍 Debug KYC inquiry for user:', user?.email);
      console.log('🔍 User kycInquiryId from frontend:', user?.kycInquiryId);
      console.log('🔍 DidIt session ID from callback:', '52c76cad-0f4d-4776-bfff-a5d1009fa91c');
      
      // Show current state
      toast({
        title: 'KYC Inquiry Debug',
        description: `Frontend: ${user?.kycInquiryId || 'None'} | DidIt: 52c76cad-0f4d-4776-bfff-a5d1009fa91c`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error in debug:', error);
      toast({
        title: 'Debug Failed',
        description: error instanceof Error ? error.message : 'Failed to debug KYC inquiry.',
        variant: 'destructive'
      });
    }
  };

  const handleFixKycInquiry = async () => {
    try {
      console.log('🔧 Fixing KYC inquiry ID for user:', user?.email);
      
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/auth/update-kyc-inquiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          userId: user?._id,
          kycInquiryId: '52c76cad-0f4d-4776-bfff-a5d1009fa91c'
        })
      });

      console.log('🔧 Fix inquiry response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ KYC inquiry ID updated:', result);
        
        toast({
          title: 'KYC Inquiry ID Fixed',
          description: 'Your KYC inquiry ID has been updated to match DidIt session.',
          variant: 'default'
        });
        
        // Refresh user data
        setTimeout(() => {
          refreshUser().catch(error => {
            console.error('Error refreshing after inquiry fix:', error);
          });
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('❌ Fix inquiry failed:', response.status, errorText);
        throw new Error(`Fix inquiry failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fixing inquiry:', error);
      toast({
        title: 'Fix Inquiry Failed',
        description: error instanceof Error ? error.message : 'Failed to fix KYC inquiry ID.',
        variant: 'destructive'
      });
    }
  };

  const handleTestCallback = async () => {
    try {
      console.log('🧪 Testing DidIt callback...');
      console.log('🧪 User kycInquiryId:', user?.kycInquiryId);
      console.log('🧪 User object:', user);
      
      const apiUrl = import.meta.env.VITE_API_URL;
      const callbackUrl = `${apiUrl}/auth/didit/callback?verificationSessionId=${user?.kycInquiryId}&status=Approved`;
      
      console.log('🧪 Calling callback URL:', callbackUrl);
      
      const response = await fetch(callbackUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🧪 Callback response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('🧪 Callback response:', result);
        
        toast({
          title: 'Callback Test Successful',
          description: `KYC status updated to: ${result.kycStatus}`,
          variant: 'default'
        });
        
        // Refresh user data
        setTimeout(() => {
          refreshUser().catch(error => {
            console.error('Error refreshing after callback test:', error);
          });
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('❌ Callback test failed:', response.status, errorText);
        throw new Error(`Callback failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error testing callback:', error);
      toast({
        title: 'Callback Test Failed',
        description: error instanceof Error ? error.message : 'Failed to test callback.',
        variant: 'destructive'
      });
    }
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-black dark:text-white';
      case 'info': return 'text-black dark:text-white';
      case 'warning': return 'text-gray-600';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return CheckCircle;
      case 'info': return AlertCircle;
      case 'warning': return AlertCircle;
      case 'error': return AlertCircle;
      default: return Activity;
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <Card variant="default">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-10 h-10 text-gray-600" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-gray-600" />
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-lg font-semibold text-black">
                      {displayName}
                    </h1>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyAddress}
                      className="p-1 text-gray-600 hover:text-black"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 text-gray-600 hover:text-black"
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-gray-600 font-mono">
                      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                    </span>
                    {displayEmail && (
                      <span className="text-xs text-gray-500">
                        {displayEmail}
                      </span>
                    )}
                    <span className="text-xs bg-gray-100 text-black px-1.5 py-0.5 rounded-full">
                      {user?.emailVerificationStatus?.toLowerCase() === 'verified' ? 'Verified' : 'Unverified'}
                    </span>
                    {address && userNFTs.length === 0 && !nftsLoading && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full" title="No assets found for this wallet address. If you created assets with a different wallet, connect that wallet to see them.">
                        ⚠️ No Assets Found
                      </span>
                    )}
                  </div>

                  {/* Portfolio Stats */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4">
                      {/* Portfolio Value */}
                      <div className="space-y-2 min-w-0">
                        <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-400 light:text-light-text-secondary uppercase tracking-wide truncate">Portfolio</p>
                        <p className="text-base sm:text-lg lg:text-xl font-bold text-black dark:text-white truncate" title={userStats.portfolioValue}>
                        {portfolioLoading ? (
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        ) : (
                          userStats.portfolioValue
                        )}
                      </p>
                    </div>

                      {/* USD Value */}
                      <div className="space-y-2 min-w-0">
                        <p className="text-xs text-gray-600 uppercase tracking-wide truncate">USD Value</p>
                        <p className="text-lg font-medium text-black truncate" title={userStats.usdValue}>
                        {portfolioLoading ? (
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        ) : (
                          userStats.usdValue
                        )}
                      </p>
                    </div>

                      {/* Assets */}
                      <div className="space-y-2 min-w-0">
                        <p className="text-xs text-gray-600 uppercase tracking-wide truncate">Assets</p>
                        <p className="text-lg font-medium text-black truncate">
                        {assetsLoading ? (
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        ) : (
                          userStats.assetsCount
                        )}
                      </p>
                    </div>

                      {/* Created */}
                      <div className="space-y-2 min-w-0">
                        <p className="text-xs text-gray-600 uppercase tracking-wide truncate">Created</p>
                        <p className="text-lg font-medium text-black truncate">
                        {assetsLoading ? (
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        ) : (
                          userStats.createdCount
                        )}
                      </p>
                      </div>

                      {/* Royalties */}
                      <div className="space-y-2 min-w-0">
                        <p className="text-[10px] sm:text-xs text-purple-300 uppercase tracking-wide flex items-center gap-1">
                          <span>👑</span>
                          <span className="truncate">Royalties</span>
                        </p>
                        <p className="text-base sm:text-lg lg:text-xl font-bold text-purple-400 whitespace-nowrap overflow-hidden text-ellipsis">
                          0 TRUST
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Compact */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      console.log('🔍 Create RWA button clicked - User KYC status:', user?.kycStatus);
                      console.log('🔍 User object:', user);
                      if (user?.kycStatus?.toLowerCase() === 'approved') {
                        handleCreateAsset();
                      } else {
                        handleStartKYC();
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-medium ${
                      user?.kycStatus?.toLowerCase() === 'approved'
                        ? 'border-purple-400/30 text-purple-400 hover:bg-purple-400/10'
                        : 'border-gray-300 text-black hover:bg-gray-50'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 mr-1" />
                    Create RWA
                    {user?.kycStatus?.toLowerCase() !== 'approved' && (
                      <span className="ml-1 text-xs opacity-75">(KYC Required)</span>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-0.5 border-b border-gray-800">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-black dark:text-white border-b-2 border-black dark:border-white'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="mb-4">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            {/* Left Filters */}
            <div className="flex flex-wrap gap-2">
              {/* Status Filter */}
              <div className="flex gap-0.5">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setStatusFilter(filter.id)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      statusFilter === filter.id
                        ? 'bg-black text-white'
                        : 'bg-white text-gray-600 hover:text-black border border-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Asset Type Filter */}
              <div className="flex gap-0.5">
                {assetTypeFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setAssetTypeFilter(filter.id)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      assetTypeFilter === filter.id
                        ? 'bg-purple-400 text-black'
                        : 'bg-white text-gray-600 hover:text-black border border-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Chain Filter */}
              <select
                value={chainFilter}
                onChange={(e) => setChainFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded px-2 py-1 text-xs text-black focus:border-black focus:ring-black/20"
              >
                {chainOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Right Controls */}
              <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {getFilteredAssets(userAssets).length} ITEMS
                </span>
              </div>
              
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-primary-blue text-black'
                      : 'bg-gray-800 dark:bg-gray-800 light:bg-light-card text-gray-400 dark:text-gray-400 light:text-light-text-secondary hover:text-off-white dark:hover:text-off-white light:hover:text-light-text'
                  }`}
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary-blue text-black'
                      : 'bg-gray-800 dark:bg-gray-800 light:bg-light-card text-gray-400 dark:text-gray-400 light:text-light-text-secondary hover:text-off-white dark:hover:text-off-white light:hover:text-light-text'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="p-1.5 text-gray-600 hover:text-black"
              >
                <Settings className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div>
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              {/* Portfolio Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black">Portfolio Overview</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('🔄 Refresh button clicked!');
                    handleRefresh();
                  }}
                  disabled={nftsLoading || portfolioLoading}
                  className="text-primary-blue border-primary-blue hover:bg-primary-blue/10"
                  title="Refresh portfolio data - Click to fetch assets from blockchain"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${nftsLoading || portfolioLoading ? 'animate-spin' : ''}`} />
                  {nftsLoading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
              
              {/* Portfolio Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Portfolio Value Card */}
                <Card variant="floating">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-black">Portfolio Value</h3>
                      <TrendingUp className="w-4 h-4 text-primary-blue" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-bold text-primary-blue">
                        {portfolioLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          userStats.portfolioValue
                        )}
                      </p>
                      <p className="text-sm text-primary-blue-light">
                        {portfolioLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          userStats.usdValue
                        )}
                      </p>
                      <p className="text-xs text-gray-400">Total Value</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Assets Count Card */}
                <Card variant="floating">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-black">Total Assets</h3>
                      <Grid3X3 className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-bold text-purple-400">
                        {assetsLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          userStats.assetsCount
                        )}
                      </p>
                      <p className="text-xs text-gray-400">Digital Assets</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Created Assets Card */}
                <Card variant="floating">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-black">Created</h3>
                      <Plus className="w-4 h-4 text-black dark:text-white" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-bold text-black dark:text-white">
                        {assetsLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          userStats.createdCount
                        )}
                      </p>
                      <p className="text-xs text-gray-400">Assets Created</p>
                    </div>
                  </CardContent>
                </Card>

                {/* RWA Assets Card */}
                <Card variant="floating">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-black">RWA Assets</h3>
                      <Building2 className="w-4 h-4 text-orange-400" />
              </div>
                    <div className="space-y-1">
                      <p className="text-xl font-bold text-orange-400">
                        {isLoadingRWA ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          rwaAssets.length
                        )}
                      </p>
                      <p className="text-xs text-gray-400">Real World Assets</p>
                    </div>
                  </CardContent>
                </Card>

                {/* KYC Status Card */}
                <Card variant="floating">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-black">KYC Status</h3>
                      {user?.kycStatus === 'approved' ? (
                        <CheckCircle className="w-4 h-4 text-primary-blue" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-bold capitalize">
                        {user?.kycStatus === 'approved' ? (
                          <span className="text-primary-blue">Verified</span>
                        ) : (
                          <span className="text-gray-700">Pending</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600">Identity Status</p>
                      {user?.kycStatus !== 'approved' && (
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleStartKYC}
                            className="w-full text-xs border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Complete KYC
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log('🔄 Manual KYC status refresh...');
                              refreshUser().catch(error => {
                                console.error('Error refreshing KYC status:', error);
                                toast({
                                  title: 'Refresh Failed',
                                  description: 'Failed to refresh KYC status. Please try again.',
                                  variant: 'destructive'
                                });
                              });
                            }}
                            className="w-full text-xs border-black/30 dark:border-white/30 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Check Status
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* KYC Required Banner */}
              {user?.kycStatus !== 'approved' && (
                <Card variant="floating" className="border-gray-300 bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-black mb-1">
                          Complete KYC Verification
                        </h3>
                        <p className="text-xs text-gray-600 mb-3">
                          Complete your identity verification to access RWA creation and full platform functionality.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleStartKYC}
                            className="border-gray-300 text-black hover:bg-gray-50"
                        >
                          <Shield className="w-3 h-3 mr-2" />
                          Start KYC Verification
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card variant="floating">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary-blue" />
                      Quick Actions
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Clear ALL caches and force refresh
                        if (address) {
                          const cacheKey = `user_nfts_${address.toLowerCase()}`;
                          localStorage.removeItem(cacheKey);
                          localStorage.removeItem(`${cacheKey}_timestamp`);
                          console.log('🗑️ Cache cleared, forcing refresh...');
                        }
                        setForceRefresh(prev => !prev);
                      }}
                      disabled={nftsLoading}
                      className="text-xs text-gray-400 hover:text-primary-blue"
                    >
                      {nftsLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (user?.kycStatus?.toLowerCase() === 'approved') {
                          handleCreateAsset();
                        } else {
                          handleStartKYC();
                        }
                      }}
                      className={`h-16 flex-col gap-1.5 ${
                        user?.kycStatus?.toLowerCase() === 'approved'
                          ? 'border-purple-400/30 text-purple-400 hover:bg-purple-400/10'
                          : 'border-gray-300 text-black hover:bg-gray-50'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span className="text-xs font-medium">
                        Create RWA
                        {user?.kycStatus?.toLowerCase() !== 'approved' && (
                          <span className="text-xs opacity-75">(KYC Required)</span>
                        )}
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/dashboard/marketplace')}
                      className="h-16 flex-col gap-1.5 border-gray-300 text-black hover:bg-gray-50"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs font-medium">Browse Marketplace</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card variant="floating">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-primary-blue" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {recentActivity.map((activity, index) => {
                      const Icon = getStatusIcon(activity.type);
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-white rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${getStatusColor(activity.type)}`} />
                            <div>
                              <p className="text-sm font-medium text-black">{activity.action}</p>
                              <p className="text-xs text-gray-600">{activity.asset}</p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-600">{activity.time}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'rwa-assets' && (
            <div className="space-y-6">
              {/* RWA Assets Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-off-white">Real World Assets</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isLoadingRWA}
                    className="text-purple-400 border-purple-400 hover:bg-purple-400/10"
                    title="Refresh RWA assets"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingRWA ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="text-purple-400 border-purple-400 hover:bg-purple-400/10"
                  >
                    {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              {assetsLoading || isLoadingRWA ? (
                <Card variant="floating" className="text-center py-16">
                  <CardContent>
                    <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-purple-400/20 to-purple-600/20 rounded-full flex items-center justify-center">
                      <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />
                    </div>
                    <h3 className="text-2xl font-bold text-off-white mb-4">Loading RWA assets...</h3>
                    <p className="text-gray-400">
                      Please wait while we fetch your RWA assets
                    </p>
                  </CardContent>
                </Card>
              ) : (rwaAssets.length === 0 && userAssets.length === 0) ? (
                <Card variant="floating" className="text-center py-16">
                  <CardContent>
                    <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-purple-400/20 to-purple-600/20 rounded-full flex items-center justify-center">
                      <Building2 className="w-16 h-16 text-purple-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-off-white mb-4">No RWA assets found</h3>
                    <p className="text-gray-400 mb-6">
                      Start by creating your first Real World Asset
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => handleCreateAsset()}
                      className="px-6 py-3 border-purple-400/30 text-purple-400 hover:bg-purple-400/10"
                      disabled={user?.kycStatus?.toLowerCase() !== 'approved'}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Create RWA
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className={`grid gap-6 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                    : 'grid-cols-1'
                }`}>
                  {/* Show blockchain assets first */}
                  {getFilteredAssets(userAssets).map((asset: any, index: number) => (
                    <div 
                      key={asset.assetId || asset.id || `blockchain-asset-${index}`}
                      onClick={() => {
                        console.log('🔍 Blockchain asset clicked:', asset);
                        setSelectedAsset(asset);
                        setShowAssetDetail(true);
                      }}
                      className="cursor-pointer"
                    >
                      <Card variant="floating" className="overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                        <CardContent className="p-4">
                          <div className="aspect-square bg-gradient-to-br from-primary-blue/20 to-primary-blue-light/20 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden group">
                            {(() => {
                              const imageUrl = asset.imageURI || asset.displayImage || asset.image || asset.metadata?.image || asset.metadata?.imageURI;
                              if (imageUrl) {
                                const normalizedUrl = normalizeIPFSUrl(imageUrl) || imageUrl;
                                return (
                                  <>
                                    <img 
                                      src={normalizedUrl} 
                                      alt={asset.name || 'Asset'} 
                                      className="w-full h-full object-cover rounded-lg transition-transform group-hover:scale-110"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                        if (fallback) fallback.style.display = 'flex';
                                      }}
                                    />
                                    <div className="hidden w-full h-full items-center justify-center flex-col absolute inset-0 bg-gradient-to-br from-primary-blue/20 to-primary-blue-light/20 rounded-lg">
                                      <Globe className="w-12 h-12 text-primary-blue mb-2" />
                                      <p className="text-xs text-gray-400">Image unavailable</p>
                                    </div>
                                  </>
                                );
                              }
                              return (
                                <div className="w-full h-full items-center justify-center flex-col flex">
                                  <Globe className="w-12 h-12 text-primary-blue mb-2" />
                                  <p className="text-xs text-gray-400">No image</p>
                                </div>
                              );
                            })()}
                          </div>
                          <h3 className="font-semibold text-off-white mb-2 truncate">
                            {asset.name || `Asset #${asset.tokenId || index + 1}`}
                          </h3>
                          <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                            {asset.description || 'No description available'}
                          </p>
                          {asset.location && (
                            <p className="text-xs text-gray-500 mb-2 truncate">
                              📍 {asset.location}
                            </p>
                          )}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-primary-blue font-semibold">
                              {asset.value ? `$${asset.value.toLocaleString()}` : 
                               asset.totalValue ? `${parseFloat(asset.totalValue || '0').toLocaleString()} TRUST` : 
                               'N/A'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {asset.type || asset.assetType || 'RWA'}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            {(() => {
                              const status = asset.status;
                              const statusNum = typeof status === 'number' ? status : parseInt(status) || 0;
                              let statusLabel = 'Pending';
                              let statusColor = 'bg-gray-500/20 text-gray-400';
                              let statusIcon = AlertCircle;
                              
                              if (statusNum === 1 || statusNum === 5 || statusNum === 6 || statusNum === 7) {
                                statusLabel = 'Active';
                                statusColor = 'bg-green-500/20 text-green-400 border-green-500/30';
                                statusIcon = CheckCircle;
                              } else if (statusNum === 2) {
                                statusLabel = 'Rejected';
                                statusColor = 'bg-red-500/20 text-red-400 border-red-500/30';
                                statusIcon = XCircle;
                              } else if (statusNum === 3) {
                                statusLabel = 'Tokenized';
                                statusColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                                statusIcon = CheckCircle;
                              } else if (statusNum === 4) {
                                statusLabel = 'Transferred';
                                statusColor = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
                                statusIcon = TrendingUp;
                              } else if (typeof status === 'string') {
                                if (status.toLowerCase() === 'listed' || status.toLowerCase() === 'for sale') {
                                  statusLabel = 'Listed';
                                  statusColor = 'bg-primary-blue/20 text-primary-blue border-primary-blue/30';
                                  statusIcon = Tag;
                                } else if (status.toLowerCase() === 'owned') {
                                  statusLabel = 'Owned';
                                  statusColor = 'bg-green-500/20 text-green-400 border-green-500/30';
                                  statusIcon = CheckCircle;
                                }
                              }
                              
                              const IconComponent = statusIcon;
                              return (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border ${statusColor}`}>
                                  <IconComponent className="w-3 h-3" />
                                  {statusLabel}
                                </span>
                              );
                            })()}
                            <span className="px-2 py-1 rounded-full text-xs bg-primary-blue/10 text-primary-blue border border-primary-blue/20">
                              {asset.assetType || asset.type || 'RWA'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                  {/* Then show API assets */}
                  {getFilteredAssets(rwaAssets).map((asset: any, index: number) => (
                    <div key={asset._id || index}>
                      <Card 
                        variant="floating" 
                        className="overflow-hidden hover:scale-105 transition-transform cursor-pointer"
                        onClick={() => {
                          setSelectedAsset(asset);
                          setShowAssetDetail(true);
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="aspect-square bg-gradient-to-br from-purple-400/20 to-purple-600/20 rounded mb-3 flex items-center justify-center relative group">
                            {(asset.displayImage || asset.imageURI) ? (
                              <img 
                                src={asset.displayImage || asset.imageURI} 
                                alt={asset.name || 'RWA Asset'} 
                                className="w-full h-full object-cover rounded"
                                onError={(e) => {
                                  console.error('❌ Profile image failed to load:', asset.displayImage || asset.imageURI);
                                  e.currentTarget.style.display = 'none';
                                }}
                                onLoad={() => {
                                  console.log('✅ Profile image loaded successfully:', asset.displayImage || asset.imageURI);
                                }}
                              />
                            ) : null}
                            
                            {/* File access overlay */}
                            {(asset.evidenceFiles?.length > 0 || asset.legalDocuments?.length > 0) && (
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="flex gap-2">
                                  {asset.evidenceFiles?.length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs"
                                      onClick={() => window.open(asset.evidenceFiles[0].url, '_blank')}
                                    >
                                      <FileText className="w-3 h-3 mr-1" />
                                      Evidence
                                    </Button>
                                  )}
                                  {asset.legalDocuments?.length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs"
                                      onClick={() => window.open(asset.legalDocuments[0].url, '_blank')}
                                    >
                                      <FileText className="w-3 h-3 mr-1" />
                                      Legal
                                    </Button>
                            )}
                          </div>
                              </div>
                            )}
                          </div>
                          
                          <h3 className="text-sm font-medium text-off-white mb-1 truncate">
                            {asset.name || `RWA Asset #${asset.nftSerialNumber || index + 1}`}
                          </h3>
                          
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                            {asset.description || asset.legalDescription || 'Real World Asset'}
                          </p>
                          
                          {/* Property details */}
                          {asset.propertyAddress && (
                            <p className="text-xs text-gray-500 mb-2 truncate">
                              📍 {asset.propertyAddress}
                            </p>
                          )}
                          
                          <div className="space-y-1 mb-2">
                          <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">Value:</span>
                            <span className="text-sm text-purple-400 font-medium">
                                {asset.totalValue ? `${asset.totalValue.toLocaleString()} TRUST` : 'N/A'}
                            </span>
                            </div>
                            {asset.expectedAPY && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">APY:</span>
                                <span className="text-xs text-primary-blue">
                                  {asset.expectedAPY}%
                                </span>
                              </div>
                            )}
                            {asset.maturityDate && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">Maturity:</span>
                                <span className="text-xs text-gray-400">
                                  {new Date(asset.maturityDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">RWA</span>
                            {asset.approvalStatus === 'APPROVED' ? (
                              <span className="text-xs text-primary-blue flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                AMC Approved
                              </span>
                            ) : asset.approvalStatus === 'REJECTED' ? (
                              <span className="text-xs text-red-400 flex items-center">
                                <XCircle className="w-3 h-3 mr-1" />
                                AMC Rejected
                              </span>
                            ) : asset.approvalStatus === 'SUBMITTED_FOR_APPROVAL' ? (
                              <span className="text-xs text-gray-700 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Pending AMC Approval
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Status Unknown
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="space-y-6">
              {assetsLoading ? (
                <Card variant="floating" className="text-center py-16">
                  <CardContent>
                    <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-primary-blue/20 to-primary-blue-light/20 rounded-full flex items-center justify-center">
                      <Loader2 className="w-16 h-16 text-primary-blue animate-spin" />
                    </div>
                    <h3 className="text-2xl font-bold text-off-white mb-4">Loading your assets...</h3>
                    <p className="text-gray-400">
                      Please wait while we fetch your portfolio data
                    </p>
                  </CardContent>
                </Card>
              ) : assetsError ? (
                <Card variant="floating" className="text-center py-16">
                  <CardContent>
                    <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-16 h-16 text-red-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-off-white mb-4">Error loading assets</h3>
                    <p className="text-gray-400 mb-6">
                      {assetsError || 'Failed to load your assets. Please try again.'}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => window.location.reload()}
                      className="px-6 py-3 border-red-500/30 text-red-500 hover:bg-red-500/10"
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              ) : userAssets.length === 0 ? (
                <Card variant="floating" className="text-center py-16">
                  <CardContent>
                    <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-primary-blue/20 to-primary-blue-light/20 rounded-full flex items-center justify-center">
                      <Globe className="w-16 h-16 text-primary-blue" />
                    </div>
                    <h3 className="text-2xl font-bold text-off-white mb-4">No assets found</h3>
                    <p className="text-gray-400 mb-6">
                      {nftsLoading ? 'Loading assets from blockchain...' : 'Start by creating your first RWA asset'}
                    </p>
                    {!nftsLoading && (
                      <div className="mb-4 p-4 bg-gray-800 rounded-lg text-left text-sm">
                        <p className="text-gray-400 mb-2">Debug Info:</p>
                        <p className="text-gray-300">Address: {address || 'Not connected'}</p>
                        <p className="text-gray-300">UserNFTs: {userNFTs.length}</p>
                        <p className="text-gray-300">UserAssets: {userAssets.length}</p>
                        <p className="text-gray-300">Filtered: {getFilteredAssets(userAssets).length}</p>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={nftsLoading}
                        className="px-6 py-3 border-primary-blue text-primary-blue hover:bg-primary-blue/10"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${nftsLoading ? 'animate-spin' : ''}`} />
                        Refresh Assets
                      </Button>
                      <Button
                        variant="neon"
                        onClick={() => handleCreateAsset()}
                        className="px-6 py-3"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create RWA Asset
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : nftsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-primary-blue animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading your assets from blockchain...</p>
                  </div>
                </div>
              ) : getFilteredAssets(userAssets).length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-primary-blue/20 to-primary-blue-light/20 rounded-full flex items-center justify-center">
                    <Globe className="w-16 h-16 text-primary-blue" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-off-white">No Assets Match Filters</h3>
                  <p className="text-gray-400 mb-4">
                    {userAssets.length > 0 
                      ? `You have ${userAssets.length} assets, but none match the current filters`
                      : address 
                        ? `No assets found for address ${address.slice(0, 6)}...${address.slice(-4)}`
                        : 'Connect your wallet to view your assets'}
                  </p>
                  {userAssets.length > 0 && (
                    <div className="mb-4 p-4 bg-gray-800 rounded-lg text-left text-sm max-w-md mx-auto">
                      <p className="text-gray-400 mb-2">Debug Info:</p>
                      <p className="text-gray-300">Total Assets: {userAssets.length}</p>
                      <p className="text-gray-300">Filtered: {getFilteredAssets(userAssets).length}</p>
                      <p className="text-gray-300">Status Filter: {statusFilter}</p>
                      <p className="text-gray-300">Type Filter: {assetTypeFilter}</p>
                      <p className="text-gray-300">Search: {searchQuery || '(none)'}</p>
                      <p className="text-gray-300 mt-2">Sample Asset:</p>
                      <pre className="text-xs text-gray-400 overflow-auto">
                        {JSON.stringify({
                          name: userAssets[0]?.name,
                          type: userAssets[0]?.type,
                          status: userAssets[0]?.status,
                          category: userAssets[0]?.category
                        }, null, 2)}
                      </pre>
                    </div>
                  )}
                  {userAssets.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        setAssetTypeFilter('all');
                        setCollectionFilter('all');
                      }}
                      className="px-6 py-3 mb-3"
                    >
                      Clear All Filters
                    </Button>
                  )}
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="neon"
                      onClick={handleRefresh}
                      className="px-6 py-3"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Assets
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        console.log('🧪 DEBUG: Testing direct blockchain query...');
                        try {
                          const { mantleContractService } = await import('../services/mantleContractService');
                          const { ethers } = await import('ethers');
                          const rpcUrl = import.meta.env.VITE_MANTLE_TESTNET_RPC_URL || 'https://rpc.sepolia.mantle.xyz';
                          const provider = new ethers.JsonRpcProvider(rpcUrl);
                          mantleContractService.initialize(null as any, provider);
                          
                          console.log('🧪 Querying Factory contract directly...');
                          const factoryAssets = await mantleContractService.getUserAssetsFromFactory(address);
                          console.log('🧪 Factory assets result:', factoryAssets);
                          console.log('🧪 Factory assets count:', factoryAssets.length);
                          
                          if (factoryAssets.length > 0) {
                            console.log('🧪 First asset:', factoryAssets[0]);
                            setUserNFTs(factoryAssets);
                            toast({
                              title: 'Debug Test Success',
                              description: `Found ${factoryAssets.length} assets directly from blockchain`,
                              variant: 'default'
                            });
                          } else {
                            toast({
                              title: 'Debug Test',
                              description: 'No assets found in direct query',
                              variant: 'default'
                            });
                          }
                        } catch (error: any) {
                          console.error('🧪 Debug test error:', error);
                          toast({
                            title: 'Debug Test Failed',
                            description: error.message,
                            variant: 'destructive'
                          });
                        }
                      }}
                      className="px-6 py-3 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                    >
                      🧪 Debug: Direct Query
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={`grid gap-6 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                    : 'grid-cols-1'
                }`}>
                  {(() => {
                    const filtered = getFilteredAssets(userAssets);
                    console.log('🖼️ ========== RENDERING ASSETS GRID ==========');
                    console.log('🖼️ Filtered assets count:', filtered.length);
                    console.log('🖼️ UserAssets count:', userAssets.length);
                    console.log('🖼️ View mode:', viewMode);
                    console.log('🖼️ Assets to render (WITH IMAGE DATA):', filtered.map(a => ({
                      id: a.id,
                      assetId: a.assetId,
                      name: a.name,
                      imageURI: a.imageURI || '❌ MISSING',
                      displayImage: a.displayImage || '❌ MISSING',
                      image: a.image || '❌ MISSING',
                      metadataImage: a.metadata?.image || '❌ MISSING',
                      metadataImageURI: a.metadata?.imageURI || '❌ MISSING',
                      status: a.status,
                      hasImage: !!(a.imageURI || a.displayImage || a.image || a.metadata?.image || a.metadata?.imageURI),
                      tokenId: a.tokenId,
                      fullAsset: a // Include full asset for debugging
                    })));
                    console.log('🖼️ ===========================================');
                    
                    if (filtered.length === 0) {
                      console.warn('⚠️ No assets to render after filtering!');
                      return [];
                    }
                    
                    return filtered;
                  })().map((asset: any, index: number) => {
                    console.log(`🖼️ ========== RENDERING ASSET CARD ${index + 1}: ${asset.name || asset.id} ==========`);
                    console.log(`🖼️ Asset details:`, {
                      name: asset.name,
                      id: asset.id,
                      assetId: asset.assetId,
                      tokenId: asset.tokenId,
                      'imageURI': asset.imageURI || '❌ EMPTY',
                      'displayImage': asset.displayImage || '❌ EMPTY',
                      'image': asset.image || '❌ EMPTY',
                      'metadataImage': asset.metadata?.image || '❌ EMPTY',
                      'metadataImageURI': asset.metadata?.imageURI || '❌ EMPTY',
                      'metadataDisplayImage': asset.metadata?.displayImage || '❌ EMPTY',
                      'Has any image?': !!(asset.imageURI || asset.displayImage || asset.image || asset.metadata?.image || asset.metadata?.imageURI),
                      'Full asset keys': Object.keys(asset)
                    });
                    console.log(`🖼️ Full asset object:`, JSON.stringify({
                      name: asset.name,
                      assetId: asset.assetId,
                      imageURI: asset.imageURI,
                      displayImage: asset.displayImage,
                      image: asset.image,
                      metadata: asset.metadata
                    }, null, 2));
                    return (
                    <div 
                      key={asset.assetId || asset.id || `asset-${index}`}
                      onClick={() => {
                        console.log('🔍 ========== ASSET CLICKED ==========');
                        console.log('🔍 Asset clicked:', asset);
                        console.log('🔍 Asset details:', {
                          name: asset.name,
                          assetId: asset.assetId,
                          tokenId: asset.tokenId,
                          owner: asset.owner,
                          imageURI: asset.imageURI,
                          displayImage: asset.displayImage,
                          totalValue: asset.totalValue,
                          status: asset.status,
                          metadata: asset.metadata,
                          allKeys: Object.keys(asset)
                        });
                        console.log('🔍 Full asset object:', JSON.stringify(asset, null, 2));
                        setSelectedAsset(asset);
                        setShowAssetDetail(true);
                        console.log('✅ Modal should open with asset data');
                      }}
                      className="cursor-pointer"
                    >
                      <Card variant="floating" className="overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                        <CardContent className="p-4">
                          <div className="aspect-square bg-gradient-to-br from-primary-blue/20 to-primary-blue-light/20 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden group">
                            {(() => {
                              // Try multiple image sources
                              const imageUrl = asset.imageURI || asset.displayImage || asset.image || asset.metadata?.image || asset.metadata?.imageURI;
                              
                              console.log(`🖼️ Asset ${asset.name || asset.id} - Image URL check:`, {
                                imageURI: asset.imageURI,
                                displayImage: asset.displayImage,
                                image: asset.image,
                                metadataImage: asset.metadata?.image,
                                metadataImageURI: asset.metadata?.imageURI,
                                finalImageUrl: imageUrl
                              });

                              console.log(`🖼️ Asset ${asset.name || asset.id} image URL (raw):`, imageUrl);
                              console.log(`🖼️ Asset ${asset.name || asset.id} full asset object:`, {
                                imageURI: asset.imageURI,
                                displayImage: asset.displayImage,
                                image: asset.image,
                                metadataImage: asset.metadata?.image,
                                metadataImageURI: asset.metadata?.imageURI
                              });

                              if (imageUrl) {
                                // Use the normalizeIPFSUrl utility function
                                const normalizedUrl = normalizeIPFSUrl(imageUrl);
                                
                                if (!normalizedUrl) {
                                  console.warn(`⚠️ Failed to normalize image URL for ${asset.name || asset.id}:`, imageUrl);
                                  console.warn(`   This might be a test/dummy value or invalid CID`);
                                  // Don't try to render image if normalization failed
                                  return (
                                    <div className="w-full h-full items-center justify-center flex-col flex">
                                      <Globe className="w-12 h-12 text-primary-blue mb-2" />
                                      <p className="text-xs text-gray-400">Invalid image URL</p>
                                    </div>
                                  );
                                }
                                
                                console.log(`🖼️ Normalized image URL for ${asset.name || asset.id}:`, normalizedUrl);
                                const finalUrl = normalizedUrl;
                                
                                return (
                                  <>
                                    <img 
                                      src={finalUrl} 
                                      alt={asset.name || 'Asset'} 
                                      className="w-full h-full object-cover rounded-lg transition-transform group-hover:scale-110"
                                      onError={(e) => {
                                        const img = e.currentTarget;
                                        console.error('❌ Image failed to load for asset:', asset.name || asset.id);
                                        console.error('   Attempted URL:', finalUrl);
                                        console.error('   Original URL:', imageUrl);
                                        console.error('   Normalized URL:', normalizedUrl);
                                        console.error('   Image element:', {
                                          src: img.src,
                                          complete: img.complete,
                                          naturalWidth: img.naturalWidth,
                                          naturalHeight: img.naturalHeight
                                        });
                                        
                                        // Try alternative gateways if first fails
                                        if (normalizedUrl && normalizedUrl.includes('/ipfs/')) {
                                          const cid = normalizedUrl.split('/ipfs/')[1]?.split('?')[0];
                                          if (cid && cid.match(/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]{56,})$/)) {
                                            const altGateways = [
                                              `https://ipfs.io/ipfs/${cid}`,
                                              `https://dweb.link/ipfs/${cid}`,
                                              `https://cloudflare-ipfs.com/ipfs/${cid}`,
                                              `https://gateway.ipfs.io/ipfs/${cid}`
                                            ];
                                            const currentAttempt = parseInt(img.getAttribute('data-retry') || '0');
                                            if (currentAttempt < altGateways.length) {
                                              console.log(`🔄 Retrying with alternative gateway ${currentAttempt + 1}/${altGateways.length}:`, altGateways[currentAttempt]);
                                              img.setAttribute('data-retry', String(currentAttempt + 1));
                                              img.src = altGateways[currentAttempt];
                                              return; // Don't hide, try next gateway
                                            } else {
                                              console.error(`❌ All ${altGateways.length} gateways failed for CID: ${cid}`);
                                            }
                                          } else {
                                            console.error(`❌ Invalid CID format: ${cid}`);
                                          }
                                        }
                                        
                                        // All gateways failed or invalid CID - show fallback
                                        img.style.display = 'none';
                                        const fallback = img.nextElementSibling as HTMLElement;
                                        if (fallback) fallback.style.display = 'flex';
                                      }}
                                      onLoad={() => {
                                        console.log('✅ Asset image loaded successfully:', asset.name || asset.id, finalUrl);
                                      }}
                                    />
                                    {/* Fallback when image fails */}
                                    <div className="hidden w-full h-full items-center justify-center flex-col absolute inset-0 bg-gradient-to-br from-primary-blue/20 to-primary-blue-light/20 rounded-lg">
                                      <Globe className="w-12 h-12 text-primary-blue mb-2" />
                                      <p className="text-xs text-gray-400">Image unavailable</p>
                                    </div>
                                  </>
                                );
                              }
                              
                              // No image URL available
                              console.log(`⚠️ No image URL for asset:`, asset.name || asset.id);
                              return (
                                <div className="w-full h-full items-center justify-center flex-col flex">
                                  <Globe className="w-12 h-12 text-primary-blue mb-2" />
                                  <p className="text-xs text-gray-400">No image</p>
                                </div>
                              );
                            })()}
                          </div>
                          <h3 className="font-semibold text-off-white mb-2 truncate">
                            {asset.name || `Asset #${asset.tokenId || index + 1}`}
                          </h3>
                          <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                            {asset.description || 'No description available'}
                          </p>
                          {asset.location && (
                            <p className="text-xs text-gray-500 mb-2 truncate">
                              📍 {asset.location}
                            </p>
                          )}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-primary-blue font-semibold">
                              {asset.value ? `$${asset.value.toLocaleString()}` : 
                               asset.totalValue ? `${parseFloat(asset.totalValue || '0').toLocaleString()} TRUST` : 
                               'N/A'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {asset.type || asset.assetType || 'RWA'}
                            </span>
                          </div>
                          
                          {/* Status Badge */}
                          <div className="mt-2 flex items-center justify-between">
                            {(() => {
                              const status = asset.status;
                              const statusNum = typeof status === 'number' ? status : parseInt(status) || 0;
                              
                              // Status mapping from CoreAssetFactory
                              // 0=PENDING, 1=VERIFIED, 2=REJECTED, 3=TOKENIZED, 4=TRANSFERRED, 5=ACTIVE, 6=ACTIVE_AMC_MANAGED, 7=DIGITAL_ACTIVE
                              let statusLabel = 'Pending';
                              let statusColor = 'bg-gray-500/20 text-gray-400';
                              let statusIcon = AlertCircle;
                              
                              if (statusNum === 1 || statusNum === 5 || statusNum === 6 || statusNum === 7) {
                                statusLabel = 'Active';
                                statusColor = 'bg-green-500/20 text-green-400 border-green-500/30';
                                statusIcon = CheckCircle;
                              } else if (statusNum === 2) {
                                statusLabel = 'Rejected';
                                statusColor = 'bg-red-500/20 text-red-400 border-red-500/30';
                                statusIcon = XCircle;
                              } else if (statusNum === 3) {
                                statusLabel = 'Tokenized';
                                statusColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                                statusIcon = CheckCircle;
                              } else if (statusNum === 4) {
                                statusLabel = 'Transferred';
                                statusColor = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
                                statusIcon = TrendingUp;
                              } else if (typeof status === 'string') {
                                // Handle string statuses
                                if (status.toLowerCase() === 'listed' || status.toLowerCase() === 'for sale') {
                                  statusLabel = 'Listed';
                                  statusColor = 'bg-primary-blue/20 text-primary-blue border-primary-blue/30';
                                  statusIcon = Tag;
                                } else if (status.toLowerCase() === 'owned') {
                                  statusLabel = 'Owned';
                                  statusColor = 'bg-green-500/20 text-green-400 border-green-500/30';
                                  statusIcon = CheckCircle;
                                } else {
                                  statusLabel = status;
                                }
                              }
                              
                              const IconComponent = statusIcon;
                              
                              return (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border ${statusColor}`}>
                                  <IconComponent className="w-3 h-3" />
                                  {statusLabel}
                                </span>
                              );
                            })()}
                            
                            {/* Asset Type Badge */}
                            <span className="px-2 py-1 rounded-full text-xs bg-primary-blue/10 text-primary-blue border border-primary-blue/20">
                              {asset.assetType || asset.type || 'RWA'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <Card variant="floating">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary-blue" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => {
                    const Icon = getStatusIcon(activity.type);
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 ${getStatusColor(activity.type)}`} />
                          <div>
                            <p className="text-off-white font-medium">{activity.action}</p>
                            <p className="text-sm text-gray-400">{activity.asset}</p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{activity.time}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                  <div className="text-center py-16">
                    <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-primary-blue/20 to-primary-blue-light/20 rounded-full flex items-center justify-center">
                      <Activity className="w-16 h-16 text-primary-blue" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-off-white">No Activity Yet</h3>
                    <p className="text-gray-400 mb-6">
                      Your transaction history will appear here once you create or trade assets
                    </p>
                    <Button
                      variant="neon"
                      onClick={() => navigate('/create-rwa-asset')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Asset
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Other tabs */}
          {!['portfolio', 'rwa-assets', 'assets', 'activity'].includes(activeTab) && (
            <Card variant="floating" className="text-center py-16">
              <CardContent>
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-primary-blue/20 to-primary-blue-light/20 rounded-full flex items-center justify-center">
                  <Activity className="w-16 h-16 text-primary-blue" />
                </div>
                <h3 className="text-2xl font-bold text-off-white mb-4">
                  {tabs.find(t => t.id === activeTab)?.label} Coming Soon
                </h3>
                <p className="text-gray-400">
                  This section is under development
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Asset Detail Modal */}
      <AssetDetailModal
        isOpen={showAssetDetail}
        onClose={() => {
          setShowAssetDetail(false);
          setSelectedAsset(null);
        }}
        asset={selectedAsset}
        onAssetUpdate={() => {
          // Trigger asset refresh by toggling forceRefresh
          setForceRefresh(prev => !prev);
        }}
      />

    </div>
  );
};

export default Profile;

