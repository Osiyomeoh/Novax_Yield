import React, { useState, useEffect } from 'react';
import { UserCheck, AlertCircle, CheckCircle, LogOut, ChevronDown, User, Wallet, Settings, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../../contexts/WalletContext';
import { useAuth } from '../../contexts/AuthContext';
import UnifiedAuthFlow from './UnifiedAuthFlow';
import Button from '../UI/Button';

interface AuthStatusProps {
  className?: string;
}

const AuthStatus: React.FC<AuthStatusProps> = ({ 
  className = '' 
}) => {
  const navigate = useNavigate();
  const { isConnected, accountId, address, loading: walletLoading, disconnectWallet } = useWallet();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Handle logout and disconnect
  const handleLogout = async () => {
    try {
      await logout();
      await disconnectWallet();
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Debug logging (only when values change)
  useEffect(() => {
    console.log('AuthStatus Debug:', {
      isConnected,
      address,
      walletLoading,
      user: user ? {
        name: user.name,
        email: user.email,
        emailVerificationStatus: user.emailVerificationStatus
      } : null,
      authLoading
    });
  }, [isConnected, address, walletLoading, user?.name, user?.email, user?.emailVerificationStatus, authLoading]);

  // Show loading state while checking auth status
  if (walletLoading || authLoading) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={className}
        disabled
      >
        Loading...
      </Button>
    );
  }

  // Not connected - show Connect Wallet
  if (!isConnected || !accountId || authLoading) {
    console.log('AuthStatus - Showing Connect Wallet button:', {
      isConnected,
      accountId,
      hasUser: !!user,
      authLoading
    });
    return (
      <UnifiedAuthFlow
        showAsModal={true}
        trigger={
          <Button
            variant="neon"
            size="sm"
            className={className}
          >
            Connect Wallet
          </Button>
        }
      />
    );
  }

  // Connected but no user profile - show Complete Profile
  if (isConnected && accountId && !user) {
    console.log('AuthStatus - Showing Complete Profile button:', {
      isConnected,
      accountId,
      hasUser: !!user
    });
    return (
      <UnifiedAuthFlow
        showAsModal={true}
        trigger={
          <Button
            variant="outline"
            size="sm"
            className={className}
          >
            Complete Profile
          </Button>
        }
      />
    );
  }

  // Connected with user but incomplete profile - show Complete Profile
  if (user && (!user.email || !user.name)) {
    return (
      <UnifiedAuthFlow
        showAsModal={true}
        trigger={
          <Button
            variant="outline"
            size="sm"
            className={className}
          >
            Complete Profile
          </Button>
        }
      />
    );
  }

  // Connected with profile but email not verified - show Verify Email
  if (user && user.emailVerificationStatus && user.emailVerificationStatus.toLowerCase() !== 'verified') {
    return (
      <UnifiedAuthFlow
        showAsModal={true}
        trigger={
          <div className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-off-white">
                {user.name || 'User'}
              </span>
              <span className="text-xs text-orange-400">
                Verify Email
              </span>
            </div>
          </div>
        }
      />
    );
  }

  // Fully authenticated - show connected status with dropdown (OpenSea style)
  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-3 hover:opacity-80 transition-opacity bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-700 hover:border-gray-600"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-blue to-primary-blue-light flex items-center justify-center">
          {user?.name ? (
            <span className="text-black font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </span>
          ) : (
            <UserCheck className="w-4 h-4 text-black" />
          )}
        </div>
        
        {/* Wallet Address (Primary Display) */}
        <div className="flex flex-col text-left">
          <span className="text-sm font-semibold text-off-white">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
          </span>
          <span className="text-xs text-gray-400">
            {user?.name || 'User'}
          </span>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center space-x-1">
          <CheckCircle className="w-3 h-3 text-primary-blue" />
        </div>
        
        {/* Dropdown Arrow */}
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="py-2">
            {/* Wallet Info */}
            <div className="px-4 py-3 border-b border-gray-700">
              <p className="text-sm text-gray-400">Signed in as</p>
              <p className="text-sm font-medium text-off-white">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
              </p>
            </div>
            
            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={() => {
                  navigate('/dashboard/profile');
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-off-white transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </button>
              
              <button
                onClick={() => {
                  navigate('/dashboard/profile');
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-off-white transition-colors"
              >
                <Wallet className="w-4 h-4" />
                <span>Portfolio</span>
              </button>
              
              <button
                onClick={() => {
                  navigate('/dashboard/settings');
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-off-white transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
              
              {/* Link Wallet Option (OpenSea style) */}
              <div className="border-t border-gray-700 my-1"></div>
              <button
                onClick={() => {
                  // This would open a modal to link additional wallets
                  console.log('Link additional wallet');
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-off-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Link Wallet</span>
              </button>
            </div>
            
            {/* Logout */}
            <div className="border-t border-gray-700 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-off-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect & Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default AuthStatus;
