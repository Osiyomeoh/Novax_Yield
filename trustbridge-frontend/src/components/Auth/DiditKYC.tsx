import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import Button from '../UI/Button';
import { Shield, CheckCircle, AlertCircle, Loader2, X, ExternalLink } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import diditService from '../../services/didit';

interface DiditKYCProps {
  onComplete: (sessionId: string, status: string) => void;
  onError: (error: string) => void;
  onClose: () => void;
  userInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    country?: string;
    walletAddress?: string;
  };
}

const DiditKYC: React.FC<DiditKYCProps> = ({
  onComplete,
  onError,
  onClose,
  userInfo = {}
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Initialize verification when component mounts
    initializeVerification();
  }, []);

  const initializeVerification = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Create vendor data from user info
      const vendorData = JSON.stringify({
        walletAddress: userInfo.walletAddress,
        email: userInfo.email,
        name: userInfo.name,
      });

      // Create verification session
      const workflowId = import.meta.env.VITE_DIDIT_WORKFLOW_ID || 'default';
      const session = await diditService.createSession(vendorData, workflowId);
      setVerificationUrl(session.verificationUrl);
      
      // Store session ID in localStorage for callback handling
      localStorage.setItem('didit_session_id', session.sessionId);
      console.log('Stored Didit session ID:', session.sessionId);
      
      toast({
        variant: "success",
        title: "Verification Ready! 🎉",
        description: "Click the button below to start your identity verification.",
      });
    } catch (err) {
      console.error('Didit initialization failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize verification';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartVerification = async () => {
    try {
      setIsVerifying(true);
      setError(null);

      const vendorData = JSON.stringify({
        walletAddress: userInfo.walletAddress,
        email: userInfo.email,
        name: userInfo.name,
      });

      // Use popup method for better UX
      const workflowId = import.meta.env.VITE_DIDIT_WORKFLOW_ID || 'default';
      const result = await diditService.openVerificationPopup(vendorData, workflowId);
      
      // Store session ID in localStorage for callback handling
      localStorage.setItem('didit_session_id', result.sessionId);
      console.log('Stored Didit session ID from popup:', result.sessionId);
      
      if (result.status === 'completed') {
        toast({
          variant: "success",
          title: "Verification Complete! 🎉",
          description: "Your identity has been successfully verified.",
        });
        onComplete(result.sessionId, result.status);
      } else {
        throw new Error('Verification failed or was cancelled');
      }
    } catch (err) {
      console.error('Didit verification failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOpenInNewTab = () => {
    if (verificationUrl) {
      window.open(verificationUrl, '_blank');
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="bg-background-secondary/95 border-border-primary/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-12 h-12 text-error" />
              </div>
              <CardTitle className="text-2xl font-bold text-error">
                Verification Error
              </CardTitle>
              <p className="text-text-secondary mt-2">
                {error}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={initializeVerification}
                className="w-full"
                size="lg"
              >
                Try Again
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <Card className="bg-background-secondary/95 border-border-primary/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-primary-blue-light" />
              <div>
                <CardTitle className="text-xl font-bold text-primary-blue-light">
                  Identity Verification
                </CardTitle>
                <p className="text-sm text-text-secondary">
                  Verify your identity to access all platform features
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 animate-spin text-primary-blue-light mx-auto mb-4" />
                <p className="text-lg text-text-primary">Preparing verification...</p>
                <p className="text-sm text-text-secondary mt-2">
                  Please wait while we set up your verification session
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-blue-light/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-primary-blue-light" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    Ready to Verify Your Identity
                  </h3>
                  <p className="text-text-secondary">
                    Click the button below to start the verification process. 
                    You'll need a valid government-issued ID and a device with a camera.
                  </p>
                </div>

                <div className="bg-background-tertiary/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-text-primary">What you'll need:</h4>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-primary-blue-light" />
                      <span>Valid government-issued ID (passport, driver's license, etc.)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-primary-blue-light" />
                      <span>Device with camera for selfie verification</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-primary-blue-light" />
                      <span>Good lighting and clear image quality</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleStartVerification}
                    disabled={isVerifying}
                    className="flex-1"
                    size="lg"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Start Verification
                      </>
                    )}
                  </Button>
                  
                  {verificationUrl && (
                    <Button
                      onClick={handleOpenInNewTab}
                      variant="outline"
                      className="flex-1"
                      size="lg"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in New Tab
                    </Button>
                  )}
                </div>

                <div className="text-center">
                  <p className="text-xs text-text-tertiary">
                    Verification is powered by Didit and takes 2-5 minutes to complete.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default DiditKYC;
