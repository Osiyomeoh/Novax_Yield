import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, CheckCircle, AlertCircle, Loader2, Wallet, ArrowLeft } from 'lucide-react';
import Button from '../UI/Button';
import Input from '../UI/Input';
import Breadcrumb from '../UI/Breadcrumb';
import ProgressIndicator from '../UI/ProgressIndicator';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { useToast } from '../../hooks/useToast';
import { apiService } from '../../services/api';

const ProfileCompletion: React.FC = () => {
  const { completeProfile, verifyEmail, isLoading, error, user, authStep } = useAuth();
  const { address: walletAddress, walletType } = useWallet();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    country: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailChecked, setEmailChecked] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'verify-email'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Redirect verified users to dashboard or go to verification step
  useEffect(() => {
    console.log('ProfileCompletion - Component mounted, checking auth state:', {
      user: !!user,
      userEmail: user?.email,
      userEmailVerification: user?.emailVerificationStatus,
      authStep,
      walletAddress: walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : null,
      walletType
    });
    
    if (user && (user.emailVerificationStatus === 'VERIFIED' || user.emailVerificationStatus === 'verified')) {
      console.log('ProfileCompletion - User already verified, redirecting to dashboard');
      window.location.href = '/dashboard/';
    } else if (user && user.email && user.emailVerificationStatus && user.emailVerificationStatus !== 'VERIFIED' && user.emailVerificationStatus !== 'verified') {
      // User has a profile but needs email verification
      console.log('ProfileCompletion - User needs email verification, going to verification step');
      setStep('verify-email');
    }
  }, [user, authStep, walletAddress, walletType]);

  // Show loading screen while checking user status
  if (authStep === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-midnight-900 via-midnight-800 to-midnight-900">
        <div className="text-center">
          <div className="relative mb-8">
            {/* Animated TrustBridge Logo */}
            <div className="w-24 h-24 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-blue to-primary-blue-light rounded-2xl animate-pulse"></div>
              <div className="absolute inset-2 bg-midnight-900 rounded-xl flex items-center justify-center">
                <span className="text-3xl font-bold text-primary-blue">🌍</span>
              </div>
            </div>
            
            {/* Animated Loading Spinner */}
            <div className="relative">
              <div className="w-16 h-16 border-4 border-midnight-700 border-t-primary-blue rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-primary-blue-light rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
          </div>
          
          {/* Loading Text */}
          <h2 className="text-2xl font-bold text-off-white mb-4">
            TrustBridge
          </h2>
          <p className="text-lg text-midnight-300 mb-2">
            Universal Asset Protocol for Africa
          </p>
          <p className="text-midnight-400 mb-8">
            {authStep === 'complete' ? 'Redirecting to dashboard...' : 'Checking your account status...'}
          </p>
          
          {/* Loading Steps */}
          <div className="space-y-3 text-left max-w-md mx-auto">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-primary-blue rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-midnight-900" />
              </div>
              <span className="text-midnight-300">Wallet Connected</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-primary-blue rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-midnight-900" />
              </div>
              <span className="text-midnight-300">Verifying Account</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-primary-blue rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-primary-blue rounded-full animate-pulse"></div>
              </div>
              <span className="text-midnight-300">Preparing Dashboard</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const checkEmailAvailability = async (email: string) => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return;
    }

    setIsCheckingEmail(true);
    try {
      const response = await apiService.checkEmailUser(email);
      
      if (response.success && response.data) {
        // Email is already taken by another user
        setValidationErrors(prev => ({
          ...prev,
          email: 'This email is already registered to another account. Please use a different email address.'
        }));
        setEmailChecked(null);
      } else {
        // Email is available
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          if (newErrors.email === 'This email is already registered to another account. Please use a different email address.') {
            delete newErrors.email;
          }
          return newErrors;
        });
        setEmailChecked(email);
      }
    } catch (error) {
      console.error('Error checking email availability:', error);
      setValidationErrors(prev => ({
        ...prev,
        email: 'Unable to verify email availability. Please try again.'
      }));
      setEmailChecked(null);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    } else if (emailChecked !== formData.email) {
      errors.email = 'Please wait for email verification to complete';
    }

    if (!formData.name) {
      errors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (formData.phone && !/^\+?[\d\s-()]+$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await completeProfile(formData);
      setStep('verify-email');
    } catch (error) {
      console.error('Profile completion failed:', error);
      
      // Check if user exists and has email verification status
      // If so, go to verification step instead of staying on form
      if (user && user.email && user.emailVerificationStatus) {
        setStep('verify-email');
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Check email availability when email changes
    if (field === 'email') {
      // Debounce email checking
      const timeoutId = setTimeout(() => {
        checkEmailAvailability(value);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setValidationErrors({ verification: 'Please enter a 6-digit verification code' });
      return;
    }

    setIsVerifying(true);
    try {
      await verifyEmail(verificationCode);
      window.location.href = '/dashboard/';
    } catch (error) {
      console.error('Email verification failed:', error);
      setValidationErrors({ verification: 'Invalid verification code. Please try again.' });
      // Stay on verification step - don't go back to form
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    try {
      // Use user email if available, otherwise fall back to formData email
      const emailToUse = user?.email || formData.email;
      console.log('Resending verification code for email:', emailToUse);
      console.log('User email:', user?.email);
      console.log('FormData email:', formData.email);
      
      if (!emailToUse) {
        throw new Error('No email address available for resending verification code');
      }
      
      const response = await apiService.resendVerification(emailToUse);
      console.log('Resend verification response:', response);
      toast({
        title: 'Code Resent',
        description: 'A new verification code has been sent to your email.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Failed to resend verification code:', error);
      console.error('Error details:', error.response?.data);
      toast({
        title: 'Resend Failed',
        description: `Failed to resend verification code: ${error.response?.data?.message || error.message}`,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: 'Connect Wallet', icon: <Wallet className="w-4 h-4" /> },
            { label: 'Complete Profile', icon: <User className="w-4 h-4" />, current: true }
          ]}
          showBackButton={true}
          backButtonText="Back to Wallet"
          onBack={() => window.location.href = '/'}
        />
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <ProgressIndicator
          currentStep={2}
          totalSteps={3}
          steps={['Connect Wallet', 'Complete Profile', 'Verify Email']}
          variant="detailed"
        />
      </div>

      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-primary-blue/20 text-primary-blue">
            <User className="w-6 h-6" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Complete Your Profile
        </h2>
        <p className="text-text-secondary">
          Add your personal information to complete your account setup.
        </p>
      </motion.div>

      {step === 'form' ? (
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-error/10 border border-error/20 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
            <span className="text-error text-sm">{error}</span>
          </motion.div>
        )}

        <div className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email address"
                className={`pl-10 ${validationErrors.email ? 'border-error' : emailChecked === formData.email ? 'border-primary-blue' : ''}`}
                disabled={isLoading || isCheckingEmail}
              />
              {isCheckingEmail && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
                </div>
              )}
              {emailChecked === formData.email && !isCheckingEmail && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <CheckCircle className="w-4 h-4 text-primary-blue" />
                </div>
              )}
            </div>
            {validationErrors.email && (
              <p className="text-error text-xs mt-1">{validationErrors.email}</p>
            )}
            {emailChecked === formData.email && !validationErrors.email && (
              <p className="text-primary-blue text-xs mt-1">Email is available</p>
            )}
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
                className={`pl-10 ${validationErrors.name ? 'border-error' : ''}`}
                disabled={isLoading}
              />
            </div>
            {validationErrors.name && (
              <p className="text-error text-xs mt-1">{validationErrors.name}</p>
            )}
          </div>

          {/* Wallet Address Field - Non-editable */}
          {walletAddress && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Connected Wallet Address
              </label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <Input
                  type="text"
                  value={`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} (${walletType})`}
                  className="pl-10 bg-background-tertiary/50 border-border-primary/50 text-text-secondary cursor-not-allowed"
                  disabled={true}
                  readOnly
                />
              </div>
              <p className="text-xs text-text-tertiary mt-1">
                This address is connected from your {walletType} wallet
              </p>
            </div>
          )}

          {/* Phone Field */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className={`pl-10 ${validationErrors.phone ? 'border-error' : ''}`}
                disabled={isLoading}
              />
            </div>
            {validationErrors.phone && (
              <p className="text-error text-xs mt-1">{validationErrors.phone}</p>
            )}
          </div>

          {/* Country Field */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Country
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input
                type="text"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Enter your country"
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Completing Profile...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Profile
            </>
          )}
        </Button>

        <div className="mt-6 p-4 rounded-lg bg-gray-800/50 border border-gray-600/30 dark:bg-gray-800/50 dark:border-gray-600/30">
          <h3 className="text-sm font-semibold text-white dark:text-white mb-2">
            What happens next?
          </h3>
          <ul className="text-xs text-gray-300 dark:text-gray-300 space-y-1">
            <li>• We'll send a 6-digit verification code to your email</li>
            <li>• Enter the code in the next step to verify your account</li>
            <li>• Once verified, you'll have full access to all features</li>
          </ul>
        </div>
        </motion.form>
      ) : step === 'verify-email' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-blue/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary-blue" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              Verify Your Email
            </h2>
            <p className="text-text-secondary">
              We've sent a 6-digit verification code to <strong>{user?.email || formData.email}</strong>
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Verification Code
              </label>
              <Input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(value);
                  if (validationErrors.verification) {
                    setValidationErrors(prev => ({ ...prev, verification: '' }));
                  }
                }}
                placeholder="Enter 6-digit code"
                className="text-center text-lg tracking-widest"
                maxLength={6}
              />
              {validationErrors.verification && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.verification}</p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleVerifyEmail}
                disabled={isVerifying || verificationCode.length !== 6}
                className="w-full"
                size="lg"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleResendCode}
                  variant="outline"
                  className="flex-1"
                >
                  Resend Code
                </Button>
                <Button
                  onClick={() => setStep('form')}
                  variant="ghost"
                  className="flex-1"
                >
                  Back to Form
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
      </div>
    </div>
  );
};

export default ProfileCompletion;
