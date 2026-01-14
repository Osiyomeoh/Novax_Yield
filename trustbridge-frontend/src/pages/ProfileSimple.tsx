import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Plus, Building2, Shield, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../components/UI/Card';
import Button from '../components/UI/Button';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useToast } from '../hooks/useToast';
import { usePortfolio, useAssetByOwner } from '../hooks/useApi';

const ProfileSimple: React.FC = () => {
  const { user } = useAuth();
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch real data from API
  const { data: portfolioData, loading: portfolioLoading } = usePortfolio();
  const { data: userAssetsData, loading: assetsLoading } = useAssetByOwner(address || '');

  // Calculate user stats from real data
  const userStats = useMemo(() => {
    if (portfolioLoading || !portfolioData?.data) {
      return {
        portfolioValue: '...',
        usdValue: '...',
        assetsCount: '...',
        createdCount: '...'
      };
    }

    const portfolio = portfolioData.data;
    const assetsCount = userAssetsData?.data?.length || 0;
    
    return {
      portfolioValue: `${portfolio.totalValue?.toFixed(2) || '0.00'} TRUST`,
      usdValue: `$${portfolio.totalValue?.toLocaleString() || '0'}`,
      assetsCount: assetsCount,
      createdCount: assetsCount
    };
  }, [portfolioData, portfolioLoading, userAssetsData]);

  const handleCreateAsset = (type: 'digital' | 'rwa') => {
    if (type === 'rwa' && user?.kycStatus?.toLowerCase() !== 'approved') {
      toast({
        title: 'KYC Required',
        description: 'You need to complete KYC verification to create RWA assets',
        variant: 'destructive'
      });
      return;
    }
    
    navigate(`/dashboard/assets/create?type=${type}`);
  };

  const handleCreateAMC = () => {
    if (user?.kycStatus?.toLowerCase() !== 'approved') {
      toast({
        title: 'KYC Required',
        description: 'You need to complete KYC verification to create AMC',
        variant: 'destructive'
      });
      return;
    }
    
    navigate('/dashboard/amc/create');
  };

  return (
    <div className="min-h-screen bg-black text-off-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-blue to-primary-blue-light rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm">TB</span>
              </div>
              <span className="text-lg font-semibold text-off-white">TrustBridge</span>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card variant="floating" className="overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary-blue to-primary-blue-light rounded-full flex items-center justify-center">
                    <User className="w-12 h-12 text-black" />
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-lg font-semibold text-off-white">
                      {user?.name || 'Anonymous User'}
                    </h1>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-gray-400 font-mono">
                      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                    </span>
                    <span className="text-xs bg-primary-blue/20 text-primary-blue px-1.5 py-0.5 rounded-full">
                      {user?.emailVerificationStatus?.toLowerCase() === 'verified' ? 'Verified' : 'Unverified'}
                    </span>
                  </div>

                  {/* Portfolio Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-primary-blue">
                        {portfolioLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : (
                          userStats.portfolioValue
                        )}
                      </p>
                      <p className="text-xs text-gray-400">Portfolio Value</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-primary-blue-light">
                        {portfolioLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : (
                          userStats.usdValue
                        )}
                      </p>
                      <p className="text-xs text-gray-400">USD Value</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-off-white">
                        {assetsLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : (
                          userStats.assetsCount
                        )}
                      </p>
                      <p className="text-xs text-gray-400">Assets</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-purple-400">
                        {assetsLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : (
                          userStats.createdCount
                        )}
                      </p>
                      <p className="text-xs text-gray-400">Created</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="neon"
                    onClick={() => handleCreateAsset('digital')}
                    className="px-6 py-3"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Digital Asset
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCreateAsset('rwa')}
                    className="px-6 py-3 border-primary-blue/30 text-primary-blue hover:bg-primary-blue/10"
                    disabled={user?.kycStatus?.toLowerCase() !== 'approved'}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Create RWA
                    {user?.kycStatus?.toLowerCase() !== 'approved' && (
                      <span className="ml-2 text-xs">(KYC Required)</span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCreateAMC}
                    className="px-6 py-3 border-purple-400/30 text-purple-400 hover:bg-purple-400/10"
                    disabled={user?.kycStatus?.toLowerCase() !== 'approved'}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Create AMC
                    {user?.kycStatus?.toLowerCase() !== 'approved' && (
                      <span className="ml-2 text-xs">(KYC Required)</span>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Redirect to Full Profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card variant="floating" className="text-center py-16">
            <CardContent>
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-primary-blue/20 to-primary-blue-light/20 rounded-full flex items-center justify-center">
                <User className="w-16 h-16 text-primary-blue" />
              </div>
              <h3 className="text-2xl font-bold text-off-white mb-4">Welcome to TrustBridge!</h3>
              <p className="text-gray-400 mb-6">
                Your email has been verified. You now have full access to create digital assets, RWAs, and manage your portfolio.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="neon"
                  onClick={() => navigate('/dashboard')}
                  className="px-8 py-4 text-lg font-semibold"
                >
                  <User className="w-5 h-5 mr-2" />
                  Go to Full Profile
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCreateAsset('digital')}
                  className="px-8 py-4 text-lg font-semibold border-primary-blue/30 text-primary-blue hover:bg-primary-blue/10"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Digital Asset
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCreateAsset('rwa')}
                  className="px-8 py-4 text-lg font-semibold border-purple-400/30 text-purple-400 hover:bg-purple-400/10"
                  disabled={user?.kycStatus?.toLowerCase() !== 'approved'}
                >
                  <Building2 className="w-5 h-5 mr-2" />
                  Create RWA
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileSimple;
