import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useProfileCompletion } from '../contexts/ProfileCompletionContext';

export const useTransactionBlock = () => {
  const { isAuthenticated, authStep, user } = useAuth();
  const { isConnected } = useWallet();
  const { openProfileCompletion } = useProfileCompletion();

  // Check if user needs to complete profile
  // Skip if user has email and name (likely from Google login - profile already has data)
  const hasProfileData = user?.email && user?.name;
  const needsProfileCompletion = isConnected && (!isAuthenticated || (authStep === 'profile' && !hasProfileData) || (authStep === 'email' && !hasProfileData));
  
  // Check if user is verified (has completed profile and email verification)
  const isVerified = isAuthenticated && authStep === 'complete' && user?.emailVerificationStatus === 'verified';
  
  // Block transactions if user needs profile completion or is not verified
  const shouldBlockTransactions = needsProfileCompletion || !isVerified;
  
  // Get the reason for blocking
  const getBlockReason = () => {
    if (needsProfileCompletion) {
      return 'Please complete your profile to perform transactions';
    }
    if (!isVerified) {
      return 'Please verify your email to perform transactions';
    }
    return null;
  };

  // Function to open profile completion
  const openProfileCompletionModal = () => {
    openProfileCompletion();
  };

  return {
    shouldBlockTransactions,
    needsProfileCompletion,
    isVerified,
    getBlockReason,
    openProfileCompletionModal
  };
};
