import React from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Wallet } from 'lucide-react';
import { getUseTranslation } from '../../utils/i18n-helpers';

/**
 * Connect Wallet Button Component using Privy
 * Provides easy sign-up and wallet connection
 */
export const ConnectWalletButton: React.FC = () => {
  const useTranslation = getUseTranslation();
  const { t } = useTranslation();
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  // Reset login state when authenticated - MUST be before any returns
  React.useEffect(() => {
    if (authenticated) {
      setIsLoggingIn(false);
    }
  }, [authenticated]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
      setIsLoggingIn(false);
    }
  };

  if (!ready) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-gray-200 text-gray-500 font-medium rounded-lg cursor-not-allowed"
      >
        {t('common.loading')}...
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={handleLogin}
        disabled={isLoggingIn}
        type="button"
        className="px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2 disabled:opacity-50"
      >
        <Wallet className="w-4 h-4" />
        <span>{isLoggingIn ? t('common.loading') + '...' : t('header.connectWallet')}</span>
      </button>
    );
  }

  // User is authenticated - show account info
  const walletAddress = wallets[0]?.address || user?.wallet?.address;
  const displayAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : user?.email?.address || 'Connected';

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={logout}
        type="button"
        className="px-4 py-2 bg-gray-100 text-black font-medium rounded-lg hover:bg-gray-200 transition-colors"
      >
        {displayAddress}
      </button>
      <button
        onClick={logout}
        type="button"
        className="px-3 py-2 text-sm text-gray-600 hover:text-black transition-colors"
        title={t('header.disconnectWallet')}
      >
        {t('common.disconnect')}
      </button>
    </div>
  );
};
