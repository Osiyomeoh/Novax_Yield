import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, Loader2, RefreshCw, Clock, User, Wallet } from 'lucide-react';
import Button from '../UI/Button';
import Input from '../UI/Input';
import Breadcrumb from '../UI/Breadcrumb';
import ProgressIndicator from '../UI/ProgressIndicator';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';

const EmailVerification: React.FC = () => {
  const { verifyEmail, isLoading, error, user, authStep } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Redirect verified users to dashboard
  useEffect(() => {
    if (user && (user.emailVerificationStatus === 'VERIFIED' || user.emailVerificationStatus === 'verified')) {
      console.log('EmailVerification - User already verified, redirecting to dashboard');
      navigate('/dashboard/');
    }
  }, [user, navigate]);

  // Show loading screen while checking user status
  if (authStep === 'complete' || (user && (user.emailVerificationStatus === 'VERIFIED' || user.emailVerificationStatus === 'verified'))) {
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
            Redirecting to dashboard...
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
              <span className="text-midnight-300">Email Verified</span>
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

  // Countdown timer for resend button
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setValidationError('Please enter the 6-digit verification code');
      return;
    }

    if (code.length !== 6) {
      setValidationError('Please enter a valid 6-digit code');
      return;
    }

    setValidationError('');

    try {
      await verifyEmail(code);
      setIsVerified(true);
    } catch (error) {
      console.error('Email verification failed:', error);
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setCode(numericValue);
    if (validationError) {
      setValidationError('');
    }
  };

  const handleResend = async () => {
    console.log('Resend button clicked!', { user, email: user?.email });
    
    if (!user?.email) {
      console.error('No user email available for resend');
      setResendError('No email address found. Please try again.');
      return;
    }
    
    console.log('Starting resend verification for:', user.email);
    setResendLoading(true);
    setResendError('');
    setResendSuccess(false);

    try {
      console.log('Calling apiService.resendVerification...');
      const result = await apiService.resendVerification(user.email);
      console.log('Resend verification result:', result);
      setResendSuccess(true);
      setCountdown(60); // 60 second cooldown
    } catch (error) {
      console.error('Resend verification failed:', error);
      setResendError('Failed to resend verification email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-primary-blue/20 text-primary-blue">
              <CheckCircle className="w-8 h-8" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-off-white mb-4">
            Email Verified!
          </h2>
          
          <p className="text-medium-gray mb-8">
            Your email has been successfully verified. You now have full access to all TrustBridge features.
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary-blue/10 border border-primary-blue/20">
              <h3 className="text-sm font-semibold text-primary-blue mb-2">
                What you can do now:
              </h3>
              <ul className="text-xs text-off-white space-y-1 text-left">
                <li>• Browse and invest in African assets</li>
                <li>• Track your portfolio performance</li>
                <li>• Participate in asset tokenization</li>
                <li>• Access advanced analytics</li>
              </ul>
            </div>

            <Button
              onClick={() => navigate('/dashboard/')}
              className="w-full"
              size="lg"
            >
              Go to Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: 'Connect Wallet', icon: <Wallet className="w-4 h-4" /> },
            { label: 'Complete Profile', icon: <User className="w-4 h-4" /> },
            { label: '2FA Verification', icon: <Mail className="w-4 h-4" />, current: true }
          ]}
          showBackButton={true}
          backButtonText="Back to Profile"
          onBack={() => navigate('/auth?step=profile')}
        />
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <ProgressIndicator
          currentStep={3}
          totalSteps={3}
          steps={['Connect Wallet', 'Complete Profile', '2FA Verification']}
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
            <Mail className="w-6 h-6" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-off-white mb-2">
          Two-Factor Authentication
        </h2>
        <p className="text-medium-gray">
          We've sent a 6-digit verification code to <strong>{user?.email}</strong>
        </p>
        <p className="text-sm text-medium-gray mt-2">
          <Clock className="w-4 h-4 inline mr-1" />
          Complete your account setup with email verification (2FA)
        </p>
      </motion.div>

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

        <div>
          <label className="block text-sm font-medium text-off-white mb-2">
            6-Digit Verification Code
          </label>
          <Input
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="123456"
            className={`text-center text-2xl tracking-widest font-mono ${validationError ? 'border-error' : ''}`}
            disabled={isLoading}
            maxLength={6}
          />
          {validationError && (
            <p className="text-error text-xs mt-1">{validationError}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading || !code.trim() || code.length !== 6}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Verify Email
            </>
          )}
        </Button>

        <div className="mt-6 space-y-4">
          {/* Resend Success/Error Messages */}
          {resendSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-primary-blue/10 border border-primary-blue/20 flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5 text-primary-blue flex-shrink-0" />
              <span className="text-primary-blue text-sm">New verification code sent successfully!</span>
            </motion.div>
          )}

          {resendError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-error/10 border border-error/20 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
              <span className="text-error text-sm">{resendError}</span>
            </motion.div>
          )}

          <div className="p-4 rounded-lg bg-dark-gray/50 border border-medium-gray/30">
            <h3 className="text-sm font-semibold text-off-white mb-2">
              Can't find the email?
            </h3>
            <ul className="text-xs text-medium-gray space-y-1">
              <li>• Check your spam/junk folder</li>
              <li>• Make sure the email address is correct</li>
              <li>• Wait a few minutes for delivery</li>
            </ul>
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-medium-gray hover:text-off-white"
              onClick={() => {
                console.log('Button clicked!', { resendLoading, countdown, user: user?.email });
                handleResend();
              }}
              disabled={resendLoading || countdown > 0}
            >
              {resendLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Resend in {countdown}s
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Verification Code
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.form>
      </div>
    </div>
  );
};

export default EmailVerification;
