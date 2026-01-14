import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import Button from '../UI/Button';
import { Shield, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

// Extend Window interface to include Persona
declare global {
  interface Window {
    Persona: any;
  }
}

interface PersonaKYCProps {
  onComplete: (inquiryId: string, status: string) => void;
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

const PersonaKYC: React.FC<PersonaKYCProps> = ({
  onComplete,
  onError,
  onClose,
  userInfo = {}
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const personaClientRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializePersona = () => {
      if (!window.Persona) {
        setError('Persona SDK not loaded. Please refresh the page and try again.');
        setIsLoading(false);
        return;
      }

      try {
        // Persona configuration
        const config = {
          templateId: import.meta.env.VITE_PERSONA_TEMPLATE_ID || 'itmpl_JUTP3pzNYp3qoQVpdSnE5hJNWK5V',
          environmentId: import.meta.env.VITE_PERSONA_ENVIRONMENT_ID || 'env_1A7HyCVaTXjfPJor2ZdXjHdJHdJK',
          onReady: () => {
            console.log('Persona client ready');
            setIsLoading(false);
          },
          onComplete: ({ inquiryId, status, fields }: any) => {
            console.log(`Persona KYC completed: ${inquiryId} with status ${status}`);
            toast({
              variant: "success",
              title: "KYC Verification Complete! 🎉",
              description: `Your identity verification has been completed successfully.`,
            });
            onComplete(inquiryId, status);
          },
          onCancel: () => {
            console.log('Persona KYC cancelled');
            onClose();
          },
          onError: (error: any) => {
            console.error('Persona KYC error:', error);
            const errorMessage = error?.message || 'An error occurred during verification';
            setError(errorMessage);
            onError(errorMessage);
          },
          // Pre-fill user information if available
          fields: userInfo.name ? {
            'name-first': userInfo.name.split(' ')[0] || '',
            'name-last': userInfo.name.split(' ').slice(1).join(' ') || '',
            'email-address': userInfo.email || '',
            'phone-number': userInfo.phone || '',
            'address-country-code': getCountryCode(userInfo.country || ''),
          } : undefined,
          // Add reference_id for webhook matching
          referenceId: userInfo.walletAddress || '',
        };

        // Create Persona client
        personaClientRef.current = new window.Persona.Client(config);
        
        // Open the verification flow
        personaClientRef.current.open();
      } catch (err) {
        console.error('Failed to initialize Persona:', err);
        setError('Failed to initialize verification. Please try again.');
        setIsLoading(false);
      }
    };

    // Wait for Persona script to load
    if (window.Persona) {
      initializePersona();
    } else {
      // Wait for script to load
      const checkPersona = setInterval(() => {
        if (window.Persona) {
          clearInterval(checkPersona);
          initializePersona();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkPersona);
        if (!window.Persona) {
          setError('Persona SDK failed to load. Please refresh the page and try again.');
          setIsLoading(false);
        }
      }, 10000);
    }

    // Cleanup
    return () => {
      if (personaClientRef.current) {
        try {
          personaClientRef.current.destroy();
        } catch (err) {
          console.warn('Error destroying Persona client:', err);
        }
      }
    };
  }, [userInfo, onComplete, onError, onClose, toast]);

  const getCountryCode = (country: string): string => {
    const countryMap: { [key: string]: string } = {
      'Nigeria': 'NG',
      'Ghana': 'GH',
      'Kenya': 'KE',
      'South Africa': 'ZA',
      'United States': 'US',
      'United Kingdom': 'GB',
      'Canada': 'CA',
      'Australia': 'AU',
    };
    
    return countryMap[country] || 'NG'; // Default to Nigeria
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
                onClick={onClose}
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
        className="w-full max-w-4xl h-[80vh]"
      >
        <Card className="bg-background-secondary/95 border-border-primary/50 backdrop-blur-sm h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-primary-blue-light" />
              <div>
                <CardTitle className="text-xl font-bold text-primary-blue-light">
                  Identity Verification
                </CardTitle>
                <p className="text-sm text-text-secondary">
                  Complete your KYC verification to access all features
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
          
          <CardContent className="flex-1 flex items-center justify-center">
            {isLoading ? (
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary-blue-light mx-auto mb-4" />
                <p className="text-lg text-text-primary">Loading verification...</p>
                <p className="text-sm text-text-secondary mt-2">
                  Please wait while we prepare your verification experience
                </p>
              </div>
            ) : (
              <div className="w-full h-full">
                <div 
                  ref={containerRef}
                  className="w-full h-full min-h-[500px]"
                  id="persona-verification-container"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PersonaKYC;
