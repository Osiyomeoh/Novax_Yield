import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from './WalletContext';
import { useAuth } from './AuthContext';
import { contractService } from '../services/contractService';

interface AdminRole {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPlatformAdmin: boolean;
  isAmcAdmin: boolean;
  role: string;
  permissions: string[];
}

interface AdminContextType {
  isAdmin: boolean;
  isVerifier: boolean;
  isSuperAdmin: boolean;
  isPlatformAdmin: boolean;
  isAmcAdmin: boolean;
  adminRole: AdminRole | null;
  adminRoles: { isAdmin: boolean; isVerifier: boolean };
  loading: boolean;
  error: string | null;
  checkAdminStatus: () => Promise<void>;
  clearAdminState: () => void;
  refreshAdminStatus: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const { address, isConnected } = useWallet();
  const { isAuthenticated } = useAuth();
  
  // Initialize state from localStorage for persistence
  const getInitialAdminState = () => {
    try {
      const cached = localStorage.getItem('adminState');
      if (cached && address) {
        const parsed = JSON.parse(cached);
        // Only use cached state if it's for the same wallet address
        if (parsed.address === address && parsed.timestamp > Date.now() - 5 * 60 * 1000) { // 5 minutes cache
          return parsed.state;
        }
      }
    } catch (error) {
      // Silent error handling for cached state
    }
    return {
      isAdmin: false,
      isVerifier: false,
      isSuperAdmin: false,
      isPlatformAdmin: false,
      isAmcAdmin: false,
      adminRole: null,
      adminRoles: { isAdmin: false, isVerifier: false }
    };
  };

  const [isAdmin, setIsAdmin] = useState(() => getInitialAdminState().isAdmin);
  const [isVerifier, setIsVerifier] = useState(() => getInitialAdminState().isVerifier);
  const [isSuperAdmin, setIsSuperAdmin] = useState(() => getInitialAdminState().isSuperAdmin);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(() => getInitialAdminState().isPlatformAdmin);
  const [isAmcAdmin, setIsAmcAdmin] = useState(() => getInitialAdminState().isAmcAdmin);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(() => getInitialAdminState().adminRole);
  const [adminRoles, setAdminRoles] = useState(() => getInitialAdminState().adminRoles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache admin state to localStorage
  const cacheAdminState = (state: any) => {
    try {
      const cacheData = {
        address,
        timestamp: Date.now(),
        state
      };
      localStorage.setItem('adminState', JSON.stringify(cacheData));
    } catch (error) {
      // Silent error handling for caching
    }
  };

  const checkAdminStatus = async () => {
    if (!address || !isConnected) {
      setIsAdmin(false);
      setIsVerifier(false);
      setIsSuperAdmin(false);
      setIsPlatformAdmin(false);
      setIsAmcAdmin(false);
      setAdminRole(null);
      setAdminRoles({ isAdmin: false, isVerifier: false });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get auth token from localStorage (try both keys)
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

      if (!token) {
        setLoading(false);
        return; // Don't throw error, just return and wait
      }
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Admin status check failed: ${response.statusText}`);
      }

      const adminData: AdminRole = await response.json();
      
      // Update admin states
      const newAdminState = {
        isAdmin: adminData.isAdmin,
        isVerifier: adminData.isAmcAdmin, // AMC admin can verify
        isSuperAdmin: adminData.isSuperAdmin,
        isPlatformAdmin: adminData.isPlatformAdmin,
        isAmcAdmin: adminData.isAmcAdmin,
        adminRole: adminData,
        adminRoles: { 
          isAdmin: adminData.isAdmin, 
          isVerifier: adminData.isAmcAdmin 
        }
      };

      setIsAdmin(newAdminState.isAdmin);
      setIsVerifier(newAdminState.isVerifier);
      setIsSuperAdmin(newAdminState.isSuperAdmin);
      setIsPlatformAdmin(newAdminState.isPlatformAdmin);
      setIsAmcAdmin(newAdminState.isAmcAdmin);
      setAdminRole(newAdminState.adminRole);
      setAdminRoles(newAdminState.adminRoles);

      // Cache the admin state
      cacheAdminState(newAdminState);
    } catch (err) {
      console.error('Failed to check admin status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check admin status');
      setIsAdmin(false);
      setIsVerifier(false);
      setIsSuperAdmin(false);
      setIsPlatformAdmin(false);
      setIsAmcAdmin(false);
      setAdminRole(null);
      setAdminRoles({ isAdmin: false, isVerifier: false });
    } finally {
      setLoading(false);
    }
  };

  const clearAdminState = () => {
    setIsAdmin(false);
    setIsVerifier(false);
    setIsSuperAdmin(false);
    setIsPlatformAdmin(false);
    setIsAmcAdmin(false);
    setAdminRole(null);
    setAdminRoles({ isAdmin: false, isVerifier: false });
    setError(null);
    
    // Clear cached admin state
    localStorage.removeItem('adminState');
  };

  const refreshAdminStatus = async () => {
    // Clear cached state and force refresh
    localStorage.removeItem('adminState');
    await checkAdminStatus();
  };

  useEffect(() => {
    if (address && isConnected && isAuthenticated) {
      // Check if we have valid cached admin state first
      const cached = localStorage.getItem('adminState');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.address === address && parsed.timestamp > Date.now() - 5 * 60 * 1000) {
            const cachedState = parsed.state;
            setIsAdmin(cachedState.isAdmin);
            setIsVerifier(cachedState.isVerifier);
            setIsSuperAdmin(cachedState.isSuperAdmin);
            setIsPlatformAdmin(cachedState.isPlatformAdmin);
            setIsAmcAdmin(cachedState.isAmcAdmin);
            setAdminRole(cachedState.adminRole);
            setAdminRoles(cachedState.adminRoles);
            return;
          }
        } catch (error) {
          // Silent error handling for cached state
        }
      }
      
      checkAdminStatus();
    } else {
      setIsAdmin(false);
      setIsVerifier(false);
      setIsSuperAdmin(false);
      setIsPlatformAdmin(false);
      setIsAmcAdmin(false);
      setAdminRole(null);
      setAdminRoles({ isAdmin: false, isVerifier: false });
      
      // Clear cached admin state when user is not authenticated
      if (!address || !isConnected) {
        localStorage.removeItem('adminState');
      }
    }
  }, [address, isConnected, isAuthenticated]);

  // Additional effect to retry admin status check when token becomes available
  useEffect(() => {
    if (address && isConnected && isAuthenticated) {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      if (token && !isAdmin && !loading && !adminRole) {
        // Token is available but admin status hasn't been checked yet
        const timer = setTimeout(() => {
          checkAdminStatus();
        }, 1000); // Wait 1 second for token to be fully processed
        
        return () => clearTimeout(timer);
      } else if (!token && isAuthenticated) {
        // User is authenticated but token not available yet, wait and retry
        const timer = setTimeout(() => {
          // Trigger the effect again
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [address, isConnected, isAuthenticated, isAdmin, loading, adminRole]);

  const value: AdminContextType = {
    isAdmin,
    isVerifier,
    isSuperAdmin,
    isPlatformAdmin,
    isAmcAdmin,
    adminRole,
    adminRoles,
    loading,
    error,
    checkAdminStatus,
    clearAdminState,
    refreshAdminStatus
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

// Admin Guard Component
interface AdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireVerifier?: boolean; // If true, requires VERIFIER_ROLE; if false, requires either ADMIN or VERIFIER
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ 
  children, 
  fallback = <div className="p-4 text-center text-gray-500">Access Denied: Admin privileges required</div>,
  requireVerifier = false 
}) => {
  const { isAdmin, isVerifier, loading } = useAdmin();

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-500">Checking admin status...</p>
      </div>
    );
  }

  const hasAccess = requireVerifier ? isVerifier : (isAdmin || isVerifier);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
