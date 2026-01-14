import React from 'react';
import { motion } from 'framer-motion';
import Card from '../UI/Card';
import Button from '../UI/Button';
import { 
  MapPin, 
  Calendar, 
  DollarSign, 
  Shield, 
  FileText, 
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { HederaAsset, AssetVerificationStatus } from '../../services/hederaAssetService';

interface AssetCardProps {
  asset: HederaAsset & { verification?: AssetVerificationStatus };
  onViewDetails?: (asset: HederaAsset) => void;
  onRequestVerification?: (asset: HederaAsset) => void;
  className?: string;
}

const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  onViewDetails,
  onRequestVerification,
  className = ''
}) => {
  const getVerificationStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-primary-blue/20 text-primary-blue border-primary-blue/30';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'cancelled':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getVerificationStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getAssetTypeColor = (assetType: string) => {
    switch (assetType.toLowerCase()) {
      case 'real_estate':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'farm_produce':
        return 'bg-primary-blue/20 text-primary-blue border-primary-blue/30';
      case 'farmland':
        return 'bg-primary-blue-light/20 text-primary-blue-light border-primary-blue-light/30';
      case 'vehicle':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M HBAR`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K HBAR`;
    } else {
      return `${value.toFixed(2)} HBAR`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`w-full ${className}`}
    >
      <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-gray-700/50 bg-gradient-to-br from-gray-800/50 to-gray-900/50">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">
              {asset.name}
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAssetTypeColor(asset.assetType)}`}>
                {asset.assetType.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${asset.verification ? getVerificationStatusColor(asset.verification.status) : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                {asset.verification ? getVerificationStatusIcon(asset.verification.status) : <AlertCircle className="w-4 h-4" />}
                {asset.verification ? asset.verification.status.toUpperCase() : 'NOT VERIFIED'}
              </span>
            </div>
          </div>
        </div>

        {/* Asset Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-gray-300">
            <DollarSign className="w-4 h-4 text-primary-blue" />
            <span className="font-medium text-white">{formatValue(asset.valueInHbar)}</span>
          </div>

          {asset.location && (
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span className="truncate">
                {typeof asset.location === 'string' 
                  ? asset.location 
                  : asset.location?.address || `${asset.location?.region || ''}, ${asset.location?.country || ''}`.trim() || 'N/A'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-gray-300">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span>Created {asset.createdAtDate.toLocaleDateString()}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-300">
            <Shield className="w-4 h-4 text-yellow-400" />
            <span>Score: {asset.verificationScore}/100</span>
          </div>

          {asset.evidenceHashes.length > 0 && (
            <div className="flex items-center gap-2 text-gray-300">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>{asset.evidenceHashes.length} evidence files</span>
            </div>
          )}
        </div>

        {/* Verification Details */}
        <div className="bg-gray-700/30 rounded-lg p-3 mb-4">
          <h4 className="text-sm font-medium text-white mb-2">Verification Status</h4>
          {asset.verification ? (
            <div className="space-y-1 text-sm text-gray-300">
              <div>Submitted: {new Date(asset.verification.submittedAt).toLocaleDateString()}</div>
              {asset.verification.completedAt && (
                <div>Completed: {new Date(asset.verification.completedAt).toLocaleDateString()}</div>
              )}
              {asset.verification.attestorName && (
                <div>Attestor: {asset.verification.attestorName}</div>
              )}
              {asset.verification.score && (
                <div>Score: {asset.verification.score}/100</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              This asset has not been submitted for verification yet.
            </div>
          )}
        </div>

        {/* Asset ID */}
        <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
          <div className="text-xs text-gray-400 mb-1">Asset ID</div>
          <div className="text-xs font-mono text-gray-300 break-all">
            {asset.assetId}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => onViewDetails?.(asset)}
            variant="outline"
            className="flex-1 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
          
          {!asset.verification && (
            <Button
              onClick={() => onRequestVerification?.(asset)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Shield className="w-4 h-4 mr-2" />
              Request Verification
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default AssetCard;
