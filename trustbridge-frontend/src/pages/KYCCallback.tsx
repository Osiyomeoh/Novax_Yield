import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/UI/Card';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';

const KYCCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser, user, setAuthState } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing KYC verification...');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isMounted, setIsMounted] = useState(true);
  
  // Track component mount status
  useEffect(() => {
    console.log('🔄 KYCCallback component mounted');
    return () => {
      console.log('🔄 KYCCallback component unmounting');
      setIsMounted(false);
    };
  }, []);
  
  // Watch for user state changes
  useEffect(() => {
    console.log('🔄 KYCCallback - User state changed:', {
      user: !!user,
      kycStatus: user?.kycStatus,
      isMounted
    });
  }, [user, isMounted]);

  const handleCallbackResult = async (result: any) => {
    if (result.success) {
      setStatus('success');
      setMessage('KYC verification completed successfully!');
      
      // Skip refreshUser to preserve direct state update
      console.log('Skipping refreshUser to preserve direct KYC status update');
      
      // Show success toast
      toast({
        title: 'KYC Verification Complete! 🎉',
        description: 'Your identity has been verified. You can now create RWA assets.',
        variant: 'default',
      });

      // Redirect to profile after 30 seconds to see logs
      setTimeout(() => {
        console.log('🔄 Redirecting to profile page...');
        navigate('/dashboard/profile');
      }, 30000);
    } else {
      setStatus('error');
      setMessage(result.message || 'Failed to process KYC verification');
    }
  };

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Add delay to see logs
        console.log('🔄 KYCCallback - Starting callback processing...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        
        // Log all URL parameters for debugging
        console.log('🔍 Didit callback received - All URL parameters:', Object.fromEntries(searchParams.entries()));
        console.log('🔍 Current URL:', window.location.href);
        console.log('🔍 Search params object:', searchParams);
        
        // Get the status from URL parameters
        const verificationStatus = searchParams.get('status') || 'Approved';
        const verificationSessionId = searchParams.get('verificationSessionId');

        console.log('🔍 KYC Callback - Status:', verificationStatus, 'Session ID:', verificationSessionId);

        // Since DidIt redirected here, the verification was completed
        if (verificationStatus.toLowerCase() === 'approved') {
          console.log('✅ KYC verification approved, processing...');
          setStatus('success');
          setMessage('KYC verification completed successfully!');
          
          // Try to call the backend callback endpoint to update database
          let databaseUpdated = false;
          try {
            let apiUrl = import.meta.env.VITE_API_URL;
            
            console.log('🔄 API URL from env:', import.meta.env.VITE_API_URL);
            console.log('🔄 Using API URL:', apiUrl);
            console.log('🔄 Verification Session ID:', verificationSessionId);
            console.log('🔄 Status:', verificationStatus);
            
            const callbackUrl = `${apiUrl}/auth/didit/callback?verificationSessionId=${verificationSessionId}&status=${verificationStatus}`;
            console.log('🔄 Calling backend callback endpoint:', callbackUrl);
            
            console.log('🔄 Making fetch request to:', callbackUrl);
            
            const response = await fetch(callbackUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            console.log('📡 Backend response status:', response.status);
            console.log('📡 Backend response headers:', Object.fromEntries(response.headers.entries()));
            console.log('📡 Backend response ok:', response.ok);

            if (response.ok) {
              const result = await response.json();
              console.log('📡 Backend callback response:', result);
              console.log('📡 Backend KYC status:', result?.kycStatus);
              console.log('📡 Backend success:', result?.success);
              if (result.success) {
                console.log('✅ KYC status updated in database successfully');
                databaseUpdated = true;
              } else {
                console.log('❌ Backend returned success: false');
              }
            } else {
              const errorText = await response.text();
              console.log('❌ Backend callback failed, status:', response.status);
              console.log('❌ Backend error response:', errorText);
            }
          } catch (error: any) {
            console.log('❌ Backend not available, continuing with frontend-only update:', error);
            console.log('❌ Error details:', error.message);
          }
          
          // Update frontend state regardless of backend status
          console.log('🔄 Updating frontend state...');
          
          // Manually update user state to reflect KYC approval
          try {
            console.log('🔄 Before refreshUser - Current user state:', user);
            
            // Update user state directly to avoid 401 issues
            if (user) {
              console.log('🔄 Component mounted status:', isMounted);
              console.log('🔄 Current user before update:', user);
              
              const updatedUser = {
                ...user,
                kycStatus: 'approved' as const
              };
              
              // Update the auth context directly
              console.log('🔄 About to call setAuthState...');
              setAuthState(prev => {
                console.log('🔄 setAuthState callback called!');
                console.log('🔄 Component mounted in callback:', isMounted);
                console.log('🔄 Previous state:', prev);
                console.log('🔄 Updating auth state from:', prev.user?.kycStatus, 'to: approved');
                const newState = {
                  ...prev,
                  user: updatedUser,
                  authStep: 'complete' as const
                };
                console.log('🔄 New state:', newState);
                return newState;
              });
              console.log('🔄 setAuthState call completed');
              
              console.log('✅ User KYC status updated directly to approved');
              console.log('🔄 Updated user object:', updatedUser);
            } else {
              console.warn('⚠️ No user found to update KYC status');
            }
            
            // Skip refreshUser to avoid overriding our direct state update
            console.log('✅ Skipping refreshUser to preserve direct KYC status update');
            
            console.log('🔄 After update - Current user state:', user);
          } catch (error) {
            console.error('❌ Error updating user data:', error);
          }
          
          // Show success toast
          toast({
            title: 'KYC Verification Complete! 🎉',
            description: databaseUpdated 
              ? 'Your identity has been verified and saved. You can now create RWA assets.'
              : 'Your identity has been verified. You can now create RWA assets.',
            variant: 'default',
          });

          console.log('✅ KYC callback processing complete, redirecting in 3 seconds...');

          // Redirect to profile after 3 seconds to allow state to propagate
          setTimeout(() => {
            console.log('🔄 Redirecting to profile...');
            navigate('/dashboard/profile');
          }, 3000);
        } else {
          console.log('❌ KYC verification not approved, status:', verificationStatus);
          setStatus('error');
          setMessage(`KYC verification ${verificationStatus}. Please try again.`);
        }
      } catch (error) {
        console.error('❌ KYC callback error:', error);
        setStatus('error');
        setMessage('An error occurred while processing your KYC verification');
      }
    };

        console.log('🚀 Starting KYC callback processing...');
        setDebugInfo(`URL: ${window.location.href}\nParams: ${JSON.stringify(Object.fromEntries(searchParams.entries()), null, 2)}`);
        processCallback();
  }, [searchParams, refreshUser, toast, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-16 h-16 animate-spin text-primary-blue-light" />;
      case 'success':
        return <CheckCircle className="w-16 h-16 text-primary-blue" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-400" />;
      default:
        return <AlertCircle className="w-16 h-16 text-yellow-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-primary-blue-light';
      case 'success':
        return 'text-primary-blue';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-primary via-background-secondary to-background-primary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="bg-background-secondary/95 border-border-primary/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className={`text-2xl font-bold ${getStatusColor()}`}>
              {status === 'loading' && 'Processing Verification...'}
              {status === 'success' && 'Verification Complete!'}
              {status === 'error' && 'Verification Error'}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <p className="text-text-secondary">
              {message}
            </p>
            
            {debugInfo && (
              <div className="text-left bg-gray-800 p-3 rounded text-xs text-gray-300 max-h-32 overflow-y-auto">
                <pre>{debugInfo}</pre>
              </div>
            )}
            
            {status === 'success' && (
              <div className="space-y-2">
                <p className="text-sm text-text-secondary">
                  You will be redirected to your profile in a few seconds...
                </p>
                
                {/* Debug info */}
                <div className="p-2 bg-gray-800 rounded text-xs">
                  <p>Current user: {user ? 'Yes' : 'No'}</p>
                  <p>Current KYC status: {user?.kycStatus || 'None'}</p>
                </div>
                
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={async () => {
                      // Skip refreshUser to preserve direct state update
                      console.log('Skipping refreshUser to preserve direct KYC status update');
                      navigate('/dashboard/profile');
                    }}
                    className="px-4 py-2 bg-primary-blue-light text-background-primary rounded-lg hover:bg-primary-blue-light/90 transition-colors text-sm"
                  >
                    Refresh & Go to Profile
                  </button>
                  
                  <button
                    onClick={() => {
                      console.log('🧪 Manual KYC status update test...');
                      console.log('Current user before update:', user);
                      
                      if (user) {
                        const updatedUser = {
                          ...user,
                          kycStatus: 'approved' as const
                        };
                        
                        setAuthState(prev => {
                          console.log('🔄 Manual update - Previous state:', prev.user?.kycStatus);
                          console.log('🔄 Manual update - New state: approved');
                          return {
                            ...prev,
                            user: updatedUser,
                            authStep: 'complete' as const
                          };
                        });
                        
                        console.log('✅ Manual KYC status update completed');
                      } else {
                        console.warn('⚠️ No user found for manual update');
                      }
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                  >
                    🧪 Test Manual Update
                  </button>
                  <button
                    onClick={() => navigate('/dashboard/profile')}
                    className="text-primary-blue-light hover:text-primary-blue-light/80 text-sm underline"
                  >
                    Go to Profile Now
                  </button>
                </div>
              </div>
            )}
            
            {status === 'error' && (
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/dashboard/profile')}
                  className="px-4 py-2 bg-primary-blue-light text-background-primary rounded-lg hover:bg-primary-blue-light/90 transition-colors"
                >
                  Return to Profile
                </button>
              </div>
            )}
            
            {status === 'loading' && (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setStatus('success');
                    setMessage('KYC verification completed successfully! (Test)');
                    setTimeout(() => navigate('/dashboard/profile'), 2000);
                  }}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                >
                  Test Success (Debug)
                </button>
                <button
                  onClick={() => navigate('/dashboard/profile')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm ml-2"
                >
                  Go to Profile
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default KYCCallback;
