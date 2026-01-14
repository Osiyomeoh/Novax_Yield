import React, { useEffect } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { useWallet } from '../../contexts/WalletContext';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Component that ensures admin status persistence across page refreshes
 * This should be placed high in the component tree
 */
export const AdminStatusPersistent: React.FC = () => {
  const { isAdmin, isSuperAdmin, isPlatformAdmin, isAmcAdmin, refreshAdminStatus } = useAdmin();
  const { address, isConnected } = useWallet();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Check if admin status needs to be refreshed
    const checkAdminPersistence = async () => {
      if (address && isConnected && isAuthenticated) {
        // Check if we have any admin privileges
        const hasAnyAdminRole = isAdmin || isSuperAdmin || isPlatformAdmin || isAmcAdmin;
        
        if (!hasAnyAdminRole) {
          await refreshAdminStatus();
        }
      }
    };

    // Run check after a short delay to ensure all contexts are initialized
    const timer = setTimeout(checkAdminPersistence, 1000);

    return () => clearTimeout(timer);
  }, [address, isConnected, isAuthenticated, isAdmin, isSuperAdmin, isPlatformAdmin, isAmcAdmin, refreshAdminStatus]);

  // This component doesn't render anything, it just manages persistence
  return null;
};
