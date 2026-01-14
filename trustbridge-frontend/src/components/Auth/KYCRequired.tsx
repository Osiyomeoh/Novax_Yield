import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import Button from '../UI/Button';
import { Shield, Lock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface KYCRequiredProps {
  onStartKYC: () => void;
}

const KYCRequired: React.FC<KYCRequiredProps> = ({ onStartKYC }) => {
  const { user } = useAuth();

  const getKYCStatusMessage = () => {
    switch (user?.kycStatus) {
      case 'not_started':
        return {
          title: "KYC Verification Required",
          description: "Complete identity verification to access all platform features and start investing.",
          icon: Shield,
          color: "text-primary-blue-light"
        };
      case 'pending':
        return {
          title: "KYC Verification Pending",
          description: "Your identity verification is being reviewed. This usually takes 2-5 minutes.",
          icon: Lock,
          color: "text-yellow-400"
        };
      case 'in_progress':
        return {
          title: "KYC Verification In Progress",
          description: "Please complete the verification process to continue.",
          icon: Lock,
          color: "text-blue-400"
        };
      case 'rejected':
        return {
          title: "KYC Verification Failed",
          description: "Your identity verification was not successful. Please try again.",
          icon: AlertTriangle,
          color: "text-red-400"
        };
      default:
        return {
          title: "KYC Verification Required",
          description: "Complete identity verification to access all platform features.",
          icon: Shield,
          color: "text-primary-blue-light"
        };
    }
  };

  const statusInfo = getKYCStatusMessage();
  const IconComponent = statusInfo.icon;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="bg-gray-900/95 border-gray-700/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <IconComponent className={`w-12 h-12 ${statusInfo.color}`} />
            </div>
            <CardTitle className={`text-2xl font-bold ${statusInfo.color}`}>
              {statusInfo.title}
            </CardTitle>
            <p className="text-gray-300 dark:text-gray-300 mt-2">
              {statusInfo.description}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Features that require KYC */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white dark:text-white">
                Features requiring KYC:
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-3 text-sm text-gray-300 dark:text-gray-300">
                  <div className="w-2 h-2 bg-primary-blue-light rounded-full" />
                  <span>Invest in tokenized assets</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-300 dark:text-gray-300">
                  <div className="w-2 h-2 bg-primary-blue-light rounded-full" />
                  <span>Create and manage portfolios</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-300 dark:text-gray-300">
                  <div className="w-2 h-2 bg-primary-blue-light rounded-full" />
                  <span>Access advanced analytics</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-300 dark:text-gray-300">
                  <div className="w-2 h-2 bg-primary-blue-light rounded-full" />
                  <span>Withdraw funds</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={onStartKYC}
                className="w-full"
                size="lg"
              >
                {user?.kycStatus === 'rejected' ? 'Try KYC Again' : 'Start KYC Verification'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.href = '/auth'}
                className="w-full"
              >
                Back to Authentication
              </Button>
            </div>

            {/* Security Notice */}
            <div className="mt-6 p-4 rounded-lg bg-gray-800/50 border border-gray-600/30">
              <h3 className="text-sm font-semibold text-white dark:text-white mb-2">
                🔒 Why KYC is Required
              </h3>
              <ul className="text-xs text-gray-300 dark:text-gray-300 space-y-1">
                <li>• Regulatory compliance for financial services</li>
                <li>• Protection against fraud and money laundering</li>
                <li>• Secure platform for all users</li>
                <li>• Required for asset tokenization and trading</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default KYCRequired;
