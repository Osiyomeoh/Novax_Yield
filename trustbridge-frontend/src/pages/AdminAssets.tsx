import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Calendar,
  DollarSign,
  ArrowLeft,
  Home,
  ChevronRight
} from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { useAdminRefresh } from '../hooks/useAdminRefresh';
import { AdminStatusIndicator } from '../components/Admin/AdminStatusIndicator';
import { useWallet } from '../contexts/WalletContext';
import { useToast } from '../hooks/useToast';
import { mantleContractService } from '../services/mantleContractService';
import { getContractAddress } from '../config/contracts';
import { ethers } from 'ethers';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';

interface Asset {
  assetId: string;
  name: string;
  description: string;
  type: string;
  status: string;
  totalValue: number;
  location: {
    country: string;
    region: string;
  };
  createdAt: string;
  verificationScore: number;
  expectedAPY: number;
  maturityDate: string;
  owner: string;
  displayImage?: string;
  evidenceFiles?: any[];
  legalDocuments?: any[];
  verification?: any;
}

const AdminAssets: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isAmcAdmin, isSuperAdmin, isPlatformAdmin } = useAdmin();
  const { refreshAdminStatus } = useAdminRefresh();
  const { address, isConnected, provider, signer } = useWallet();
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Check if user has admin access
  const hasAdminAccess = isAdmin || isAmcAdmin || isSuperAdmin || isPlatformAdmin;
  
  // Initialize Mantle contract service with wallet
  useEffect(() => {
    const initContractService = async () => {
      if (isConnected && provider && signer) {
        try {
          mantleContractService.initialize(signer, provider);
          console.log('✅ Mantle contract service initialized for admin');
        } catch (error) {
          console.error('Failed to initialize contract service:', error);
        }
      } else if (isConnected && provider && !signer) {
        // If provider exists but signer doesn't, try to get signer from provider
        try {
          if ('getSigner' in provider && typeof provider.getSigner === 'function') {
            const providerSigner = await provider.getSigner();
            mantleContractService.initialize(providerSigner, provider);
            console.log('✅ Mantle contract service initialized with provider signer');
          }
        } catch (error) {
          console.error('Failed to get signer from provider:', error);
        }
      }
    };
    initContractService();
  }, [isConnected, provider, signer]);

  useEffect(() => {
    if (hasAdminAccess) {
      fetchAssets();
    }
  }, [hasAdminAccess]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📡 Fetching RWA assets directly from Mantle blockchain...');

      // Always fetch from blockchain, not database
      if (!provider) {
        // Create a read-only provider if not available
        const rpcUrl = import.meta.env.VITE_MANTLE_TESTNET_RPC_URL || 'https://rpc.sepolia.mantle.xyz';
        const { ethers } = await import('ethers');
        const readOnlyProvider = new ethers.JsonRpcProvider(rpcUrl);
        mantleContractService.initialize(null as any, readOnlyProvider);
      } else {
        // Use existing provider (read-only mode)
        mantleContractService.initialize(null as any, provider);
      }

      // Fetch all RWA assets from blockchain using getAllRWAAssets()
      console.log('🔍 Starting asset fetch from blockchain...');
      console.log('📋 Contract address:', getContractAddress('CORE_ASSET_FACTORY'));
      
      let blockchainAssets: any[] = [];
      try {
        blockchainAssets = await mantleContractService.getAllRWAAssets();
        console.log(`✅ getAllRWAAssets() returned ${blockchainAssets.length} assets`);
      } catch (error: any) {
        console.error('❌ Error in getAllRWAAssets():', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          data: error.data
        });
        
        // Show user-friendly error
        setError(`Failed to fetch assets from blockchain: ${error.message || 'Unknown error'}`);
        setAssets([]);
        setLoading(false);
        return;
      }
      
      console.log(`📊 Found ${blockchainAssets.length} assets on Mantle blockchain`);
      
      if (blockchainAssets.length === 0) {
        console.warn('⚠️ No assets found on blockchain. This could mean:');
        console.warn('  1. No assets have been created yet');
        console.warn('  2. Assets were created outside the queried block range');
        console.warn('  3. Contract address might be incorrect');
        console.warn('  4. Network connection issue');
      }

      // Transform blockchain assets to the expected format
      // Also fetch full asset details using getAsset() for each asset
      const transformedAssets: Asset[] = await Promise.all(
        blockchainAssets.map(async (asset: any) => {
          try {
            // Fetch full asset details from CoreAssetFactory
            let fullAssetDetails: any = null;
            try {
              fullAssetDetails = await mantleContractService.getAsset(asset.assetId || asset.id);
            } catch (error) {
              console.warn(`⚠️ Failed to fetch full details for asset ${asset.assetId}:`, error);
            }

            // Use full details if available, otherwise use event data
            const assetData = fullAssetDetails || asset;

            // Map contract status enum to string
            let statusString = 'PENDING';
            const statusNum = Number(assetData.status || asset.status || 0);
            switch (statusNum) {
              case 0: statusString = 'PENDING_VERIFICATION'; break;
              case 1: statusString = 'VERIFIED_PENDING_AMC'; break;
              case 2: statusString = 'AMC_INSPECTION_SCHEDULED'; break;
              case 3: statusString = 'AMC_INSPECTION_COMPLETED'; break;
              case 4: statusString = 'LEGAL_TRANSFER_PENDING'; break;
              case 5: statusString = 'LEGAL_TRANSFER_COMPLETED'; break;
              case 6: statusString = 'ACTIVE_AMC_MANAGED'; break;
              case 9: statusString = 'REJECTED'; break;
              default: statusString = 'PENDING';
            }

            // Parse location string (format: "Country, Region")
            const locationString = assetData.location || asset.location || '';
            const locationParts = locationString.split(',').map((s: string) => s.trim());
            const country = locationParts[0] || 'Unknown';
            const region = locationParts[1] || 'Unknown';

            // Convert bigint values to numbers (values are in wei, so divide by 1e18 for TRUST tokens)
            const totalValueBigInt = assetData.totalValue || asset.totalValue || 0n;
            const totalValue = typeof totalValueBigInt === 'bigint' 
              ? Number(totalValueBigInt) / 1e18 
              : (typeof totalValueBigInt === 'string' ? parseFloat(totalValueBigInt) / 1e18 : Number(totalValueBigInt || 0));
            
            const maturityTimestamp = assetData.maturityDate || asset.maturityDate || 0;
            const maturityDateNum = typeof maturityTimestamp === 'bigint' 
              ? Number(maturityTimestamp) 
              : (typeof maturityTimestamp === 'string' ? parseInt(maturityTimestamp) : Number(maturityTimestamp || 0));

            const createdAtTimestamp = assetData.createdAt || asset.createdAt || Date.now() / 1000;
            const createdAtNum = typeof createdAtTimestamp === 'bigint' 
              ? Number(createdAtTimestamp) 
              : (typeof createdAtTimestamp === 'string' ? parseInt(createdAtTimestamp) : Number(createdAtTimestamp || Date.now() / 1000));

            return {
              assetId: asset.assetId || asset.id || assetData.id || '',
              name: assetData.name || asset.name || `Asset ${(asset.assetId || asset.id || '').slice(0, 8)}`,
              description: assetData.description || asset.description || '',
              type: assetData.assetTypeString || asset.type || asset.assetType || 'RWA',
              status: statusString,
              totalValue: totalValue,
              location: {
                country: country,
                region: region
              },
              expectedAPY: asset.expectedAPY || 12.5,
              maturityDate: maturityDateNum > 0 ? new Date(maturityDateNum * 1000).toISOString() : new Date().toISOString(),
              owner: assetData.currentOwner || assetData.owner || asset.owner || asset.currentOwner || asset.originalOwner || '',
              verificationScore: assetData.verificationScore || asset.verificationScore || assetData.verificationLevel || asset.verificationLevel || 0,
              createdAt: createdAtNum > 0 ? new Date(createdAtNum * 1000).toISOString() : new Date().toISOString(),
              displayImage: assetData.imageURI || asset.imageURI || asset.displayImage || '',
              imageURI: assetData.imageURI || asset.imageURI || asset.displayImage || '',
              evidenceFiles: assetData.evidenceHashes || asset.evidenceFiles || asset.evidenceHashes || [],
              legalDocuments: asset.legalDocuments || [],
              verification: asset.verification || null,
            };
          } catch (error) {
            console.error(`❌ Error transforming asset ${asset.assetId}:`, error);
            // Return a minimal asset object if transformation fails
            return {
              assetId: asset.assetId || asset.id || '',
              name: asset.name || `Asset ${(asset.assetId || asset.id || '').slice(0, 8)}`,
              description: asset.description || '',
              type: asset.type || 'RWA',
              status: 'PENDING',
              totalValue: 0,
              location: { country: 'Unknown', region: 'Unknown' },
              expectedAPY: 12.5,
              maturityDate: new Date().toISOString(),
              owner: asset.owner || '',
              verificationScore: 0,
              createdAt: new Date().toISOString(),
              displayImage: asset.imageURI || '',
              imageURI: asset.imageURI || '',
              evidenceFiles: [],
              legalDocuments: [],
              verification: null,
            };
          }
        })
      );

      console.log('✅ Transformed blockchain assets:', transformedAssets);
      setAssets(transformedAssets);
      
    } catch (error) {
      console.error('❌ Error fetching assets from blockchain:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch assets from blockchain');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to map contract status to our status format
  const mapContractStatus = (status: number): string => {
    switch (status) {
      case 0: return 'PENDING';
      case 1: return 'VERIFIED';
      case 2: return 'ACTIVE';
      case 3: return 'REJECTED';
      default: return 'PENDING';
    }
  };

  const approveAsset = async (assetId: string) => {
    if (!isConnected || !address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to approve assets',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsApproving(true);
      setError(null);

      console.log('✅ Approving asset on Mantle smart contract:', assetId);

      // Convert assetId to bytes32 format if needed
      // The contract expects bytes32, so we need to ensure proper format
      let assetIdBytes32: string;
      if (assetId.startsWith('0x') && assetId.length === 66) {
        // Already in bytes32 format (0x + 64 hex chars)
        assetIdBytes32 = assetId;
      } else if (assetId.startsWith('0x') && assetId.length < 66) {
        // Hex string but not full bytes32 - pad with zeros
        assetIdBytes32 = ethers.zeroPadValue(assetId, 32);
      } else {
        // String assetId - convert to bytes32 using keccak256 hash
        // Note: This should match how the contract generates assetId during creation
        assetIdBytes32 = ethers.id(assetId);
      }
      
      console.log('📝 Asset ID conversion:', { original: assetId, bytes32: assetIdBytes32 });

      // Verify asset on smart contract
      // VerificationLevel: 0=Basic, 1=Professional, 2=Expert, 3=Master
      // Using level 2 (Expert) for AMC approval
      const verificationLevel = 2; // Expert level
      
      console.log('📝 Calling verifyAsset on smart contract:', {
        assetId: assetIdBytes32,
        verificationLevel
      });

      // Initialize contract service if not already done
      if (provider) {
        let currentSigner = signer;
        // If signer is not available, try to get it from provider
        if (!currentSigner && 'getSigner' in provider && typeof provider.getSigner === 'function') {
          currentSigner = await provider.getSigner();
        }
        if (currentSigner) {
          mantleContractService.initialize(currentSigner, provider);
        } else {
          throw new Error('No signer available. Please ensure your wallet is connected.');
        }
      } else {
        throw new Error('No provider available. Please connect your wallet.');
      }

      // Call smart contract directly
      const txHash = await mantleContractService.verifyAsset(assetIdBytes32, verificationLevel);
      
      console.log('✅ Asset verified on Mantle smart contract:', txHash);

      // Also update backend database via API
      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        await fetch(`${import.meta.env.VITE_API_URL}/admin/approve-asset`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assetId: assetId,
            approved: true,
            comments: 'Asset approved by AMC admin on Mantle smart contract',
            verificationScore: 85
          }),
        });
      } catch (apiError) {
        console.warn('⚠️ Failed to update backend, but smart contract transaction succeeded:', apiError);
      }

      toast({
        title: 'Asset Approved!',
        description: `Asset verified on Mantle blockchain. Transaction: ${txHash.slice(0, 10)}...`,
        variant: 'default'
      });
      
      // Refresh assets list
      await fetchAssets();
      setShowDetails(false);
      setSelectedAsset(null);
    } catch (error: any) {
      console.error('❌ Error approving asset:', error);
      const errorMessage = error.message || 'Failed to approve asset on smart contract';
      setError(errorMessage);
      
      toast({
        title: 'Approval Failed',
        description: errorMessage.includes('VERIFIER_ROLE') || errorMessage.includes('verifier') || errorMessage.includes('AMC')
          ? 'You do not have VERIFIER_ROLE or AMC_ROLE on the contract. Please ensure your wallet has the required role.'
          : errorMessage,
        variant: 'destructive',
        duration: 8000
      });
    } finally {
      setIsApproving(false);
    }
  };

  const rejectAsset = async (assetId: string) => {
    if (!isConnected || !address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to reject assets',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsApproving(true);
      setError(null);

      console.log('❌ Rejecting asset:', assetId);

      // Convert assetId to bytes32 format if needed
      let assetIdBytes32: string;
      if (assetId.startsWith('0x') && assetId.length === 66) {
        assetIdBytes32 = assetId;
      } else if (assetId.startsWith('0x') && assetId.length < 66) {
        assetIdBytes32 = ethers.zeroPadValue(assetId, 32);
      } else {
        assetIdBytes32 = ethers.id(assetId);
      }

      // Initialize contract service if not already done
      if (provider) {
        let currentSigner = signer;
        if (!currentSigner && 'getSigner' in provider && typeof provider.getSigner === 'function') {
          currentSigner = await provider.getSigner();
        }
        if (currentSigner) {
          mantleContractService.initialize(currentSigner, provider);
        }
      }

      // Try to reject on blockchain first
      let blockchainRejected = false;
      let txHash: string | null = null;
      try {
        txHash = await mantleContractService.rejectAsset(assetIdBytes32);
        blockchainRejected = true;
        console.log('✅ Asset rejected on Mantle smart contract:', txHash);
      } catch (blockchainError: any) {
        console.warn('⚠️ Failed to reject on blockchain (contract may not have rejectAsset function yet):', blockchainError.message);
        // Continue with database rejection even if blockchain fails
      }

      // Update backend database to mark as rejected
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/approve-asset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetId: assetId,
          approved: false,
          comments: 'Asset rejected by AMC admin after review'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to reject asset: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Asset rejected successfully:', result);

      toast({
        title: 'Asset Rejected',
        description: blockchainRejected 
          ? `Asset rejected on Mantle blockchain. Transaction: ${txHash?.slice(0, 10)}...`
          : 'Asset rejected in database. Note: Contract does not support blockchain rejection yet.',
        variant: blockchainRejected ? 'default' : 'default'
      });
      
      // Refresh assets list
      await fetchAssets();
      setShowDetails(false);
      setSelectedAsset(null);
    } catch (error) {
      console.error('Error rejecting asset:', error);
      setError(error instanceof Error ? error.message : 'Failed to reject asset');
      toast({
        title: 'Rejection Failed',
        description: error instanceof Error ? error.message : 'Failed to reject asset',
        variant: 'destructive'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    let matchesStatus = false;
    if (filterStatus === 'ALL') {
      matchesStatus = true;
    } else if (filterStatus === 'PENDING') {
      // Include both PENDING and PENDING_VERIFICATION for the "Pending Review" filter
      matchesStatus = asset.status === 'PENDING' || asset.status === 'PENDING_VERIFICATION' || asset.status === 'SUBMITTED_FOR_APPROVAL';
    } else {
      matchesStatus = asset.status === filterStatus;
    }
    
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.assetId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'PENDING_VERIFICATION':
      case 'SUBMITTED_FOR_APPROVAL':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'VERIFIED':
      case 'VERIFIED_PENDING_AMC':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'ACTIVE':
      case 'ACTIVE_AMC_MANAGED':
        return 'text-primary-blue bg-primary-blue dark:bg-primary-blue/20';
      case 'REJECTED':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'PENDING_VERIFICATION':
      case 'SUBMITTED_FOR_APPROVAL':
        return Clock;
      case 'VERIFIED':
      case 'VERIFIED_PENDING_AMC':
        return CheckCircle;
      case 'ACTIVE':
      case 'ACTIVE_AMC_MANAGED':
        return TrendingUp;
      case 'REJECTED':
        return XCircle;
      default: return Package;
    }
  };

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Admin privileges required to access asset management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Navigation Header */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center gap-1 hover:text-gray-900 dark:text-gray-200 transition-colors"
            >
              <Home className="w-4 h-4" />
              Admin Dashboard
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 dark:text-white font-medium">Asset Management</span>
          </nav>
          
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Admin
            </Button>
            <div className="flex-1" />
            <AdminStatusIndicator />
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
              <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
              Asset Management
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 sm:mt-2">
              Review and approve RWA assets for tokenization
            </p>
            <div className="mt-2">
              <AdminStatusIndicator />
            </div>
          </div>
          <Button
            onClick={fetchAssets}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Assets</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{assets.length}</p>
              </div>
              <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                  {assets.filter(a => a.status === 'PENDING' || a.status === 'PENDING_VERIFICATION').length}
                </p>
              </div>
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
            </div>
          </Card>
          
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Approved</p>
                <p className="text-xl sm:text-2xl font-bold text-primary-blue">
                  {assets.filter(a => a.status === 'ACTIVE' || a.status === 'ACTIVE_AMC_MANAGED' || a.status === 'VERIFIED_PENDING_AMC').length}
                </p>
              </div>
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary-blue" />
            </div>
          </Card>
          
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  ${assets.reduce((sum, asset) => sum + asset.totalValue, 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-primary-blue" />
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="VERIFIED">Verified</option>
                <option value="ACTIVE">Active</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Assets List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Loading assets...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Assets</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <Button onClick={fetchAssets}>Try Again</Button>
          </Card>
        ) : filteredAssets.length === 0 ? (
          <Card className="p-6 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Assets Found</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchTerm || filterStatus !== 'ALL' 
                ? 'No assets match your current filters.' 
                : 'No assets have been submitted yet.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {filteredAssets.map((asset) => {
              const StatusIcon = getStatusIcon(asset.status);
              return (
                <motion.div
                  key={asset.uniqueKey || asset.assetId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group"
                >
                  <Card className="p-4 sm:p-6 hover:shadow-lg transition-all duration-200">
                    {/* Asset Image */}
                    {asset.displayImage && (
                      <div className="mb-4">
                        <img
                          src={asset.displayImage}
                          alt={asset.name}
                          className="w-full h-32 sm:h-40 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {asset.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono mb-2">
                          {asset.assetId}
                        </p>
                        {asset.description && (
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                            {asset.description}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                        <StatusIcon className="w-3 h-3 inline mr-1" />
                        {asset.status}
                      </span>
                    </div>

                    <div className="space-y-2 sm:space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Type</span>
                        <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{asset.type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Value</span>
                        <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          ${asset.totalValue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">APY</span>
                        <span className="text-xs sm:text-sm font-medium text-primary-blue">{asset.expectedAPY}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Location</span>
                        <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {asset.location.country}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Score</span>
                        <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          {asset.verificationScore}/100
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAsset(asset);
                          setShowDetails(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2"
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                        Review
                      </Button>
                      {(asset.status === 'PENDING' || asset.status === 'SUBMITTED_FOR_APPROVAL' || asset.status === 'PENDING_VERIFICATION') && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approveAsset(asset.assetId)}
                            className="flex-1 bg-primary-blue hover:bg-primary-blue text-white"
                          >
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectAsset(asset.assetId)}
                            className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Asset Details Modal */}
        {showDetails && selectedAsset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Asset Details
                </h2>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedAsset(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white self-end sm:self-auto"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Asset Display Image */}
              {selectedAsset.displayImage && (
                <div className="mb-6">
                  <img
                    src={selectedAsset.displayImage}
                    alt={selectedAsset.name}
                    className="w-full h-48 sm:h-64 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Basic Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedAsset.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Asset ID:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">{selectedAsset.assetId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedAsset.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedAsset.status)}`}>
                          {selectedAsset.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Owner:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                          {selectedAsset.owner.slice(0, 6)}...{selectedAsset.owner.slice(-4)}
                        </span>
                      </div>
                      {selectedAsset.description && (
                        <div className="mt-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Description:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedAsset.description}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Financial Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Value:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          ${selectedAsset.totalValue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Expected APY:</span>
                        <span className="text-sm font-medium text-primary-blue">{selectedAsset.expectedAPY}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Verification Score:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedAsset.verificationScore}/100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Location</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Country:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedAsset.location.country}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Region:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedAsset.location.region}</span>
                      </div>
                    </div>
                  </div>

                  {/* Evidence Files */}
                  {selectedAsset.evidenceFiles && selectedAsset.evidenceFiles.length > 0 ? (
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3">Evidence Files ({selectedAsset.evidenceFiles.length})</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {selectedAsset.evidenceFiles.map((file: any, index: number) => (
                          <div key={index} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                                {file.name || `Evidence ${index + 1}`}
                              </p>
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                {file.type ? file.type.split('/')[1]?.toUpperCase() : 'FILE'}
                              </span>
                            </div>
                            {file.url && (
                              <div className="flex gap-2">
                                <a 
                                  href={file.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  📄 View Document
                                </a>
                                {file.size && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </span>
                                )}
                              </div>
                            )}
                            {file.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {file.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3">Evidence Files</h3>
                      <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          ⚠️ No evidence files available for this asset. This may indicate incomplete documentation.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Legal Documents */}
                  {selectedAsset.legalDocuments && selectedAsset.legalDocuments.length > 0 ? (
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3">Legal Documents ({selectedAsset.legalDocuments.length})</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {selectedAsset.legalDocuments.map((doc: any, index: number) => (
                          <div key={index} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                                {doc.name || `Document ${index + 1}`}
                              </p>
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                {doc.type ? doc.type.split('/')[1]?.toUpperCase() : 'DOC'}
                              </span>
                            </div>
                            {doc.url && (
                              <div className="flex gap-2">
                                <a 
                                  href={doc.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  📋 View Document
                                </a>
                                {doc.size && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {(doc.size / 1024).toFixed(1)} KB
                                  </span>
                                )}
                              </div>
                            )}
                            {doc.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3">Legal Documents</h3>
                      <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          ⚠️ No legal documents available for this asset. This may indicate incomplete documentation.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Debug Information for AMC */}
                  {process.env.NODE_ENV === 'development' && (
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Debug Information</h3>
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Raw Asset Data:</p>
                        <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-auto max-h-32">
                          {JSON.stringify(selectedAsset, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Timeline</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Created:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(selectedAsset.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Maturity:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(selectedAsset.maturityDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {(selectedAsset.status === 'PENDING' || selectedAsset.status === 'SUBMITTED_FOR_APPROVAL' || selectedAsset.status === 'PENDING_VERIFICATION') && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => approveAsset(selectedAsset.assetId)}
                      disabled={isApproving || !isConnected}
                      className="flex-1 bg-black hover:bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isApproving ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve Asset
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => rejectAsset(selectedAsset.assetId)}
                      disabled={isApproving || !isConnected}
                      className="flex-1 text-red-600 border-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isApproving ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject Asset
                        </>
                      )}
                    </Button>
                  </div>
                  {!isConnected && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Connect your wallet to approve assets
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAssets;
