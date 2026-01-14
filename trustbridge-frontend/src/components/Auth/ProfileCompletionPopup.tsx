import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, MapPin, CheckCircle, AlertCircle, Loader2, Wallet, X } from 'lucide-react';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { useToast } from '../../hooks/useToast';
import { apiService } from '../../services/api';

interface ProfileCompletionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const ProfileCompletionPopup: React.FC<ProfileCompletionPopupProps> = ({ 
  isOpen, 
  onClose, 
  onComplete 
}) => {
  const { completeProfile, verifyEmail, isLoading, error, user } = useAuth();
  const { address: walletAddress, walletType } = useWallet();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    country: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'form' | 'email-sent' | 'verify-email'>('form');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailChecked, setEmailChecked] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Check if user is already verified or needs verification
  useEffect(() => {
    if (user && (user.emailVerificationStatus === 'VERIFIED' || user.emailVerificationStatus === 'verified')) {
      onComplete();
    } else if (user && user.email && user.emailVerificationStatus && user.emailVerificationStatus !== 'VERIFIED' && user.emailVerificationStatus !== 'verified') {
      // User has a profile but needs email verification
      setStep('verify-email');
    }
  }, [user, onComplete]);

  // Email availability check
  const checkEmailAvailability = async (email: string) => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return;
    }

    setIsCheckingEmail(true);
    try {
      const response = await apiService.checkEmailUser(email);
      
      if (response.success && response.data) {
        setValidationErrors(prev => ({
          ...prev,
          email: 'This email is already registered to another account. Please use a different email address.'
        }));
        setEmailChecked(null);
      } else {
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
      // Show success message with spam folder notice
      toast({
        title: 'Profile Completed!',
        description: 'Verification code sent to your email. Please check your spam folder if you don\'t see it.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Profile completion failed:', error);
      
      // Check if user exists and has email verification status
      // If so, go to verification step instead of staying on form
      if (user && user.email && user.emailVerificationStatus) {
        setStep('verify-email');
        toast({
          title: 'Verification Code Sent',
          description: 'Please check your email (including spam folder) for the verification code.',
          variant: 'default'
        });
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Check email availability with debounce
    if (field === 'email') {
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
      onComplete();
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
        description: 'A new verification code has been sent. Please check your spam folder if you don\'t see it.',
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-midnight-900 border border-midnight-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-blue/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary-blue" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-off-white">Complete Profile</h3>
                <p className="text-sm text-primary-blue-light">Required for trading</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-midnight-800 hover:bg-midnight-700 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {step === 'form' ? (
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-red-400 text-sm">{error}</span>
                </motion.div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-off-white mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter your email"
                    className={`pl-10 ${validationErrors.email ? 'border-red-500' : emailChecked === formData.email ? 'border-primary-blue' : ''}`}
                    disabled={isLoading || isCheckingEmail}
                  />
                  {isCheckingEmail && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    </div>
                  )}
                  {emailChecked === formData.email && !isCheckingEmail && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <CheckCircle className="w-4 h-4 text-primary-blue" />
                    </div>
                  )}
                </div>
                {validationErrors.email && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.email}</p>
                )}
                {emailChecked === formData.email && !validationErrors.email && (
                  <p className="text-primary-blue text-xs mt-1">Email is available</p>
                )}
              </div>

              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-off-white mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your name"
                    className={`pl-10 ${validationErrors.name ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.name && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.name}</p>
                )}
              </div>

              {/* Wallet Address - Read Only */}
              {walletAddress && (
                <div>
                  <label className="block text-sm font-medium text-off-white mb-2">
                    Connected Wallet
                  </label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      value={`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                      className="pl-10 bg-midnight-800 text-gray-400 cursor-not-allowed"
                      disabled={true}
                      readOnly
                    />
                  </div>
                </div>
              )}

              {/* Phone Field */}
              <div>
                <label className="block text-sm font-medium text-off-white mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className={`pl-10 ${validationErrors.phone ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.phone && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.phone}</p>
                )}
              </div>

              {/* Country Field */}
              <div>
                <label className="block text-sm font-medium text-off-white mb-2">
                  Country
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Profile
                  </>
                )}
              </Button>
            </motion.form>
          ) : step === 'verify-email' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-blue/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary-blue" />
                </div>
                <h3 className="text-lg font-semibold text-off-white mb-2">
                  Verify Your Email
                </h3>
                <p className="text-sm text-primary-blue-light mb-3">
                  We've sent a 6-digit verification code to <strong>{user?.email || formData.email}</strong>
                </p>
                
                {/* Spam Folder Warning */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="text-xs text-yellow-400 font-medium mb-1">
                        Can't find the email?
                      </p>
                      <p className="text-xs text-yellow-300/80">
                        Please check your <strong>spam/junk folder</strong>. The verification email may have been filtered there.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-off-white mb-2">
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
                      onClick={onClose}
                      variant="ghost"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProfileCompletionPopup;
