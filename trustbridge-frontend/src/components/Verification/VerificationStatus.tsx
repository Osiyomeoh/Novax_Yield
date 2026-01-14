import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../UI/Card';
import { verificationService, VerificationRecord, VerificationStatus } from '../../services/verificationService';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Eye,
  RefreshCw
} from 'lucide-react';

interface VerificationStatusProps {
  assetId: string;
  className?: string;
}

const VerificationStatusComponent: React.FC<VerificationStatusProps> = ({ 
  assetId, 
  className = '' 
}) => {
  const [verificationRecord, setVerificationRecord] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVerificationStatus();
  }, [assetId]);

  const loadVerificationStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if wallet is connected
      if (!window.ethereum) {
        setError('Wallet not connected');
        return;
      }
      
      const record = await verificationService.getVerificationStatus(assetId);
      setVerificationRecord(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verification status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return <CheckCircle className="w-5 h-5 text-primary-blue" />;
      case VerificationStatus.REJECTED:
        return <XCircle className="w-5 h-5 text-red-400" />;
      case VerificationStatus.PENDING:
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case VerificationStatus.EXPIRED:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      case VerificationStatus.REVOKED:
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return 'Verified';
      case VerificationStatus.REJECTED:
        return 'Rejected';
      case VerificationStatus.PENDING:
        return 'Pending';
      case VerificationStatus.EXPIRED:
        return 'Expired';
      case VerificationStatus.REVOKED:
        return 'Revoked';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return 'text-primary-blue bg-primary-blue/10 border-primary-blue/30';
      case VerificationStatus.REJECTED:
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      case VerificationStatus.PENDING:
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case VerificationStatus.EXPIRED:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
      case VerificationStatus.REVOKED:
        return 'text-red-500 bg-red-500/10 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const formatScore = (score: number) => {
    return (score / 100).toFixed(1); // Convert from basis points to percentage
  };

  const formatExpiryDate = (expiresAt: number) => {
    const date = new Date(expiresAt * 1000);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin text-medium-gray" />
        <span className="text-sm text-medium-gray">Loading verification status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <AlertCircle className="w-4 h-4 text-red-400" />
        <span className="text-sm text-red-400">Failed to load status</span>
        <button
          onClick={loadVerificationStatus}
          className="text-xs text-primary-blue hover:text-primary-blue/80 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!verificationRecord) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Clock className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">Not verified</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={className}
    >
      <Card className={`border ${getStatusColor(verificationRecord.status)}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(verificationRecord.status)}
              <div>
                <h4 className="font-semibold text-off-white">
                  {getStatusText(verificationRecord.status)}
                </h4>
                {verificationRecord.verified && (
                  <p className="text-sm text-medium-gray">
                    Score: {formatScore(verificationRecord.score)}%
                  </p>
                )}
              </div>
            </div>
            
            <div className="text-right">
              {verificationRecord.verified && (
                <div className="text-xs text-medium-gray">
                  <p>Expires: {formatExpiryDate(verificationRecord.expiresAt)}</p>
                </div>
              )}
            </div>
          </div>

          {verificationRecord.verified && (
            <div className="mt-3 pt-3 border-t border-medium-gray/30">
              <div className="flex items-center justify-between text-xs text-medium-gray">
                <span>Verification Score</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-2 bg-midnight-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-blue to-primary-blue-light transition-all duration-500"
                      style={{ width: `${formatScore(verificationRecord.score)}%` }}
                    />
                  </div>
                  <span>{formatScore(verificationRecord.score)}%</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default VerificationStatusComponent;