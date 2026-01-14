import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import Button from '../UI/Button';
import { useToast } from '../../hooks/useToast';
import { verificationService, VerificationRequest, VerificationStatus } from '../../services/verificationService';
import hederaAssetService from '../../services/hederaAssetService';
import { useWallet } from '../../contexts/WalletContext';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Eye,
  AlertCircle,
  TrendingUp,
  User,
  Calendar,
  DollarSign
} from 'lucide-react';

const VerificationDashboard: React.FC = () => {
  const { toast } = useToast();
  const { isConnected, address } = useWallet();
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [assetDetails, setAssetDetails] = useState<any>(null);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadVerificationRequests();
  }, []);

  const loadVerificationRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch verification requests from smart contract
      const verifications = await verificationService.getSmartContractVerifications();
      
      setVerificationRequests(verifications);
    } catch (error) {
      console.error('Failed to load verification requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load verification requests from smart contract',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAssetDetails = async (assetId: string) => {
    try {
      console.log('Loading asset details for assetId:', assetId);
      const details = await hederaAssetService.getAssetDetails(assetId);
      console.log('Asset details loaded:', details);
      setAssetDetails(details);
    } catch (error) {
      console.error('Failed to load asset details:', error);
      setAssetDetails(null);
    }
  };

  const handleReviewRequest = async (request: VerificationRequest) => {
    console.log('🔍 Review request clicked:', request);
    console.log('🔍 Setting selectedRequest to:', request);
    setSelectedRequest(request);
    console.log('🔍 Loading asset details for assetId:', request.assetId);
    await loadAssetDetails(request.assetId);
    console.log('🔍 Modal should now be visible');
  };

  const handleApproveVerification = async (requestId: string) => {
    if (!isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to complete verification',
        type: 'error'
      });
      return;
    }

    try {
      setProcessing(requestId);
      const result = await verificationService.completeVerification(requestId, true, comments);
      
      if (result.success) {
        toast({
          title: 'Verification Approved!',
          description: 'Asset verification has been approved',
          type: 'success'
        });
        loadVerificationRequests();
        setSelectedRequest(null);
        setComments('');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Verification approval failed:', error);
      toast({
        title: 'Approval Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error'
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectVerification = async (requestId: string) => {
    if (!isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to complete verification',
        type: 'error'
      });
      return;
    }

    try {
      setProcessing(requestId);
      const result = await verificationService.completeVerification(requestId, false, comments);
      
      if (result.success) {
        toast({
          title: 'Verification Rejected',
          description: 'Asset verification has been rejected',
          type: 'info'
        });
        loadVerificationRequests();
        setSelectedRequest(null);
        setComments('');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Verification rejection failed:', error);
      toast({
        title: 'Rejection Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error'
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.PENDING:
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case VerificationStatus.APPROVED:
        return <CheckCircle className="w-4 h-4 text-primary-blue" />;
      case VerificationStatus.REJECTED:
        return <XCircle className="w-4 h-4 text-red-400" />;
      case VerificationStatus.EXPIRED:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.PENDING:
        return 'Pending';
      case VerificationStatus.APPROVED:
        return 'Verified';
      case VerificationStatus.REJECTED:
        return 'Rejected';
      case VerificationStatus.EXPIRED:
        return 'Expired';
      default:
        return 'Unknown';
    }
  };

  const getAttestorTypeText = (type: number) => {
    const types = [
      'Legal Expert',
      'Financial Auditor',
      'Technical Specialist',
      'Real Estate Appraiser',
      'Agricultural Expert',
      'Art Appraiser',
      'Vehicle Inspector',
      'Business Valuator'
    ];
    return types[type] || 'Unknown';
  };

  const formatTimeRemaining = (deadline: number) => {
    const now = Date.now();
    const remaining = deadline - now;
    
    if (remaining <= 0) return 'Expired';
    
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Verification Dashboard</h2>
        <p className="text-gray-400">
          Review and verify tokenized assets
        </p>
        <button 
          onClick={loadVerificationRequests}
          className="mt-4 px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-primary-blue"
        >
          🔄 Refresh Verification Requests
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Requests</p>
                <p className="text-2xl font-bold text-white">
                  {verificationRequests.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Completed Today</p>
                <p className="text-2xl font-bold text-white">
                  {verificationRequests.filter(r => r.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-primary-blue" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Earnings</p>
                <p className="text-2xl font-bold text-white">
                  {verificationRequests
                    .filter(r => r.status === 'approved')
                    .reduce((sum, r) => sum + parseFloat(r.fee || '0'), 0)
                    .toFixed(2)} TRUST
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-primary-blue" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification Requests */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white">Verification Requests</h3>
        
        {verificationRequests.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Verification Requests</h3>
              <p className="text-gray-400">
                You don't have any pending verification requests at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {verificationRequests.map((request) => (
              <motion.div
                key={request.requestId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className="bg-gray-800 border-gray-700 hover:border-primary-blue/50 transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(request.status)}
                        <div>
                          <h4 className="font-semibold text-white">
                            Asset Verification Request
                          </h4>
                          <p className="text-sm text-gray-400">
                            {getAttestorTypeText(request.requiredType)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Fee</p>
                        <p className="text-lg font-bold text-primary-blue">
                          {parseFloat(request.fee || '0').toFixed(2)} TRUST
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">
                          Owner: {request.owner.slice(0, 6)}...{request.owner.slice(-4)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">
                          {formatTimeRemaining(request.deadline)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">
                          {request.evidenceHashes.length} documents
                        </span>
                      </div>
                    </div>

                    {/* Status indicator */}
                    <div className="mb-4 p-2 bg-gray-700 rounded text-xs">
                      <p className="text-gray-300">
                        Status: {request.status === 'pending' ? 'PENDING' : 
                                request.status === 'approved' ? 'APPROVED' :
                                request.status === 'rejected' ? 'REJECTED' : 'SUSPENDED'}
                        {request.status === 'pending' ? ' (Can be approved)' : ' (Already processed)'}
                      </p>
                    </div>

                    {/* Action buttons - different for different statuses */}
                    {request.status === 'pending' ? (
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleReviewRequest(request)}
                          variant="outline"
                          className="flex-1 border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Review Details
                        </Button>
                        <Button
                          onClick={() => handleApproveVerification(request.requestId)}
                          disabled={processing === request.requestId}
                          className="flex-1 bg-primary-blue hover:bg-primary-blue text-white"
                        >
                          {processing === request.requestId ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleRejectVerification(request.requestId)}
                          disabled={processing === request.requestId}
                          variant="outline"
                          className="flex-1 border-red-400/30 text-red-400 hover:bg-red-400/10"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-3 bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-2">
                          {request.status === 'approved' ? (
                            <>
                              <CheckCircle className="w-5 h-5 text-primary-blue" />
                              <span className="text-primary-blue font-medium">Already Approved</span>
                            </>
                          ) : request.status === 'rejected' ? (
                            <>
                              <XCircle className="w-5 h-5 text-red-400" />
                              <span className="text-red-400 font-medium">Rejected</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-5 h-5 text-yellow-400" />
                              <span className="text-yellow-400 font-medium">Suspended</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          {console.log('🎯 Modal is rendering, selectedRequest:', selectedRequest)}
          <Card className="bg-gray-800 border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Review Verification Request</CardTitle>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Asset Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Asset ID
                  </label>
                  <p className="text-sm text-gray-400 font-mono break-all">{selectedRequest.assetId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Required Attestor Type
                  </label>
                  <p className="text-sm text-gray-400">
                    {getAttestorTypeText(selectedRequest.requiredType)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Asset Owner
                  </label>
                  <p className="text-sm text-gray-400 font-mono">{selectedRequest.owner}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Verification Fee
                  </label>
                  <p className="text-sm text-primary-blue font-semibold">
                    {parseFloat(selectedRequest.fee || '0').toFixed(2)} TRUST
                  </p>
                </div>
              </div>

              {/* Asset Details */}
              {assetDetails && (
                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-lg font-semibold text-white mb-4">Asset Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Asset Name
                      </label>
                      <p className="text-sm text-gray-400">{assetDetails.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Asset Type
                      </label>
                      <p className="text-sm text-gray-400">{assetDetails.assetType || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Category
                      </label>
                      <p className="text-sm text-gray-400">{assetDetails.category || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Value
                      </label>
                      <p className="text-sm text-gray-400">{assetDetails.value || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Description
                      </label>
                      <p className="text-sm text-gray-400">{assetDetails.description || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Evidence Documents */}
              <div className="border-t border-gray-700 pt-6">
                <h4 className="text-lg font-semibold text-white mb-4">Evidence Documents</h4>
                <div className="space-y-3">
                  {selectedRequest.evidenceHashes.map((hash, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-midnight-800 rounded-lg border border-gray-700">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-primary-blue" />
                        <div>
                          <span className="text-sm font-medium text-white">
                            {selectedRequest.documentTypes[index] || 'Document'}
                          </span>
                          <p className="text-xs text-gray-400 font-mono">
                            {hash.slice(0, 12)}...{hash.slice(-12)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Check if it's a real IPFS hash or placeholder
                          if (hash.startsWith('Qm') || hash.startsWith('bafy')) {
                            // Real IPFS hash
                            window.open(`https://ipfs.io/ipfs/${hash}`, '_blank');
                          } else {
                            // Placeholder or other format
                            console.log('Document hash is not a valid IPFS hash:', hash);
                            alert('Document not available - invalid IPFS hash: ' + hash);
                          }
                        }}
                        className="border-primary-blue/30 text-primary-blue hover:bg-primary-blue/10"
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div className="border-t border-gray-700 pt-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Verification Comments
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add your verification comments and findings..."
                  className="w-full px-3 py-2 bg-midnight-800 border border-gray-700 rounded-lg text-white placeholder-medium-gray focus:border-primary-blue focus:outline-none resize-none"
                  rows={4}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-700">
                <Button
                  onClick={() => {
                    setSelectedRequest(null);
                    setAssetDetails(null);
                    setComments('');
                  }}
                  variant="outline"
                  className="flex-1 border-gray-700 text-gray-400 hover:bg-medium-gray/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleRejectVerification(selectedRequest.requestId)}
                  disabled={processing === selectedRequest.requestId}
                  variant="outline"
                  className="flex-1 border-red-400/30 text-red-400 hover:bg-red-400/10"
                >
                  {processing === selectedRequest.requestId ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400 mr-2"></div>
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Reject
                </Button>
                <Button
                  onClick={() => handleApproveVerification(selectedRequest.requestId)}
                  disabled={processing === selectedRequest.requestId}
                  className="flex-1 bg-primary-blue hover:bg-primary-blue text-white"
                >
                  {processing === selectedRequest.requestId ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VerificationDashboard;
