import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/UI/Card';
import Button from '../components/UI/Button';
import { TrendingUp, DollarSign, Activity, Users, Globe, ArrowUpRight, Loader2, AlertCircle, FileText, Coins, BarChart3, Receipt, Plus, Eye, Crown, PieChart, ArrowRight } from 'lucide-react';
import { useMarketAnalytics } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { useWallet } from '../contexts/WalletContext';
import KYCBanner from '../components/UI/KYCBanner';
import { useToast } from '../hooks/useToast';
import { novaxContractService } from '../services/novaxContractService';
import { poolManagerService } from '../services/poolManagerService';
import { stakingVaultService } from '../services/stakingVaultService';

const Dashboard: React.FC = () => {
  const { user, startKYC, authStep, isAuthenticated } = useAuth();
  const { isAdmin } = useAdmin();
  const { address, provider, isConnected } = useWallet();
  const [showKYCBanner, setShowKYCBanner] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // User data state
  const [receivables, setReceivables] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [stakingData, setStakingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'exporter' | 'investor' | 'staker' | 'admin' | 'new'>('new');

  // Fetch real data from backend
  const { data: analyticsData, loading: analyticsLoading, error: analyticsError } = useMarketAnalytics();

  // Check authentication status
  useEffect(() => {
    if (!isAuthenticated || authStep === 'wallet' || authStep === 'profile' || authStep === 'email') {
      return;
    }
  }, [isAuthenticated, authStep, user, navigate]);

  // Load user-specific data
  useEffect(() => {
    if (!address || !provider || !isConnected) {
      setLoading(false);
      return;
    }

    const loadUserData = async () => {
      setLoading(true);
      try {
        // Initialize services
        const signer = await provider.getSigner();
        novaxContractService.initialize(signer, provider);
        poolManagerService.initialize(signer, provider);
        stakingVaultService.initialize(signer, provider);

        // Check if admin
        if (isAdmin) {
          setUserRole('admin');
          setLoading(false);
          return;
        }

        // Load receivables (for exporters)
        try {
          const receivableIds = await novaxContractService.getExporterReceivables(address);
          if (receivableIds && receivableIds.length > 0) {
            const receivableDetails = await Promise.all(
              receivableIds.slice(0, 5).map(async (id: string) => {
                try {
                  const rec = await novaxContractService.getReceivable(id);
                  return {
                    id,
                    amount: rec.amountUSD?.toString() || '0',
                    status: rec.status || 0,
                    dueDate: rec.dueDate?.toString() || '0',
                  };
                } catch (error) {
                  return null;
                }
              })
            );
            setReceivables(receivableDetails.filter((r: any) => r !== null));
            if (receivableDetails.length > 0) {
              setUserRole('exporter');
            }
          }
        } catch (error) {
          console.error('Error loading receivables:', error);
        }

        // Load investments (for investors)
        try {
          const portfolio = await poolManagerService.getUserPortfolio(address);
          if (portfolio && portfolio.pools && portfolio.pools.length > 0) {
            setInvestments(portfolio.pools.slice(0, 5));
            if (portfolio.pools.length > 0 && userRole !== 'exporter') {
              setUserRole('investor');
            }
          }
        } catch (error) {
          console.error('Error loading investments:', error);
        }

        // Load staking data
        try {
          const userStakes = await stakingVaultService.getUserStakes(address);
          if (userStakes && userStakes.length > 0) {
            setStakingData({
              totalStaked: userStakes.reduce((sum: number, stake: any) => sum + Number(stake.amount || 0), 0),
              stakes: userStakes.length,
            });
            if (userStakes.length > 0 && userRole === 'new') {
              setUserRole('staker');
            }
          }
        } catch (error) {
          console.error('Error loading staking data:', error);
        }

        // If no role determined, keep as 'new'
        if (userRole === 'new' && receivables.length === 0 && investments.length === 0 && !stakingData) {
          setUserRole('new');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [address, provider, isConnected, isAdmin]);

  // Check if KYC is required
  const isKYCRequired = user ? user.kycStatus?.toLowerCase() !== 'approved' : false;

  const handleStartKYC = async () => {
    try {
      await startKYC();
    } catch (error) {
      console.error('Failed to start KYC:', error);
    }
  };

  const handleDismissBanner = () => {
    setShowKYCBanner(false);
  };

  // Format analytics data for display
  const stats = useMemo(() => {
    if (analyticsLoading || !analyticsData) {
      return [
        { title: 'Total Value Locked', value: '$0.0M', icon: DollarSign },
        { title: 'Active Pools', value: '0', icon: BarChart3 },
        { title: 'Total Users', value: '0', icon: Users },
        { title: 'Network Status', value: 'Online', icon: Globe }
      ];
    }

    const data = (analyticsData as any)?.data || analyticsData;
    
    return [
      {
        title: 'Total Value Locked',
        value: `$${((data as any).totalValueLocked / 1000000).toFixed(1)}M`,
        icon: DollarSign
      },
      {
        title: 'Active Pools',
        value: (data as any).totalAssets?.toString() || '0',
        icon: BarChart3
      },
      {
        title: 'Total Users',
        value: (data as any).activeUsers?.toLocaleString() || '0',
        icon: Users
      },
      {
        title: 'Network Status',
        value: 'Online',
        icon: Globe
      }
    ];
  }, [analyticsData, analyticsLoading]);

  // Show loading state
  if (loading || analyticsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 text-black p-8 sm:p-12 lg:p-16">
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (analyticsError) {
    return (
      <div className="min-h-screen bg-gray-50 text-black p-8 sm:p-12 lg:p-16">
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="w-6 h-6 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-2">Failed to load dashboard data</p>
            <p className="text-xs text-gray-500">{analyticsError}</p>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  if (userRole === 'admin' || isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 text-black p-8 sm:p-12 lg:p-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-medium">Admin Dashboard</h1>
            </div>
            <p className="text-gray-600">Manage receivables, pools, and yield distribution</p>
          </div>

          {/* Admin Hub CTA */}
          <Card variant="default" className="mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Admin Hub</h3>
                  <p className="text-gray-600">
                    Complete guide to manage receivables and create pools
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/dashboard/admin-hub')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Open Admin Hub
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card variant="default">
              <CardHeader>
                <CardTitle>Receivables Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Review and approve trade receivables for pool creation
                </p>
                <Button 
                  className="w-full"
                  onClick={() => navigate('/dashboard/admin/receivables')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Review Receivables
                </Button>
              </CardContent>
            </Card>

            <Card variant="default">
              <CardHeader>
                <CardTitle>Create Pool</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Create investment pool from verified receivable
                </p>
                <Button 
                  className="w-full"
                  onClick={() => navigate('/dashboard/admin/create-pool')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Pool
                </Button>
              </CardContent>
            </Card>

            <Card variant="default">
              <CardHeader>
                <CardTitle>Pool Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Manage pools, record payments, distribute yield
                </p>
                <Button 
                  className="w-full"
                  onClick={() => navigate('/dashboard/admin/amc-pools')}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Manage Pools
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Platform Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} variant="default">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-5 h-5 text-gray-600" />
                      <p className="text-xs text-gray-600 uppercase tracking-wide">{stat.title}</p>
                    </div>
                    <p className="text-2xl font-medium text-black">{stat.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Exporter Dashboard
  if (userRole === 'exporter') {
    return (
      <div className="min-h-screen bg-gray-50 text-black p-8 sm:p-12 lg:p-16">
        <div className="max-w-6xl mx-auto">
          {isAuthenticated && isKYCRequired && showKYCBanner && user?.kycStatus && (
            <KYCBanner
              kycStatus={user.kycStatus}
              onStartKYC={handleStartKYC}
              onDismiss={handleDismissBanner}
            />
          )}

          <div className="mb-12">
            <h1 className="text-3xl font-medium mb-2">Welcome back, {user?.name || 'Exporter'}</h1>
            <p className="text-gray-600">Manage your trade receivables and get funded</p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-4 mb-12">
            <Button 
              onClick={() => navigate('/dashboard/create-receivable')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Receivable
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/dashboard/receivables')}
            >
              <Eye className="w-4 h-4 mr-2" />
              View All Receivables
            </Button>
          </div>

          {/* My Receivables */}
          <Card variant="default" className="mb-12">
            <CardHeader>
              <CardTitle>My Receivables</CardTitle>
            </CardHeader>
            <CardContent>
              {receivables.length > 0 ? (
                <div className="space-y-4">
                  {receivables.map((rec: any) => (
                    <div key={rec.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium">Receivable #{rec.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-600">
                          ${(Number(rec.amount) / 1000000).toFixed(2)} USD
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs ${
                          rec.status === 2 ? 'bg-green-100 text-green-800' :
                          rec.status === 1 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {rec.status === 2 ? 'Approved' : rec.status === 1 ? 'Pending' : 'Draft'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">You haven't created any receivables yet</p>
                  <Button onClick={() => navigate('/dashboard/create-receivable')}>
                    Create Your First Receivable
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} variant="default">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-5 h-5 text-gray-600" />
                      <p className="text-xs text-gray-600 uppercase tracking-wide">{stat.title}</p>
                    </div>
                    <p className="text-2xl font-medium text-black">{stat.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Investor/Staker Dashboard
  if (userRole === 'investor' || userRole === 'staker') {
    return (
      <div className="min-h-screen bg-gray-50 text-black p-8 sm:p-12 lg:p-16">
        <div className="max-w-6xl mx-auto">
          {isAuthenticated && isKYCRequired && showKYCBanner && user?.kycStatus && (
            <KYCBanner
              kycStatus={user.kycStatus}
              onStartKYC={handleStartKYC}
              onDismiss={handleDismissBanner}
            />
          )}

          <div className="mb-12">
            <h1 className="text-3xl font-medium mb-2">Welcome back, {user?.name || 'Investor'}</h1>
            <p className="text-gray-600">Track your investments and earnings</p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4 mb-12">
            <Button 
              onClick={() => navigate('/dashboard/investor-hub')}
              className="bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Investor Hub
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/dashboard/marketplace')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Browse Pools
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/dashboard/staking')}
            >
              <Coins className="w-4 h-4 mr-2" />
              Stake USDC
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/get-test-tokens')}
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Get Test USDC
            </Button>
          </div>

          {/* My Investments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <Card variant="default">
              <CardHeader>
                <CardTitle>My Investments</CardTitle>
              </CardHeader>
              <CardContent>
                {investments.length > 0 ? (
                  <div className="space-y-4">
                    {investments.map((pool: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-medium">Pool #{index + 1}</p>
                          <p className="text-sm text-gray-600">Active Investment</p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-green-600" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">You haven't invested in any pools yet</p>
                    <Button onClick={() => navigate('/dashboard/marketplace')}>
                      Browse Pools
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card variant="default">
              <CardHeader>
                <CardTitle>My Staking</CardTitle>
              </CardHeader>
              <CardContent>
                {stakingData ? (
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Total Staked</p>
                      <p className="text-2xl font-medium">${(stakingData.totalStaked / 1000000).toFixed(2)}</p>
                      <p className="text-sm text-gray-600 mt-2">{stakingData.stakes} active stake{stakingData.stakes !== 1 ? 's' : ''}</p>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => navigate('/dashboard/staking')}
                    >
                      <Coins className="w-4 h-4 mr-2" />
                      Stake More
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Start earning yield by staking USDC</p>
                    <Button onClick={() => navigate('/dashboard/staking')}>
                      Start Staking
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} variant="default">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-5 h-5 text-gray-600" />
                      <p className="text-xs text-gray-600 uppercase tracking-wide">{stat.title}</p>
                    </div>
                    <p className="text-2xl font-medium text-black">{stat.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // New User Dashboard (no role determined)
  return (
    <div className="min-h-screen bg-gray-50 text-black p-8 sm:p-12 lg:p-16">
      <div className="max-w-6xl mx-auto">
        {isAuthenticated && isKYCRequired && showKYCBanner && user?.kycStatus && (
          <KYCBanner
            kycStatus={user.kycStatus}
            onStartKYC={handleStartKYC}
            onDismiss={handleDismissBanner}
          />
        )}

        <div className="mb-12">
          <h1 className="text-3xl font-medium mb-2">Welcome to Novax Yield</h1>
          <p className="text-gray-600">Get started by choosing your role</p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card variant="default">
            <CardHeader>
              <CardTitle>I'm an Exporter</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Tokenize your trade receivables and get paid immediately. Access liquidity from international investors.
              </p>
              <Button 
                className="w-full"
                onClick={() => navigate('/dashboard/create-receivable')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Create Receivable
              </Button>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardHeader>
              <CardTitle>I'm an Investor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Invest in trade receivables and earn 8-12% APY. Stake USDC or invest directly in pools.
              </p>
              <div className="space-y-2">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => navigate('/dashboard/investor-hub')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Start Investing Guide
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate('/dashboard/marketplace')}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Browse Pools
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate('/dashboard/staking')}
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    Stake USDC
                  </Button>
                </div>
                <Button 
                  variant="outline"
                  className="w-full border-green-600 text-green-600 hover:bg-green-50"
                  onClick={() => navigate('/get-test-tokens')}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Get Test USDC
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} variant="default">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <p className="text-xs text-gray-600 uppercase tracking-wide">{stat.title}</p>
                  </div>
                  <p className="text-2xl font-medium text-black">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
