import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import Button from '../UI/Button';
import { Shield, CheckCircle, AlertCircle, Loader2, User, Camera, FileText, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import PersonaKYC from './PersonaKYC';

const KYCVerification: React.FC = () => {
  const { user, startKYC, checkKYCStatus, isLoading, error } = useAuth();
  const { toast } = useToast();
  const [kycStatus, setKycStatus] = useState<'not_started' | 'in_progress' | 'approved' | 'rejected' | 'pending'>('not_started');
  const [showPersonaModal, setShowPersonaModal] = useState(false);

  useEffect(() => {
    if (user?.kycStatus) {
      setKycStatus(user.kycStatus);
    }
  }, [user?.kycStatus]);

  useEffect(() => {
    // Check KYC status periodically if in progress
    if (kycStatus === 'in_progress' && user?.kycInquiryId) {
      const interval = setInterval(() => {
        checkKYCStatus();
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [kycStatus, user?.kycInquiryId, checkKYCStatus]);

  const handleStartKYC = () => {
    setShowPersonaModal(true);
  };

  const handlePersonaComplete = async (inquiryId: string, status: string) => {
    try {
      // Update user with inquiry ID and status
      setKycStatus('in_progress');
      
      // Store inquiry ID for status checking
      localStorage.setItem('kycInquiryId', inquiryId);
      
      // Close the modal
      setShowPersonaModal(false);
      
      // Check status periodically
      const interval = setInterval(async () => {
        try {
          await checkKYCStatus();
          const currentStatus = user?.kycStatus;
          if (currentStatus === 'approved' || currentStatus === 'rejected') {
            clearInterval(interval);
            setKycStatus(currentStatus);
          }
        } catch (err) {
          console.error('Error checking KYC status:', err);
        }
      }, 5000);

      // Clear interval after 10 minutes
      setTimeout(() => clearInterval(interval), 600000);
      
    } catch (err) {
      console.error('Error handling Persona completion:', err);
    }
  };

  const handlePersonaError = (error: string) => {
    toast({
      variant: "destructive",
      title: "Verification Error",
      description: error,
    });
    setShowPersonaModal(false);
  };

  const handlePersonaClose = () => {
    setShowPersonaModal(false);
  };

  const getStatusIcon = () => {
    switch (kycStatus) {
      case 'approved':
        return <CheckCircle className="w-8 h-8 text-primary-blue" />;
      case 'rejected':
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      case 'in_progress':
        return <Loader2 className="w-8 h-8 text-primary-blue-light animate-spin" />;
      default:
        return <Shield className="w-8 h-8 text-primary-blue-light" />;
    }
  };

  const getStatusMessage = () => {
    switch (kycStatus) {
      case 'approved':
        return {
          title: "KYC Verification Complete! ✅",
          description: "Your identity has been successfully verified. You now have full access to all platform features.",
          color: "text-primary-blue"
        };
      case 'rejected':
        return {
          title: "KYC Verification Failed ❌",
          description: "Your identity verification was not successful. Please try again or contact support.",
          color: "text-red-500"
        };
      case 'in_progress':
        return {
          title: "KYC Verification In Progress ⏳",
          description: "Please complete the verification process. We'll automatically check your status.",
          color: "text-primary-blue-light"
        };
      default:
        return {
          title: "Complete KYC Verification 🔐",
          description: "To access all platform features, you need to complete identity verification.",
          color: "text-primary-blue-light"
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="min-h-screen bg-black text-off-white font-secondary relative overflow-hidden dark:bg-black light:bg-light-bg dark:text-off-white light:text-light-text">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(0,255,255,0.05),transparent_50%)]" />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {getStatusIcon()}
              </div>
              <CardTitle className={`text-2xl font-bold ${statusInfo.color}`}>
                {statusInfo.title}
              </CardTitle>
              <p className="text-gray-300 dark:text-gray-300 mt-2">
                {statusInfo.description}
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* KYC Requirements */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white dark:text-white">
                  What you'll need:
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm text-gray-300 dark:text-gray-300">
                    <User className="w-4 h-4 text-primary-blue-light" />
                    <span>Government-issued ID (Passport, Driver's License)</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-300 dark:text-gray-300">
                    <Camera className="w-4 h-4 text-primary-blue-light" />
                    <span>Selfie for liveness verification</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-300 dark:text-gray-300">
                    <FileText className="w-4 h-4 text-primary-blue-light" />
                    <span>Proof of address (if required)</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-300 dark:text-gray-300">
                    <Globe className="w-4 h-4 text-primary-blue-light" />
                    <span>Stable internet connection</span>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {kycStatus === 'not_started' && (
                  <Button
                    onClick={handleStartKYC}
                    disabled={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Starting KYC...
                      </>
                    ) : (
                      'Start KYC Verification'
                    )}
                  </Button>
                )}

                {kycStatus === 'in_progress' && (
                  <div className="space-y-3">
                    <Button
                      onClick={handleStartKYC}
                      className="w-full"
                      size="lg"
                    >
                      Continue Verification
                    </Button>
                    <p className="text-xs text-gray-400 text-center">
                      Complete the verification process. We'll automatically detect when you're done.
                    </p>
                  </div>
                )}

                {kycStatus === 'rejected' && (
                  <Button
                    onClick={handleStartKYC}
                    disabled={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Starting KYC...
                      </>
                    ) : (
                      'Try Again'
                    )}
                  </Button>
                )}

                {kycStatus === 'approved' && (
                  <Button
                    onClick={() => window.location.href = '/dashboard/'}
                    className="w-full"
                    size="lg"
                  >
                    Go to Dashboard
                  </Button>
                )}
              </div>

              {/* Security Notice */}
              <div className="mt-6 p-4 rounded-lg bg-gray-800/50 border border-gray-600/30 dark:bg-gray-800/50 dark:border-gray-600/30">
                <h3 className="text-sm font-semibold text-white dark:text-white mb-2">
                  🔒 Security & Privacy
                </h3>
                <ul className="text-xs text-gray-300 dark:text-gray-300 space-y-1">
                  <li>• Your data is encrypted and securely processed</li>
                  <li>• We use industry-standard verification services</li>
                  <li>• Your information is never shared with third parties</li>
                  <li>• Verification typically takes 2-5 minutes</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Persona KYC Modal */}
      {showPersonaModal && (
        <PersonaKYC
          onComplete={handlePersonaComplete}
          onError={handlePersonaError}
          onClose={handlePersonaClose}
          userInfo={{
            name: user?.name,
            email: user?.email,
            phone: user?.phone,
            country: user?.country,
          }}
        />
      )}
    </div>
  );
};

export default KYCVerification;
