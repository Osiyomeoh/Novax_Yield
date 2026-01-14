import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import Button from '../UI/Button';
import { 
  Plus, 
  Filter, 
  Search, 
  SortAsc, 
  SortDesc,
  Clock,
  CheckCircle,
  X,
  AlertCircle,
  Loader2,
  Shield,
  Eye,
  Copy,
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Calendar,
  User,
  MapPin
} from 'lucide-react';
import { apiService } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import hederaAssetService from '../../services/hederaAssetService';
import axios from 'axios';

interface VerificationRequest {
  id: string;
  assetId?: string;
  assetName: string;
  assetType: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  submittedAt: string;
  completedAt?: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  automatedScore?: number;
  finalScore?: number;
  attestorName?: string;
  attestorNotes?: string;
  documents: number;
  photos: number;
  location: {
    address: string;
    city: string;
    state: string;
  };
}

interface VerificationListProps {
  showCreateButton?: boolean;
  limit?: number;
  showFilters?: boolean;
  statusFilter?: string;
  onVerificationClick?: (verification: VerificationRequest) => void;
}

const VerificationList: React.FC<VerificationListProps> = ({
  showCreateButton = true,
  limit,
  showFilters = true,
  statusFilter,
  onVerificationClick
}) => {
  const { toast } = useToast();
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'priority'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'rejected'>(
    statusFilter as any || 'all'
  );
  const [selectedVerification, setSelectedVerification] = useState<VerificationRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Modal functions
  const openDetailsModal = (verification: VerificationRequest) => {
    setSelectedVerification(verification);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setSelectedVerification(null);
    setShowDetailsModal(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
      variant: "default"
    });
  };

  const openDocument = (hash: string) => {
    window.open(`https://ipfs.io/ipfs/${hash}`, '_blank');
  };

  // Fetch verification requests function from smart contract only
  const fetchVerifications = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching verification requests from smart contract...');
      
      // Get current wallet address
      if (!window.ethereum) {
        console.warn('Wallet not connected');
        setVerifications([]);
        return;
      }

      const provider = new (await import('ethers')).BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      console.log('👤 User address:', userAddress);
      
      // Get verification requests from smart contract
      const smartContractRequests = await hederaAssetService.getSmartContractVerificationRequests(userAddress);
      
      console.log('🔍 Smart contract requests received:', smartContractRequests);
      
      if (smartContractRequests.length === 0) {
        console.log('📝 No verification requests found in smart contract');
        setVerifications([]);
        return;
      }
      
      // Transform smart contract data to match our interface
      const transformedVerifications: VerificationRequest[] = smartContractRequests.map((req: any, index: number) => {
        console.log(`🔄 Transforming request ${index}:`, req);
        
        const statusMap = {
          0: 'pending',      // PENDING
          1: 'completed',    // APPROVED
          2: 'rejected',     // REJECTED
          3: 'cancelled'     // SUSPENDED
        };
        
        const transformed = {
          id: req.requestId || `req-${index}`,
          assetId: req.assetId || 'unknown',
          assetName: req.assetId ? `Asset ${req.assetId.slice(0, 8)}...${req.assetId.slice(-4)}` : 'Unknown Asset',
          assetType: 'Real Estate', // Default type since we know this is a real estate verification
          status: statusMap[req.status] || 'pending',
          submittedAt: req.requestedAt || new Date().toISOString(),
          completedAt: req.status === 1 ? req.requestedAt : undefined, // If approved, use requestedAt as completedAt
          dueDate: req.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium',
          automatedScore: 0,
          finalScore: 0,
          attestorName: req.assignedAttestor !== '0x0000000000000000000000000000000000000000' ? 'Assigned Attestor' : 'Pending Assignment',
          attestorNotes: req.comments || 'Verification request submitted to blockchain',
          documents: req.evidenceHashes?.length || 0,
          photos: 0,
        location: {
            address: 'Asset Location',
            city: 'Unknown',
            state: 'Unknown'
          }
        };
        
        console.log(`✅ Transformed request ${index}:`, transformed);
        return transformed;
      });
      
      console.log('✅ Loaded', transformedVerifications.length, 'verification requests from smart contract');
      setVerifications(transformedVerifications);
      
    } catch (error) {
      console.error('❌ Error fetching verification requests from smart contract:', error);
      setVerifications([]);
      toast({
        title: "Error",
        description: "Failed to load verification requests from blockchain",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch verification requests from smart contract
  useEffect(() => {
    fetchVerifications();
  }, [toast]);

  const filteredVerifications = verifications
    .filter(verification => {
      if (filter !== 'all' && verification.status !== filter) return false;
      if (searchTerm && !verification.assetName.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !verification.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
          break;
        case 'status':
          const statusOrder = { completed: 4, in_progress: 3, pending: 2, rejected: 1, cancelled: 0 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    })
    .slice(0, limit);

  const getStatusCounts = () => {
    const counts = {
      all: verifications.length,
      pending: verifications.filter(v => v.status === 'pending').length,
      in_progress: verifications.filter(v => v.status === 'in_progress').length,
      completed: verifications.filter(v => v.status === 'completed').length,
      rejected: verifications.filter(v => v.status === 'rejected').length
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                <div className="h-2 bg-gray-700 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-4">
        <div className="flex gap-2">
          <Button
            onClick={fetchVerifications}
            variant="outline"
            className="bg-dark-gray hover:bg-medium-gray text-off-white"
          >
            <Loader2 className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {showCreateButton && (
          <Button
            onClick={() => window.location.href = '/verify-asset'}
            className="bg-primary-blue hover:bg-primary-blue-light text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
                Create New Asset
          </Button>
        )}
        </div>
      </div>

      {/* Filters and Search */}
      {showFilters && (
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-off-white/50" />
                  <input
                    type="text"
                    placeholder="Search by asset name or verification ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-dark-gray border border-medium-gray rounded-md text-off-white placeholder:text-off-white/50 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Status Filter */}
              <div className="flex gap-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-3 py-2 bg-dark-gray border border-medium-gray rounded-md text-off-white"
                >
                  <option value="all">All ({statusCounts.all})</option>
                  <option value="pending">Pending ({statusCounts.pending})</option>
                  <option value="in_progress">In Progress ({statusCounts.in_progress})</option>
                  <option value="completed">Completed ({statusCounts.completed})</option>
                  <option value="rejected">Rejected ({statusCounts.rejected})</option>
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 bg-dark-gray border border-medium-gray rounded-md text-off-white"
                >
                  <option value="date">Sort by Date</option>
                  <option value="status">Sort by Status</option>
                  <option value="priority">Sort by Priority</option>
                </select>
                
                <Button
                  variant="outline"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-3"
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification List */}
      <div className="space-y-4">
        {filteredVerifications.length > 0 ? (
          filteredVerifications.map((verification, index) => (
            <motion.div
              key={verification.id || verification._id || `verification-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-off-white">
                          {verification.assetName || 'Unknown Asset'}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                          verification.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                          verification.status === 'completed' ? 'bg-primary-blue/20 text-primary-blue border border-primary-blue/30' :
                          verification.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>
                          {verification.status === 'pending' ? (
                            <>
                              <Clock className="w-3 h-3" />
                              Pending
                            </>
                          ) : verification.status === 'completed' ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Approved
                            </>
                          ) : verification.status === 'rejected' ? (
                            <>
                              <X className="w-3 h-3" />
                              Rejected
                            </>
                          ) : verification.status === 'cancelled' ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              Cancelled
                            </>
                          ) : (
                            'Unknown'
                          )}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-off-white/70">
                        <div>
                          <span className="font-medium">Asset ID:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="font-mono text-xs break-all bg-gray-800/50 px-2 py-1 rounded flex-1">
                              {verification.assetId || 'Unknown'}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(verification.assetId);
                                toast({
                                  title: "Copied!",
                                  description: "Asset ID copied to clipboard",
                                  variant: "default"
                                });
                              }}
                              className="px-2 py-1 h-8 bg-dark-gray hover:bg-medium-gray text-off-white"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Asset Type:</span>
                          <p>{verification.assetType}</p>
                        </div>
                        <div>
                          <span className="font-medium">Submitted:</span>
                          <p>{new Date(verification.submittedAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="font-medium">Due Date:</span>
                          <p>{new Date(verification.dueDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="font-medium">Attestor:</span>
                          <p>{verification.attestorName || 'Not assigned'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Documents:</span>
                          <p>{verification.documents} files uploaded</p>
                        </div>
                      </div>
                      
                      {verification.attestorNotes && (
                        <div className="mt-4 p-3 bg-gray-800/50 rounded-md">
                          <span className="font-medium text-off-white">Notes:</span>
                          <p className="text-off-white/70 text-sm mt-1">{verification.attestorNotes}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetailsModal(verification)}
                        className="bg-dark-gray hover:bg-medium-gray text-off-white"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <Shield className="w-16 h-16 text-off-white/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-off-white mb-2">No Verification Requests</h3>
              <p className="text-off-white/70 mb-6">
                {filter === 'all' 
                  ? "You haven't submitted any asset verification requests yet."
                  : `No ${filter} verification requests found.`
                }
              </p>
              {showCreateButton && (
                <Button
                  onClick={() => window.location.href = '/verify-asset'}
                  className="bg-primary-blue hover:bg-primary-blue-light text-black"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Asset
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Load More Button */}
      {limit && filteredVerifications.length >= limit && (
        <div className="text-center">
          <Button variant="outline" onClick={() => {/* TODO: Load more */}}>
            Load More Verifications
          </Button>
        </div>
      )}

      {/* Verification Details Modal */}
      {showDetailsModal && selectedVerification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-off-white">Verification Details</h2>
                <Button
                  variant="outline"
                  onClick={closeDetailsModal}
                  className="bg-dark-gray hover:bg-medium-gray text-off-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Asset Information */}
                <Card className="bg-gray-800/50">
                  <CardHeader>
                    <CardTitle className="text-off-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary-blue" />
                      Asset Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-off-white/70">Asset Name:</span>
                        <p className="text-off-white">{selectedVerification.assetName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-off-white/70">Asset Type:</span>
                        <p className="text-off-white capitalize">{selectedVerification.assetType}</p>
                      </div>
                      <div>
                        <span className="font-medium text-off-white/70">Asset ID:</span>
                        <div className="flex items-center gap-2">
                          <p className="text-off-white font-mono text-sm break-all">{selectedVerification.assetId}</p>
                          <Button
                            onClick={() => copyToClipboard(selectedVerification.assetId || '')}
                            size="sm"
                            variant="outline"
                            className="px-2 py-1 bg-dark-gray hover:bg-medium-gray text-off-white"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-off-white/70">Status:</span>
                        <div className="flex items-center gap-2">
                          {selectedVerification.status === 'pending' && <Clock className="w-4 h-4 text-yellow-400" />}
                          {selectedVerification.status === 'in_progress' && <Loader2 className="w-4 h-4 text-blue-400" />}
                          {selectedVerification.status === 'completed' && <CheckCircle className="w-4 h-4 text-primary-blue" />}
                          {selectedVerification.status === 'rejected' && <X className="w-4 h-4 text-red-400" />}
                          <span className="text-off-white capitalize">{selectedVerification.status}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Verification Details */}
                <Card className="bg-gray-800/50">
                  <CardHeader>
                    <CardTitle className="text-off-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary-blue" />
                      Verification Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-off-white/70">Submitted:</span>
                        <p className="text-off-white">{new Date(selectedVerification.submittedAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-off-white/70">Due Date:</span>
                        <p className="text-off-white">{new Date(selectedVerification.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-off-white/70">Attestor:</span>
                        <p className="text-off-white">{selectedVerification.attestorName || 'Pending Assignment'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-off-white/70">Priority:</span>
                        <p className="text-off-white capitalize">{selectedVerification.priority}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location */}
                <Card className="bg-gray-800/50">
                  <CardHeader>
                    <CardTitle className="text-off-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary-blue" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-off-white">{selectedVerification.location.address}</p>
                    <p className="text-off-white/70">{selectedVerification.location.city}, {selectedVerification.location.state}</p>
                  </CardContent>
                </Card>

                {/* Documents */}
                <Card className="bg-gray-800/50">
                  <CardHeader>
                    <CardTitle className="text-off-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary-blue" />
                      Documents ({selectedVerification.documents} files)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-off-white/70 mb-4">
                      {selectedVerification.documents} document(s) uploaded for verification
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-dark-gray hover:bg-medium-gray text-off-white"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Documents
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-dark-gray hover:bg-medium-gray text-off-white"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download All
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {selectedVerification.attestorNotes && (
                  <Card className="bg-gray-800/50">
                    <CardHeader>
                      <CardTitle className="text-off-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary-blue" />
                        Attestor Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-off-white">{selectedVerification.attestorNotes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default VerificationList;
