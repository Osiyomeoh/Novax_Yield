import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import WalletDebug from '../Debug/WalletDebug';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, authStep } = useAuth();
  const { isConnected, address } = useWallet();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    console.log('ProtectedRoute - State check:', {
      isConnected,
      address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
      isAuthenticated,
      authStep,
      isChecking
    });

    // If wallet is not connected, wait a bit for connection to complete
    if (!isConnected || !address) {
      console.log('ProtectedRoute - Wallet not connected, waiting for connection...');
      const timer = setTimeout(() => {
        console.log('ProtectedRoute - Wallet connection timeout, stopping check');
        setIsChecking(false);
      }, 3000); // 3 second delay to allow wallet connection
      return () => clearTimeout(timer);
    }

    // If wallet is connected but not authenticated, wait a bit for auth to complete
    if (isConnected && address && !isAuthenticated) {
      console.log('ProtectedRoute - Wallet connected but not authenticated, waiting for auth...');
      const timer = setTimeout(() => {
        console.log('ProtectedRoute - Auth timeout reached, stopping check');
        setIsChecking(false);
      }, 8000); // 8 second delay to allow auth flow to complete (increased from 5s)
      return () => clearTimeout(timer);
    }

    // If authenticated, stop checking
    if (isAuthenticated) {
      console.log('ProtectedRoute - Authenticated, stopping check');
      setIsChecking(false);
    }
  }, [isConnected, address, isAuthenticated, authStep]);

  // Show loading while checking authentication
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-gray via-black to-dark-gray flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-off-white text-lg">Checking authentication...</p>
          <div className="mt-4 text-sm text-primary-blue-light">
            <p>Wallet: {isConnected ? '✅ Connected' : '❌ Disconnected'}</p>
            <p>Address: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'None'}</p>
            <p>Authenticated: {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
            <p>Auth Step: {authStep}</p>
            <p>MetaMask: {window.ethereum ? '✅ Available' : '❌ Not Available'}</p>
            <button 
              onClick={() => {
                console.log('Manual wallet check triggered');
                window.location.reload();
              }}
              className="mt-2 px-4 py-2 bg-primary-blue text-black rounded-lg hover:bg-primary-blue-light transition-colors"
            >
              Check Wallet Again
            </button>
          </div>
        </div>
        <WalletDebug />
      </div>
    );
  }

  // If wallet is not connected, redirect to home
  if (!isConnected || !address) {
    console.log('ProtectedRoute: Wallet not connected, redirecting to home');
    return <Navigate to="/" replace />;
  }

  // If not authenticated, redirect to marketplace where they can connect wallet
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to marketplace', {
      isConnected,
      address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
      isAuthenticated,
      authStep,
      isChecking
    });
    return <Navigate to="/marketplace" replace />;
  }

  // If authenticated but not verified, allow access to dashboard but with restrictions
  if (authStep !== 'complete') {
    console.log('ProtectedRoute: Authenticated but not verified, allowing limited access');
    // User can access dashboard but with limited functionality until email is verified
  }

  return <>{children}</>;
};

export default ProtectedRoute;
