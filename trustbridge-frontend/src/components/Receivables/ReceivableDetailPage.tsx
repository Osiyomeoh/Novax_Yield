import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Calendar,
  DollarSign,
  User,
  Users,
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Shield,
  TrendingUp
} from 'lucide-react';
import { useWallet } from '../../contexts/PrivyWalletContext';
import { useAdmin } from '../../contexts/AdminContext';
import { novaxContractService } from '../../services/novaxContractService';
import { ethers } from 'ethers';
import Button from '../UI/Button';
import Card from '../UI/Card';
import { useToast } from '../../hooks/useToast';
import { novaxContractAddresses } from '../../config/contracts';

interface ReceivableDetail {
  receivableId: string;
  importer: string;
  exporter: string;
  amountUSD: bigint;
  dueDate: number;
  status: number; // 0 = PENDING, 1 = VERIFIED, 2 = REJECTED, 3 = PAID
  riskScore?: number;
  apr?: number;
  createdAt?: number;
  verifiedAt?: number;
  metadataCID?: string;
}

const ReceivableDetailPage: React.FC = () => {
  const { receivableId } = useParams<{ receivableId: string }>();
  const navigate = useNavigate();
  const { address, signer, isConnected, provider } = useWallet();
  const { isAmcAdmin, isSuperAdmin, isPlatformAdmin } = useAdmin();
  const { toast } = useToast();
  
  const [receivable, setReceivable] = useState<ReceivableDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (receivableId && provider) {
      fetchReceivableDetails();
    }
  }, [receivableId, provider, isConnected]);

  const fetchReceivableDetails = async () => {
    if (!receivableId || !provider) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let loadingTimeout: NodeJS.Timeout | null = null;
    
    try {
      // Add timeout safeguard
      loadingTimeout = setTimeout(() => {
        console.warn('⚠️ fetchReceivableDetails taking too long, forcing completion');
        setLoading(false);
        toast({
          title: 'Loading Timeout',
          description: 'Receivable details are taking too long to load. Please try refreshing.',
          variant: 'destructive'
        });
      }, 10000); // 10 second max

      // Use public RPC directly for faster reads (bypasses MetaMask RPC issues)
      const rpcEndpoints = [
        import.meta.env.VITE_RPC_URL,
        'https://sepolia-rollup.arbitrum.io/rpc',
        'https://arbitrum-sepolia-rpc.publicnode.com',
        'https://rpc.ankr.com/arbitrum_sepolia',
      ].filter(Boolean);

      let readOnlyProvider: ethers.Provider | null = null;
      for (const rpcUrl of rpcEndpoints) {
        try {
          readOnlyProvider = new ethers.JsonRpcProvider(rpcUrl);
          // Quick connection test with timeout
          await Promise.race([
            readOnlyProvider.getBlockNumber(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 3000))
          ]);
          console.log(`✅ Connected to public RPC: ${rpcUrl}`);
          break;
        } catch (error) {
          console.warn(`⚠️ Failed to connect to ${rpcUrl}:`, error);
          continue;
        }
      }

      if (!readOnlyProvider) {
        throw new Error('Failed to connect to any RPC endpoint');
      }

      // Initialize service with public RPC for faster reads
      novaxContractService.initialize(null as any, readOnlyProvider);

      console.log('📋 Fetching receivable details for:', receivableId);
      
      // Add timeout to the actual fetch
      const fetchPromise = novaxContractService.getReceivable(receivableId);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch timeout')), 8000)
      );
      
      const rec = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (!rec) {
        throw new Error('Receivable data is empty');
      }
      
      setReceivable({
        receivableId: receivableId,
        importer: rec.importer || '',
        exporter: rec.exporter || '',
        amountUSD: rec.amountUSD || BigInt(0),
        dueDate: Number(rec.dueDate || 0),
        status: Number(rec.status || 0),
        riskScore: rec.riskScore ? Number(rec.riskScore) : undefined,
        apr: rec.apr ? Number(rec.apr) : undefined,
        createdAt: rec.createdAt ? Number(rec.createdAt) : undefined,
        verifiedAt: rec.verifiedAt ? Number(rec.verifiedAt) : undefined,
        metadataCID: rec.metadataCID || undefined,
      });

      console.log('✅ Receivable details loaded:', {
        status: rec.status,
        amount: ethers.formatUnits(rec.amountUSD || 0n, 6),
        exporter: rec.exporter
      });
    } catch (error: any) {
      console.error('Error fetching receivable details:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch receivable details: ${error.message || 'Unknown error'}. Please try refreshing.`,
        variant: 'destructive'
      });
      setReceivable(null); // Clear state on error
    } finally {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReceivableDetails();
    setRefreshing(false);
  };

  const getStatusInfo = (status: number) => {
    switch (status) {
      case 0:
        return { label: 'Pending Verification', icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
      case 1:
        return { label: 'Verified', icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-300' };
      case 2:
        return { label: 'Rejected', icon: XCircle, color: 'bg-red-100 text-red-800 border-red-300' };
      case 3:
        return { label: 'Paid', icon: CheckCircle, color: 'bg-blue-100 text-blue-800 border-blue-300' };
      default:
        return { label: 'Unknown', icon: AlertCircle, color: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr || addr === ethers.ZeroAddress) return 'N/A';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp || timestamp === 0) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading receivable details...</p>
        </div>
      </div>
    );
  }

  if (!receivable) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Receivable Not Found</h2>
          <p className="text-gray-600 mb-6">
            The receivable you're looking for doesn't exist or couldn't be loaded.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/dashboard/admin/receivables')} variant="outline">
              Back to Receivables
            </Button>
            <Button onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo(receivable.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/admin/receivables')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Receivables
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Receivable Details</h1>
              <p className="text-gray-600 font-mono text-sm">{receivable.receivableId}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-4 py-2 rounded-full text-sm font-medium border flex items-center gap-2 ${statusInfo.color}`}>
                <StatusIcon className="w-4 h-4" />
                {statusInfo.label}
              </span>
              <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Amount</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${ethers.formatUnits(receivable.amountUSD, 6)} USDC
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Due Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(receivable.dueDate)}
                  </p>
                </div>
                {receivable.apr && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">APR</p>
                    <p className="text-lg font-semibold text-green-600 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {(receivable.apr / 100).toFixed(2)}%
                    </p>
                  </div>
                )}
                {receivable.riskScore !== undefined && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Risk Score</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {receivable.riskScore}/100
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Parties */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Parties
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Exporter
                  </p>
                  <p className="font-mono text-gray-900">{formatAddress(receivable.exporter)}</p>
                  <a
                    href={`https://sepolia.arbiscan.io/address/${receivable.exporter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mt-1"
                  >
                    View on Arbiscan <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Importer
                  </p>
                  <p className="font-mono text-gray-900">
                    {receivable.importer === ethers.ZeroAddress ? 'Off-chain' : formatAddress(receivable.importer)}
                  </p>
                  {receivable.importer !== ethers.ZeroAddress && (
                    <a
                      href={`https://sepolia.arbiscan.io/address/${receivable.importer}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mt-1"
                    >
                      View on Arbiscan <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timeline
              </h2>
              <div className="space-y-4">
                {receivable.createdAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Created</p>
                      <p className="text-sm text-gray-600">{formatDate(receivable.createdAt)}</p>
                    </div>
                  </div>
                )}
                {receivable.verifiedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Verified</p>
                      <p className="text-sm text-gray-600">{formatDate(receivable.verifiedAt)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-400 mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900">Due Date</p>
                    <p className="text-sm text-gray-600">{formatDate(receivable.dueDate)}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Actions & Metadata */}
          <div className="space-y-6">
            {/* Actions */}
            {(isAmcAdmin || isSuperAdmin || isPlatformAdmin) && receivable.status === 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Actions
                </h2>
                <Button
                  onClick={() => navigate(`/dashboard/admin/receivables?verify=${receivable.receivableId}`)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Verify Receivable
                </Button>
              </Card>
            )}

            {/* Contract Information */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contract Information</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Receivable Factory</p>
                  <a
                    href={`https://sepolia.arbiscan.io/address/${novaxContractAddresses.RECEIVABLE_FACTORY}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-mono flex items-center gap-1"
                  >
                    {formatAddress(novaxContractAddresses.RECEIVABLE_FACTORY)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {receivable.metadataCID && (
                  <div>
                    <p className="text-gray-500 mb-1">Metadata CID</p>
                    <p className="font-mono text-gray-900 break-all">{receivable.metadataCID}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceivableDetailPage;

